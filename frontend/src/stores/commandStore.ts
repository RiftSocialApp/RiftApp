import { create } from 'zustand';
import type { SlashCommand } from '../types';
import { api } from '../api/client';

interface CommandState {
  hubCommands: Record<string, SlashCommand[]>;
  loading: Record<string, boolean>;
  loadCommandsForHub: (hubId: string) => Promise<SlashCommand[]>;
  invalidateHub: (hubId: string) => void;
  clear: () => void;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  hubCommands: {},
  loading: {},

  loadCommandsForHub: async (hubId: string) => {
    if (hubId in get().hubCommands) return get().hubCommands[hubId];
    if (get().loading[hubId]) return [];

    set((s) => ({ loading: { ...s.loading, [hubId]: true } }));
    try {
      const commands = await api.getHubCommands(hubId);
      set((s) => ({
        hubCommands: { ...s.hubCommands, [hubId]: commands },
        loading: { ...s.loading, [hubId]: false },
      }));
      return commands;
    } catch {
      set((s) => ({
        hubCommands: { ...s.hubCommands, [hubId]: [] },
        loading: { ...s.loading, [hubId]: false },
      }));
      return [];
    }
  },

  invalidateHub: (hubId: string) => {
    set((s) => {
      const { [hubId]: _, ...rest } = s.hubCommands;
      return { hubCommands: rest };
    });
  },

  clear: () => set({ hubCommands: {}, loading: {} }),
}));
