import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  criteriaFrom,
  type ActivityId,
  type Criteria,
  type Tolerance,
  type Weights,
} from '../core/activities';
import type { ClockFormat, UnitSystem } from '../core/units';
import { detectLang, type Lang } from '../i18n';
import { importV1, KEYS } from '../services/storage';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type BlockLen = 2 | 3 | 4 | 6;

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

type Tune = { w?: Partial<Weights>; tMin?: number; tMax?: number };

export interface SettingsState {
  activity: ActivityId;
  blockLen: BlockLen;
  tolerance: Tolerance;
  hFrom: number;
  hTo: number;
  tune: Partial<Record<ActivityId, Tune>>;
  lang: Lang;
  units: UnitSystem;
  clock: ClockFormat;
  theme: ThemeChoice;
  loc: Place;
  /** True once geolocation/v1 import decided the starting location. */
  locChosen: boolean;

  setActivity: (a: ActivityId) => void;
  setBlockLen: (b: BlockLen) => void;
  setTolerance: (t: Tolerance) => void;
  setHours: (from: number, to: number) => void;
  setWeight: (act: ActivityId, k: keyof Weights, v: number) => void;
  setTempBand: (act: ActivityId, which: 'tMin' | 'tMax', v: number) => void;
  resetTune: (act: ActivityId) => void;
  setLang: (l: Lang) => void;
  setUnits: (u: UnitSystem) => void;
  setClock: (c: ClockFormat) => void;
  setTheme: (t: ThemeChoice) => void;
  setLoc: (p: Place, chosen?: boolean) => void;
}

const v1 = importV1(localStorage);

const defaults = {
  activity: v1.activity ?? ('tennis' as ActivityId),
  blockLen: v1.blockLen ?? (4 as BlockLen),
  tolerance: v1.tolerance ?? ('balanced' as Tolerance),
  hFrom: v1.hFrom ?? 6,
  hTo: v1.hTo ?? 20,
  tune: v1.tune ?? {},
  lang: v1.lang ?? detectLang(navigator.language),
  units: 'metric' as UnitSystem,
  clock: '24h' as ClockFormat,
  theme: 'system' as ThemeChoice,
  loc: v1.loc ?? { name: 'Québec', lat: 46.8131, lon: -71.2075 },
  locChosen: v1.loc != null,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      setActivity: (activity) => set({ activity }),
      setBlockLen: (blockLen) => set({ blockLen }),
      setTolerance: (tolerance) => set({ tolerance }),
      setHours: (hFrom, hTo) =>
        set(() =>
          hTo > hFrom ? { hFrom, hTo } : { hFrom, hTo: Math.min(24, hFrom + 2) },
        ),
      setWeight: (act, k, v) =>
        set((s) => ({
          tune: {
            ...s.tune,
            [act]: { ...s.tune[act], w: { ...s.tune[act]?.w, [k]: v } },
          },
        })),
      setTempBand: (act, which, v) =>
        set((s) => ({ tune: { ...s.tune, [act]: { ...s.tune[act], [which]: v } } })),
      resetTune: (act) =>
        set((s) => {
          const tune = { ...s.tune };
          delete tune[act];
          return { tune };
        }),
      setLang: (lang) => set({ lang }),
      setUnits: (units) => set({ units }),
      setClock: (clock) => set({ clock }),
      setTheme: (theme) => set({ theme }),
      setLoc: (loc, chosen = true) => set({ loc, locChosen: chosen }),
    }),
    { name: KEYS.settings, version: 2 },
  ),
);

/** Criteria for any activity: preset merged with this user's saved tuning. */
export const critFor = (s: SettingsState, id: ActivityId): Criteria =>
  criteriaFrom(id, s.tune[id]);
