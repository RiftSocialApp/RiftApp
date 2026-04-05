import { create } from 'zustand';
import type { HubEmoji } from '../types';
import { api } from '../api/client';

interface EmojiState {
  /** Per-hub custom emoji cache. */
  hubEmojis: Record<string, HubEmoji[]>;
  /** Loading state per hub. */
  loading: Record<string, boolean>;
  /** Fetch (or return cached) emojis for a hub. */
  loadHubEmojis: (hubId: string) => Promise<HubEmoji[]>;
  /** Clear all caches (logout). */
  clear: () => void;
}

export const useEmojiStore = create<EmojiState>((set, get) => ({
  hubEmojis: {},
  loading: {},

  loadHubEmojis: async (hubId: string) => {
    const cached = get().hubEmojis[hubId];
    if (cached) return cached;
    if (get().loading[hubId]) return [];

    set((s) => ({ loading: { ...s.loading, [hubId]: true } }));
    try {
      const emojis = await api.getHubEmojis(hubId);
      set((s) => ({
        hubEmojis: { ...s.hubEmojis, [hubId]: emojis },
        loading: { ...s.loading, [hubId]: false },
      }));
      return emojis;
    } catch {
      set((s) => ({ loading: { ...s.loading, [hubId]: false } }));
      return [];
    }
  },

  clear: () => set({ hubEmojis: {}, loading: {} }),
}));
