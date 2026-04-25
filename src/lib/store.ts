import { create } from 'zustand';
import type { User } from './mockData';

interface AppState {
  currentUser: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setUser: (user) => set({ currentUser: user }),
  clearUser: () => set({ currentUser: null }),
}));
