import { create } from 'zustand';
import type { Stream } from '../types';
import { api } from '../api/client';

interface StreamState {
  streams: Stream[];
  activeStreamId: string | null;
  streamUnreads: Record<string, number>;
  lastReadMessageIds: Record<string, string>;

  loadStreams: (hubId: string) => Promise<void>;
  setActiveStream: (streamId: string) => Promise<void>;
  createStream: (hubId: string, name: string, type?: number) => Promise<Stream>;
  loadReadStates: (hubId: string) => Promise<void>;
  ackStream: (streamId: string) => Promise<void>;
  incrementUnread: (streamId: string) => void;
  clearStreams: () => void;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  streams: [],
  activeStreamId: null,
  streamUnreads: {},
  lastReadMessageIds: {},

  loadStreams: async (hubId) => {
    const streams = await api.getStreams(hubId);
    const { useHubStore } = await import('./hubStore');
    if (useHubStore.getState().activeHubId !== hubId) return;
    set({ streams });

    const textStream = streams.find((s) => s.type === 0);
    if (textStream) {
      await get().setActiveStream(textStream.id);
    }
  },

  setActiveStream: async (streamId) => {
    const { useMessageStore } = await import('./messageStore');

    set({ activeStreamId: streamId });
    useMessageStore.getState().clearMessages();
    await useMessageStore.getState().loadMessages(streamId);
    await get().ackStream(streamId);
  },

  createStream: async (hubId, name, type = 0) => {
    const stream = await api.createStream(hubId, name, type);
    set((s) => ({ streams: [...s.streams, stream] }));
    return stream;
  },

  loadReadStates: async (hubId) => {
    try {
      const states = await api.getReadStates(hubId);
      const { useHubStore } = await import('./hubStore');
      if (useHubStore.getState().activeHubId !== hubId) return;
      const unreads: Record<string, number> = {};
      const lastRead: Record<string, string> = {};
      for (const rs of states) {
        unreads[rs.stream_id] = rs.unread_count;
        if (rs.last_read_message_id) {
          lastRead[rs.stream_id] = rs.last_read_message_id;
        }
      }
      set({ streamUnreads: unreads, lastReadMessageIds: lastRead });
    } catch {}
  },

  ackStream: async (streamId) => {
    if (get().activeStreamId !== streamId) return;
    const { useMessageStore } = await import('./messageStore');
    const msgs = useMessageStore.getState().messages;
    if (msgs.length === 0) return;
    const lastMsg = msgs[msgs.length - 1];
    try {
      await api.ackStream(streamId, lastMsg.id);
      set((s) => ({
        streamUnreads: { ...s.streamUnreads, [streamId]: 0 },
        lastReadMessageIds: { ...s.lastReadMessageIds, [streamId]: lastMsg.id },
      }));
    } catch {}
  },

  incrementUnread: (streamId) => {
    set((s) => ({
      streamUnreads: {
        ...s.streamUnreads,
        [streamId]: (s.streamUnreads[streamId] || 0) + 1,
      },
    }));
  },

  clearStreams: () => {
    set({ streams: [], activeStreamId: null, streamUnreads: {}, lastReadMessageIds: {} });
  },
}));
