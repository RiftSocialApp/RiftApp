import { create } from 'zustand';
import type { Friendship, Block, User } from '../types';
import { api } from '../api/client';
import { normalizeBlock, normalizeFriendship, normalizeUser } from '../utils/entityAssets';

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
  patchUser: (user: User) => void;
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
      const friends = (await api.listFriends()).map(normalizeFriendship);
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
    set({
      pendingIncoming: incoming.map(normalizeFriendship),
      pendingOutgoing: outgoing.map(normalizeFriendship),
      pendingCount: incoming.length,
    });
  },

  loadBlocked: async () => {
    const blocked = (await api.listBlocked()).map(normalizeBlock);
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
    void get().loadPending();
  },

  handleFriendAccept: (_userId) => {
    Promise.all([get().loadFriends(), get().loadPending()]);
  },

  handleFriendRemove: (userId) => {
    set((s) => ({
      friends: s.friends.filter((f) => f.user?.id !== userId),
    }));
  },

  patchUser: (user) => {
    const nextUser = normalizeUser(user);
    const patchFriendship = (friendship: Friendship) =>
      friendship.user?.id === nextUser.id
        ? { ...friendship, user: { ...friendship.user, ...nextUser } }
        : friendship;
    const patchBlock = (block: Block) =>
      block.user?.id === nextUser.id
        ? { ...block, user: { ...block.user, ...nextUser } }
        : block;
    set((s) => ({
      friends: s.friends.map(patchFriendship),
      pendingIncoming: s.pendingIncoming.map(patchFriendship),
      pendingOutgoing: s.pendingOutgoing.map(patchFriendship),
      blocked: s.blocked.map(patchBlock),
    }));
  },
}));
