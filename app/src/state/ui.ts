import { create } from 'zustand';

export type Tab = 'today' | 'week' | 'planner' | 'settings';

export interface SelectedBlock {
  day: string;
  h: number;
}

export interface UiState {
  tab: Tab;
  selected: SelectedBlock | null;
  detailOpen: boolean;
  locOpen: boolean;
  alertsOpen: boolean;
  tuneOpen: boolean;

  setTab: (t: Tab) => void;
  select: (b: SelectedBlock | null) => void;
  closeDetail: () => void;
  setLocOpen: (v: boolean) => void;
  setAlertsOpen: (v: boolean) => void;
  setTuneOpen: (v: boolean) => void;
}

const TABS: Tab[] = ['today', 'week', 'planner', 'settings'];
const initialTab = (): Tab => {
  const h = window.location.hash.replace('#', '') as Tab;
  return TABS.includes(h) ? h : 'today';
};

export const useUi = create<UiState>()((set) => ({
  tab: initialTab(),
  selected: null,
  detailOpen: false,
  locOpen: false,
  alertsOpen: false,
  tuneOpen: false,

  setTab: (tab) => {
    history.replaceState(null, '', `#${tab}`);
    set({ tab });
  },
  select: (selected) => set({ selected, detailOpen: selected != null }),
  closeDetail: () => set({ detailOpen: false }),
  setLocOpen: (locOpen) => set({ locOpen }),
  setAlertsOpen: (alertsOpen) => set({ alertsOpen }),
  setTuneOpen: (tuneOpen) => set({ tuneOpen }),
}));
