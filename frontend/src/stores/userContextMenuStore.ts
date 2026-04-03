import { create } from 'zustand';
import type { User } from '../types';

interface UserContextMenuState {
  user: User | null;
  x: number;
  y: number;
  open: (user: User, x: number, y: number) => void;
  close: () => void;
}

export const useUserContextMenuStore = create<UserContextMenuState>((set) => ({
  user: null,
  x: 0,
  y: 0,
  open: (user, x, y) => set({ user, x, y }),
  close: () => set({ user: null }),
}));
