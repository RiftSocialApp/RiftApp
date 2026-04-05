import { create } from 'zustand';
import type { Hub } from '../types';
import { api } from '../api/client';

/** Session-scoped hub list for instant paint after refresh (revalidated against API). */
export const HUBS_SESSION_STORAGE_KEY = 'riftapp.session.hubs.v1';

/** Ignore stale `loadHubs` responses when multiple loads overlap (e.g. Strict Mode, refocus). */
let loadHubsRequestId = 0;

interface HubState {
  hubs: Hub[];
  activeHubId: string | null;

  loadHubs: () => Promise<void>;
  setActiveHub: (hubId: string) => Promise<void>;
  createHub: (name: string) => Promise<Hub>;
  updateHub: (hubId: string, data: { name?: string; icon_url?: string }) => Promise<Hub>;
  clearActive: () => void;
}

export const useHubStore = create<HubState>((set) => ({
  hubs: [],
  activeHubId: null,

  loadHubs: async () => {
    const myId = ++loadHubsRequestId;
    try {
      const raw = sessionStorage.getItem(HUBS_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { hubs?: unknown };
        if (Array.isArray(parsed.hubs) && parsed.hubs.length > 0) {
          set({ hubs: parsed.hubs as Hub[] });
        }
      }
    } catch {
      /* ignore corrupt session cache */
    }

    try {
      const hubs = await api.getHubs();
      if (myId !== loadHubsRequestId) return;
      if (!Array.isArray(hubs)) return;
      set({ hubs });
      try {
        sessionStorage.setItem(HUBS_SESSION_STORAGE_KEY, JSON.stringify({ hubs }));
      } catch {
        /* quota / private mode */
      }
    } catch {
      if (myId !== loadHubsRequestId) return;
      // Never wipe the server list on transient errors / rate limits.
    }
  },

  setActiveHub: async (hubId) => {
    const { useStreamStore } = await import('./streamStore');
    const { useDMStore } = await import('./dmStore');
    const { usePresenceStore } = await import('./presenceStore');

    set({ activeHubId: hubId });
    useDMStore.getState().clearActive();

    // Show cached channels for this hub immediately (or clear if unknown) — avoids empty UI and cuts API spam.
    useStreamStore.getState().applyHubLayoutOrClear(hubId);

    try {
      await Promise.all([
        useStreamStore.getState().loadStreams(hubId),
        usePresenceStore.getState().loadPresenceForHub(hubId),
        useStreamStore.getState().loadReadStates(hubId),
      ]);
    } catch {
      // Streams may still be visible from cache; avoid throwing to click handlers.
    }
  },

  createHub: async (name) => {
    const hub = await api.createHub(name);
    set((s) => {
      const hubs = [...s.hubs, hub];
      try {
        sessionStorage.setItem(HUBS_SESSION_STORAGE_KEY, JSON.stringify({ hubs }));
      } catch { /* ignore */ }
      return { hubs };
    });
    return hub;
  },

  updateHub: async (hubId, data) => {
    const hub = await api.updateHub(hubId, data);
    set((s) => {
      const hubs = s.hubs.map((h) => (h.id === hubId ? hub : h));
      try {
        sessionStorage.setItem(HUBS_SESSION_STORAGE_KEY, JSON.stringify({ hubs }));
      } catch { /* ignore */ }
      return { hubs };
    });
    return hub;
  },

  clearActive: () => {
    set({ activeHubId: null });
  },
}));
