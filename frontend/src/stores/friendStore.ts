import { create } from 'zustand';
import type { Friendship, Block } from '../types';
import { api } from '../api/client';

interface FriendState {
  friends: Friendship[];
  pendingIncoming: Friendship[];
  pendingOutgoing: Friendship[];
  blocked: Block[];
  pendingCount: number;
  loading: boolean;

  loadFriends: () => Promise<void>;
  loadPending: () => Promise<void>;
  loadBlocked: () => Promise<void>;
  loadPendingCount: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (userId: string) => Promise<void>;
  rejectRequest: (userId: string) => Promise<void>;
  cancelRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  handleFriendRequest: (userId: string) => void;
  handleFriendAccept: (userId: string) => void;
  handleFriendRemove: (userId: string) => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  pendingIncoming: [],
  pendingOutgoing: [],
  blocked: [],
  pendingCount: 0,
  loading: false,

  loadFriends: async () => {
    set({ loading: true });
    try {
      const friends = await api.listFriends();
      set({ friends });
    } finally {
      set({ loading: false });
    }
  },

  loadPending: async () => {
    const [incoming, outgoing] = await Promise.all([
      api.pendingIncoming(),
      api.pendingOutgoing(),
    ]);
    set({ pendingIncoming: incoming, pendingOutgoing: outgoing, pendingCount: incoming.length });
  },

  loadBlocked: async () => {
    const blocked = await api.listBlocked();
    set({ blocked });
  },

  loadPendingCount: async () => {
    try {
      const { count } = await api.pendingCount();
      set({ pendingCount: count });
    } catch { /* ignore */ }
  },

  sendRequest: async (userId) => {
    await api.sendFriendRequest(userId);
    await get().loadPending();
  },

  acceptRequest: async (userId) => {
    await api.acceptFriendRequest(userId);
    await Promise.all([get().loadFriends(), get().loadPending()]);
  },

  rejectRequest: async (userId) => {
    await api.rejectFriendRequest(userId);
    set((s) => ({
      pendingIncoming: s.pendingIncoming.filter((f) => f.user_id !== userId),
      pendingCount: Math.max(0, s.pendingCount - 1),
    }));
  },

  cancelRequest: async (userId) => {
    await api.cancelFriendRequest(userId);
    set((s) => ({
      pendingOutgoing: s.pendingOutgoing.filter((f) => f.friend_id !== userId),
    }));
  },

  removeFriend: async (userId) => {
    await api.removeFriend(userId);
    set((s) => ({
      friends: s.friends.filter((f) => f.user?.id !== userId),
    }));
  },

  blockUser: async (userId) => {
    await api.blockUser(userId);
    set((s) => ({
      friends: s.friends.filter((f) => f.user?.id !== userId),
      pendingIncoming: s.pendingIncoming.filter((f) => f.user_id !== userId),
      pendingOutgoing: s.pendingOutgoing.filter((f) => f.friend_id !== userId),
    }));
    await get().loadBlocked();
  },

  unblockUser: async (userId) => {
    await api.unblockUser(userId);
    set((s) => ({
      blocked: s.blocked.filter((b) => b.blocked_id !== userId),
    }));
  },

  handleFriendRequest: (_userId) => {
    get().loadPending();
  },

  handleFriendAccept: (_userId) => {
    Promise.all([get().loadFriends(), get().loadPending()]);
  },

  handleFriendRemove: (userId) => {
    set((s) => ({
      friends: s.friends.filter((f) => f.user?.id !== userId),
    }));
  },
}));
