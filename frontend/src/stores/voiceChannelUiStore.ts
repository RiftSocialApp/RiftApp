import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VoiceChannelUiState {
  isOpen: boolean;
  activeChannelId: string | null;
  hideNamesByStream: Record<string, boolean>;
  setActiveChannel: (streamId: string | null) => void;
  openVoiceView: (streamId: string) => void;
  closeVoiceView: () => void;
  resetVoiceView: () => void;
  toggleHideNames: (streamId: string) => void;
}

type PersistedVoiceChannelUiState = Pick<VoiceChannelUiState, 'hideNamesByStream'>;

export const useVoiceChannelUiStore = create<VoiceChannelUiState>()(
  persist<VoiceChannelUiState, [], [], PersistedVoiceChannelUiState>(
    (set, get) => ({
      isOpen: false,
      activeChannelId: null,
      hideNamesByStream: {},
      setActiveChannel: (streamId) => {
        if (!streamId) {
          set({ activeChannelId: null, isOpen: false });
          return;
        }
        set({ activeChannelId: streamId });
      },
      openVoiceView: (streamId) => {
        set({ activeChannelId: streamId, isOpen: true });
      },
      closeVoiceView: () => {
        set({ isOpen: false });
      },
      resetVoiceView: () => {
        set({ isOpen: false, activeChannelId: null });
      },
      toggleHideNames: (streamId) => {
        const cur = get().hideNamesByStream[streamId] ?? false;
        set({
          hideNamesByStream: { ...get().hideNamesByStream, [streamId]: !cur },
        });
      },
    }),
    {
      name: 'riftapp-vc-ui',
      partialize: (state) => ({ hideNamesByStream: state.hideNamesByStream }),
    },
  ),
);
