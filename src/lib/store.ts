import { create } from 'zustand';
import type { User, Slot } from './mockData';
import { initialSlots } from './mockData';

interface ToastState {
  message: string;
  action?: { label: string; onClick: () => void };
  variant: 'error' | 'success';
}

interface AppState {
  // M2.1 — user slice
  currentUser: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;

  // M2.2 — slots slice
  slots: Record<string, Slot>;
  joinSlot: (slotId: string) => Promise<void>;

  // M2.2 — toast slice
  toast: ToastState | null;
  showToast: (toast: ToastState) => void;
  dismissToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── user ──────────────────────────────────────────────────────────────────
  currentUser: null,
  setUser: (user) => set({ currentUser: user }),
  clearUser: () => set({ currentUser: null }),

  // ── slots ─────────────────────────────────────────────────────────────────
  slots: initialSlots,

  joinSlot: async (slotId) => {
    const state = get();
    const user = state.currentUser;
    const slot = state.slots[slotId];
    if (!user || !slot) return;
    if (slot.opted_in_user_ids.includes(user.id)) return;

    // Snapshot for rollback
    const previousOptedIn = slot.opted_in_user_ids;

    // Optimistic update — visible within one frame
    set((s) => ({
      slots: {
        ...s.slots,
        [slotId]: {
          ...slot,
          opted_in_user_ids: [...slot.opted_in_user_ids, user.id],
        },
      },
    }));

    // Dev-only failure toggle: ?simulateFailure=1 in the URL
    const shouldFail =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('simulateFailure') === '1';

    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) reject(new Error('simulated'));
          else resolve();
        }, 600);
      });
    } catch {
      // Rollback to snapshot
      set((s) => ({
        slots: {
          ...s.slots,
          [slotId]: {
            ...s.slots[slotId],
            opted_in_user_ids: previousOptedIn,
          },
        },
      }));
      get().showToast({
        message: "Couldn't save that",
        action: { label: 'Retry', onClick: () => get().joinSlot(slotId) },
        variant: 'error',
      });
    }
  },

  // ── toast ─────────────────────────────────────────────────────────────────
  toast: null,
  showToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
}));
