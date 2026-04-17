import { create } from 'zustand';
import type { User } from '@/types/user';

interface SessionStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
