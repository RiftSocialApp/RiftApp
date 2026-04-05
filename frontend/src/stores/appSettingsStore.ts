import { create } from 'zustand';

const APP_SETTINGS_STORAGE_KEY = 'riftapp.app-settings.v1';

interface PersistedAppSettings {
  developerMode?: boolean;
}

export type SettingsOverlayTab = 'profile' | 'account' | 'voice' | 'advanced';

interface AppSettingsState {
  developerMode: boolean;
  settingsOpen: boolean;
  settingsTab: SettingsOverlayTab;
  setDeveloperMode: (developerMode: boolean) => void;
  toggleDeveloperMode: () => void;
  openSettings: (tab?: SettingsOverlayTab) => void;
  closeSettings: () => void;
  setSettingsTab: (tab: SettingsOverlayTab) => void;
}

function loadPersistedSettings(): PersistedAppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedAppSettings;
    return typeof parsed.developerMode === 'boolean'
      ? { developerMode: parsed.developerMode }
      : {};
  } catch {
    return {};
  }
}

function persistSettings(settings: PersistedAppSettings) {
  try {
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore storage failures */
  }
}

const persisted = loadPersistedSettings();

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  developerMode: persisted.developerMode ?? false,
  settingsOpen: false,
  settingsTab: 'profile',

  setDeveloperMode: (developerMode) => {
    persistSettings({ developerMode });
    set({ developerMode });
  },

  toggleDeveloperMode: () => {
    set((state) => {
      const developerMode = !state.developerMode;
      persistSettings({ developerMode });
      return { developerMode };
    });
  },

  openSettings: (tab = 'profile') => {
    set({ settingsOpen: true, settingsTab: tab });
  },

  closeSettings: () => {
    set({ settingsOpen: false });
  },

  setSettingsTab: (tab) => {
    set({ settingsTab: tab });
  },
}));