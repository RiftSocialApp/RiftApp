import { create } from 'zustand';
import type { Stream, Category } from '../types';
import { api } from '../api/client';

interface StreamState {
  streams: Stream[];
  categories: Category[];
  activeStreamId: string | null;
  streamUnreads: Record<string, number>;
  lastReadMessageIds: Record<string, string>;

  loadStreams: (hubId: string) => Promise<void>;
  loadCategories: (hubId: string) => Promise<void>;
  setActiveStream: (streamId: string) => Promise<void>;
  createStream: (hubId: string, name: string, type?: number, categoryId?: string) => Promise<Stream>;
  createCategory: (hubId: string, name: string) => Promise<Category>;
  deleteCategory: (hubId: string, categoryId: string) => Promise<void>;
  loadReadStates: (hubId: string) => Promise<void>;
  ackStream: (streamId: string) => Promise<void>;
  incrementUnread: (streamId: string) => void;
  clearStreams: () => void;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  streams: [],
  categories: [],
  activeStreamId: null,
  streamUnreads: {},
  lastReadMessageIds: {},

  loadStreams: async (hubId) => {
    const [streams, categories] = await Promise.all([
      api.getStreams(hubId),
      api.getCategories(hubId),
    ]);
    const { useHubStore } = await import('./hubStore');
    if (useHubStore.getState().activeHubId !== hubId) return;
    set({ streams, categories });

    const textStream = streams.find((s) => s.type === 0);
    if (textStream) {
      await get().setActiveStream(textStream.id);
    }
  },

  loadCategories: async (hubId) => {
    const categories = await api.getCategories(hubId);
    set({ categories });
  },

  setActiveStream: async (streamId) => {
    const { useMessageStore } = await import('./messageStore');

    set({ activeStreamId: streamId });
    useMessageStore.getState().clearMessages();
    await useMessageStore.getState().loadMessages(streamId);
    await get().ackStream(streamId);
  },

  createStream: async (hubId, name, type = 0, categoryId?) => {
    const stream = await api.createStream(hubId, name, type, categoryId);
    set((s) => ({ streams: [...s.streams, stream] }));
    return stream;
  },

  createCategory: async (hubId, name) => {
    const cat = await api.createCategory(hubId, name);
    set((s) => ({ categories: [...s.categories, cat] }));
    return cat;
  },

  deleteCategory: async (hubId, categoryId) => {
    await api.deleteCategory(hubId, categoryId);
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== categoryId),
      streams: s.streams.map((st) => st.category_id === categoryId ? { ...st, category_id: null } : st),
    }));
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
    set({ streams: [], categories: [], activeStreamId: null, streamUnreads: {}, lastReadMessageIds: {} });
  },
}));
