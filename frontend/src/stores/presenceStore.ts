import { create } from 'zustand';
import type { User } from '../types';
import { api } from '../api/client';
import { normalizeUser, normalizeUsers } from '../utils/entityAssets';
import {
  clearPersistedSelfPresence,
  getPersistedSelfPresence,
  persistSelfPresence,
  resolveInitialSelfPresenceStatus,
} from './selfPresencePersistence';

function resolveSelfPresenceStatus(
  selfUserId: string | null,
  presence: Record<string, number>,
  userId: string,
  incomingStatus: number,
) {
  const persistedStatus = getPersistedSelfPresence(userId);
  if (persistedStatus !== null) {
    return persistedStatus;
  }

  if (selfUserId === userId) {
    const currentStatus = presence[userId];
    if (typeof currentStatus === 'number') {
      return currentStatus;
    }
    return resolveInitialSelfPresenceStatus(userId, incomingStatus);
  }

  return incomingStatus;
}

interface PresenceState {
  selfUserId: string | null;
  presence: Record<string, number>;
  hubMembers: Record<string, User>;
  typers: Record<string, Set<string>>;

  setPresence: (userId: string, status: number) => void;
  setSelfPresence: (userId: string, status: number) => void;
  hydrateSelfPresence: (userId: string, fallbackStatus?: number) => number;
  clearSelfPresence: (userId?: string) => void;
  setBulkPresence: (entries: Record<string, number>) => void;
  loadPresenceForHub: (hubId: string) => Promise<void>;
  mergeUser: (user: User) => void;
  clearSessionCaches: () => void;

  addTyper: (streamId: string, userId: string) => void;
  removeTyper: (streamId: string, userId: string) => void;
  clearTypers: (streamId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  selfUserId: null,
  presence: {},
  hubMembers: {},
  typers: {},

  setPresence: (userId, status) => {
    set((s) => {
      if (s.presence[userId] === status) return s;
      return { presence: { ...s.presence, [userId]: status } };
    });
  },

  setSelfPresence: (userId, status) => {
    persistSelfPresence(userId, status);
    set((s) => ({
      selfUserId: userId,
      presence: s.presence[userId] === status ? s.presence : { ...s.presence, [userId]: status },
      hubMembers: s.hubMembers[userId]
        ? { ...s.hubMembers, [userId]: { ...s.hubMembers[userId], status } }
        : s.hubMembers,
    }));
  },

  hydrateSelfPresence: (userId, fallbackStatus) => {
    const resolvedStatus = resolveInitialSelfPresenceStatus(userId, fallbackStatus);
    set((s) => ({
      selfUserId: userId,
      presence: s.presence[userId] === resolvedStatus ? s.presence : { ...s.presence, [userId]: resolvedStatus },
      hubMembers: s.hubMembers[userId]
        ? { ...s.hubMembers, [userId]: { ...s.hubMembers[userId], status: resolvedStatus } }
        : s.hubMembers,
    }));
    return resolvedStatus;
  },

  clearSelfPresence: (userId) => {
    clearPersistedSelfPresence(userId);
    set((s) => {
      const targetUserId = userId ?? s.selfUserId;
      if (!targetUserId) {
        return { selfUserId: null };
      }
      const nextPresence = { ...s.presence };
      delete nextPresence[targetUserId];
      return {
        selfUserId: s.selfUserId === targetUserId ? null : s.selfUserId,
        presence: nextPresence,
      };
    });
  },

  setBulkPresence: (entries) => {
    set((s) => ({
      presence: Object.entries(entries).reduce<Record<string, number>>((nextPresence, [userId, status]) => {
        nextPresence[userId] = resolveSelfPresenceStatus(s.selfUserId, s.presence, userId, status);
        return nextPresence;
      }, { ...s.presence }),
    }));
  },

  loadPresenceForHub: async (hubId) => {
    try {
      const members = normalizeUsers(await api.getHubMembers(hubId));
      const entries: Record<string, number> = {};
      const memberMap: Record<string, User> = {};
      for (const m of members) {
        const status = resolveSelfPresenceStatus(usePresenceStore.getState().selfUserId, usePresenceStore.getState().presence, m.id, m.status);
        entries[m.id] = status;
        memberMap[m.id] = status === m.status ? m : { ...m, status };
      }
      set((s) => ({
        presence: { ...s.presence, ...entries },
        hubMembers: memberMap,
      }));
    } catch {}
  },

  mergeUser: (user) => {
    const nextUser = normalizeUser(user);
    set((s) => ({
      presence: s.presence[nextUser.id] === resolveSelfPresenceStatus(s.selfUserId, s.presence, nextUser.id, nextUser.status)
        ? s.presence
        : { ...s.presence, [nextUser.id]: resolveSelfPresenceStatus(s.selfUserId, s.presence, nextUser.id, nextUser.status) },
      hubMembers: {
        ...s.hubMembers,
        [nextUser.id]: s.hubMembers[nextUser.id]
          ? {
              ...s.hubMembers[nextUser.id],
              ...nextUser,
              status: resolveSelfPresenceStatus(s.selfUserId, s.presence, nextUser.id, nextUser.status),
            }
          : {
              ...nextUser,
              status: resolveSelfPresenceStatus(s.selfUserId, s.presence, nextUser.id, nextUser.status),
            },
      },
    }));
  },

  clearSessionCaches: () => {
    set({
      selfUserId: null,
      presence: {},
      hubMembers: {},
      typers: {},
    });
  },

  addTyper: (streamId, userId) => {
    set((s) => {
      const current = new Set(s.typers[streamId]);
      current.add(userId);
      return { typers: { ...s.typers, [streamId]: current } };
    });
  },

  removeTyper: (streamId, userId) => {
    set((s) => {
      const current = new Set(s.typers[streamId]);
      current.delete(userId);
      return { typers: { ...s.typers, [streamId]: current } };
    });
  },

  clearTypers: (streamId) => {
    set((s) => {
      const next = { ...s.typers };
      delete next[streamId];
      return { typers: next };
    });
  },
}));
