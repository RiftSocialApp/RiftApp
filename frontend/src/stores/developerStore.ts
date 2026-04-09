import { create } from 'zustand';
import { api } from '../api/client';
import type { Application } from '../types';

interface DeveloperState {
  applications: Application[];
  currentApp: Application | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  fetchMe: () => Promise<void>;
  fetchApplications: () => Promise<void>;
  fetchApplication: (id: string) => Promise<void>;
  createApplication: (name: string) => Promise<{ app: Application; botToken: string }>;
  updateApplication: (id: string, data: Partial<Application>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  setCurrentApp: (app: Application | null) => void;
  resetBotToken: (appId: string) => Promise<string>;
}

export const useDeveloperStore = create<DeveloperState>((set, get) => ({
  applications: [],
  currentApp: null,
  isSuperAdmin: false,
  isLoading: false,

  fetchMe: async () => {
    try {
      const res = await api.getDeveloperMe();
      set({ isSuperAdmin: res.is_super_admin });
    } catch {
      // ignore
    }
  },

  fetchApplications: async () => {
    set({ isLoading: true });
    try {
      const apps = await api.listApplications();
      set({ applications: apps || [] });
    } catch {
      set({ applications: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchApplication: async (id: string) => {
    try {
      const app = await api.getApplication(id);
      set({ currentApp: app });
      const apps = get().applications.map(a => a.id === id ? app : a);
      set({ applications: apps });
    } catch {
      // ignore
    }
  },

  createApplication: async (name: string) => {
    const res = await api.createApplication(name);
    set({ applications: [res.application, ...get().applications] });
    return { app: res.application, botToken: res.bot_token };
  },

  updateApplication: async (id: string, data: Partial<Application>) => {
    const app = await api.updateApplication(id, data);
    set({
      currentApp: app,
      applications: get().applications.map(a => a.id === id ? app : a),
    });
  },

  deleteApplication: async (id: string) => {
    await api.deleteApplication(id);
    set({
      applications: get().applications.filter(a => a.id !== id),
      currentApp: get().currentApp?.id === id ? null : get().currentApp,
    });
  },

  setCurrentApp: (app) => set({ currentApp: app }),

  resetBotToken: async (appId: string) => {
    const res = await api.resetBotToken(appId);
    return res.bot_token;
  },
}));
