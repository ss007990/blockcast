import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AlertItem } from '../core/alerts';
import { KEYS } from '../services/storage';

export interface AlertsState {
  items: AlertItem[];
  /** Ids the user has seen (alert panel opened). */
  readIds: string[];
  push: (items: AlertItem[]) => void;
  markAllRead: () => void;
  clearExpired: (todayISO: string) => void;
}

const MAX_ITEMS = 50;

export const useAlerts = create<AlertsState>()(
  persist(
    (set) => ({
      items: [],
      readIds: [],
      push: (items) =>
        set((st) => (items.length ? { items: [...items, ...st.items].slice(0, MAX_ITEMS) } : st)),
      markAllRead: () => set((st) => ({ readIds: st.items.map((i) => i.id) })),
      clearExpired: (todayISO) =>
        set((st) => {
          const items = st.items.filter((i) => i.day >= todayISO);
          return items.length === st.items.length ? st : { items };
        }),
    }),
    { name: KEYS.alerts, version: 2 },
  ),
);

export const unreadCount = (s: AlertsState): number =>
  s.items.filter((i) => !s.readIds.includes(i.id)).length;
