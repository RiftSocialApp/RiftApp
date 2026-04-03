import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useStreamStore } from '../stores/streamStore';
import { useMessageStore } from '../stores/messageStore';
import { usePresenceStore } from '../stores/presenceStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useDMStore } from '../stores/dmStore';
import type { Message, Notification, Conversation, WSEvent } from '../types';

const HEARTBEAT_INTERVAL = 30000;
const TYPING_EXPIRE_MS = 3000;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

// Pre-instantiated once so each notification event avoids object allocation
const notifAudio = (() => {
  try {
    const a = new Audio('data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfgLAAB4eHh4eHh4eHh4eHh3d3d3d3d3d3d2dnZ2dnZ2dXV1dXV1dXR0dHR0dHRzc3Nzc3NzcnJycnJycXFxcXFxcHBwcHBwb29vb29vbm5ubm5ubW1tbW1tbGxsbGxsa2tra2trampqampqaWlpaWlpaGhoaGhoZ2dnZ2dnZmZmZmZmZWVlZWVlZGRkZGRkY2NjY2NjYmJiYmJiYWFhYWFhYGBgYGBgX19fX19fXl5eXl5eXV1dXV1dXFxcXFxcW1tbW1tbWlpaWlpaWVlZWVlZWFhYWFhYV1dXV1dXVlZWVlZWVVVVVVVVVFRUVFRUU1NTUFRUVVVYVV1eX2FjZGhpbnFzdnh+gIaIjZKYnaCnrrK2u8LGzNLW3ODq');
    a.volume = 0.3;
    return a;
  } catch {
    return null;
  }
})();

let globalSend: (op: string, d?: unknown) => void = () => {};

export function useWsSend() {
  return globalSend;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number>();
  const typingTimersRef = useRef<Map<string, number>>(new Map());
  const token = useAuthStore((s) => s.token);
  const activeStreamId = useStreamStore((s) => s.activeStreamId);
  const addMessage = useMessageStore((s) => s.addMessage);
  const updateMessage = useMessageStore((s) => s.updateMessage);
  const removeMessage = useMessageStore((s) => s.removeMessage);
  const addTyper = usePresenceStore((s) => s.addTyper);
  const removeTyper = usePresenceStore((s) => s.removeTyper);
  const setPresence = usePresenceStore((s) => s.setPresence);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addDMMessage = useDMStore((s) => s.addDMMessage);
  const addConversation = useDMStore((s) => s.addConversation);
  const ackDM = useDMStore((s) => s.ackDM);
  const prevStreamRef = useRef<string | null>(null);

  const send = useCallback((op: string, d?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ op, d }));
    }
  }, []);

  // Keep global ref in sync
  useEffect(() => {
    globalSend = send;
    return () => { globalSend = () => {}; };
  }, [send]);

  useEffect(() => {
    if (!token) return;

    let reconnectAttempts = 0;
    let reconnectTimer: number | undefined;
    let disposed = false;

    function connect() {
      if (disposed) return;

      const wsBase = import.meta.env.VITE_WS_URL;
      const wsUrl = wsBase
        ? `${wsBase}/ws?token=${token}`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts = 0;
        heartbeatRef.current = window.setInterval(() => {
          send('heartbeat');
        }, HEARTBEAT_INTERVAL);

        // Re-subscribe to active stream on (re)connect
        const currentStream = useStreamStore.getState().activeStreamId;
        if (currentStream) {
          send('subscribe', { stream_id: currentStream });
          prevStreamRef.current = currentStream;
        }
      };

      ws.onmessage = (event) => {
        const evt: WSEvent = JSON.parse(event.data);
        switch (evt.op) {
          case 'message_create':
            addMessage(evt.d as Message);
            break;
          case 'message_update':
            updateMessage(evt.d as Message);
            break;
          case 'message_delete': {
            const { id } = evt.d as { id: string };
            removeMessage(id);
            break;
          }
          case 'typing_start': {
            const { user_id, stream_id } = evt.d as { user_id: string; stream_id: string };
            addTyper(stream_id, user_id);

            // Clear any existing timer for this user+stream, set auto-expiry
            const key = `${stream_id}:${user_id}`;
            const prev = typingTimersRef.current.get(key);
            if (prev) clearTimeout(prev);
            typingTimersRef.current.set(
              key,
              window.setTimeout(() => {
                removeTyper(stream_id, user_id);
                typingTimersRef.current.delete(key);
              }, TYPING_EXPIRE_MS),
            );
            break;
          }
          case 'typing_stop': {
            const { user_id, stream_id } = evt.d as { user_id: string; stream_id: string };
            removeTyper(stream_id, user_id);
            const key = `${stream_id}:${user_id}`;
            const timer = typingTimersRef.current.get(key);
            if (timer) {
              clearTimeout(timer);
              typingTimersRef.current.delete(key);
            }
            break;
          }
          case 'presence_update': {
            const { user_id, status } = evt.d as { user_id: string; status: number };
            setPresence(user_id, status);
            break;
          }
          case 'notification_create': {
            const notif = evt.d as Notification;
            addNotification(notif);
            // Play notification sound
            notifAudio?.play().catch(() => {});
            break;
          }
          case 'dm_message_create': {
            const dmMsg = evt.d as Message;
            addDMMessage(dmMsg);
            // Auto-ack if this conversation is currently active (user can see the message)
            const activeConvId = useDMStore.getState().activeConversationId;
            if (dmMsg.conversation_id && dmMsg.conversation_id === activeConvId) {
              ackDM(dmMsg.conversation_id);
            }
            break;
          }
          case 'dm_conversation_create': {
            addConversation(evt.d as Conversation);
            break;
          }
          case 'reaction_add': {
            const { message_id, user_id, emoji } = evt.d as { message_id: string; user_id: string; emoji: string };
            const msgState = useMessageStore.getState();
            const dmState = useDMStore.getState();
            if (msgState.messages.some((m) => m.id === message_id)) {
              msgState.applyReactionAdd(message_id, user_id, emoji);
            } else if (dmState.dmMessages.some((m) => m.id === message_id)) {
              dmState.applyReactionAdd(message_id, user_id, emoji);
            }
            break;
          }
          case 'reaction_remove': {
            const { message_id, user_id, emoji } = evt.d as { message_id: string; user_id: string; emoji: string };
            const msgState = useMessageStore.getState();
            const dmState = useDMStore.getState();
            if (msgState.messages.some((m) => m.id === message_id)) {
              msgState.applyReactionRemove(message_id, user_id, emoji);
            } else if (dmState.dmMessages.some((m) => m.id === message_id)) {
              dmState.applyReactionRemove(message_id, user_id, emoji);
            }
            break;
          }
        }
      };

      ws.onclose = () => {
        clearInterval(heartbeatRef.current);
        // Clear all typing timers
        typingTimersRef.current.forEach((t) => clearTimeout(t));
        typingTimersRef.current.clear();

        // Reconnect with exponential backoff
        if (!disposed && useAuthStore.getState().token) {
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
            RECONNECT_MAX_DELAY,
          );
          reconnectAttempts++;
          reconnectTimer = window.setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      clearInterval(heartbeatRef.current);
      typingTimersRef.current.forEach((t) => clearTimeout(t));
      typingTimersRef.current.clear();
      wsRef.current?.close();
    };
  }, [token, send, addMessage, updateMessage, removeMessage, addTyper, removeTyper, setPresence, addNotification, addDMMessage, addConversation, ackDM]);

  // Subscribe/unsubscribe to active stream
  useEffect(() => {
    if (prevStreamRef.current) {
      send('unsubscribe', { stream_id: prevStreamRef.current });
    }
    if (activeStreamId) {
      send('subscribe', { stream_id: activeStreamId });
    }
    prevStreamRef.current = activeStreamId;
  }, [activeStreamId, send]);

  return { send };
}
