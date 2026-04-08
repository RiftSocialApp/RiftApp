import { create } from 'zustand';
import { reloadOnceForFrontendUpdate } from '../utils/frontendUpdate';

interface FrontendUpdateState {
  currentVersion: string;
  currentBuildId: string;
  currentSignature: string | null;
  latestSignature: string | null;
  updateReady: boolean;
  setCurrentSignature: (signature: string | null) => void;
  markUpdateReady: (signature: string) => void;
  applyUpdate: () => void;
}

export const useFrontendUpdateStore = create<FrontendUpdateState>((set, get) => ({
  currentVersion: __RIFT_FRONTEND_VERSION__,
  currentBuildId: __RIFT_FRONTEND_BUILD_ID__,
  currentSignature: null,
  latestSignature: null,
  updateReady: false,

  setCurrentSignature: (signature) => {
    set({ currentSignature: signature });
  },

  markUpdateReady: (signature) => {
    set((state) => {
      if (state.currentSignature && state.currentSignature === signature) {
        return state;
      }

      if (state.updateReady && state.latestSignature === signature) {
        return state;
      }

      return {
        updateReady: true,
        latestSignature: signature,
      };
    });
  },

  applyUpdate: () => {
    if (!get().updateReady) {
      return;
    }

    reloadOnceForFrontendUpdate();
  },
}));
