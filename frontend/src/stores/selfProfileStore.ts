import { create } from 'zustand';

interface SelfProfileState {
  isOpen: boolean;
  anchorRect: DOMRect | null;
  open: (anchorRect: DOMRect) => void;
  close: () => void;
}

export const useSelfProfileStore = create<SelfProfileState>((set) => ({
  isOpen: false,
  anchorRect: null,
  open: (anchorRect) => set({ isOpen: true, anchorRect }),
  close: () => set({ isOpen: false, anchorRect: null }),
}));
