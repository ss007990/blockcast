import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  criteriaFrom,
  newCustomActivity,
  type ActivityId,
  type Criteria,
  type CritTune,
  type CustomActivity,
  type Season,
  type Tolerance,
  type Weights,
} from '../core/activities';
import type { ClockFormat, UnitSystem } from '../core/units';
import { detectLang, type Lang } from '../i18n';
import { importV1, KEYS } from '../services/storage';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type BlockLen = 2 | 3 | 4 | 6;
export type PlanDays = 7 | 14;

export interface Place {
  name: string;
  lat: number;
  lon: number;
  /** Set when the place came from device geolocation: coordinates are
   * re-checked on launch/foreground so the forecast follows the user. */
  follow?: boolean;
}

/** Numeric criteria thresholds tunable per activity. */
export type CritNumKey = 'tMin' | 'tMax' | 'windLo' | 'windHi' | 'swellLo' | 'swellHi';

export interface SettingsState {
  activity: ActivityId;
  /** True once the user has explicitly picked an activity; until then the
   * picker invites them to choose instead of presenting the tennis default. */
  actChosen: boolean;
  /** Last activities used, most recent first (includes the current one). */
  recentActivities: ActivityId[];
  blockLen: BlockLen;
  /** Days shown on the week board: one week, or two for extended planning. */
  planDays: PlanDays;
  tolerance: Tolerance;
  hFrom: number;
  hTo: number;
  tune: Partial<Record<ActivityId, CritTune>>;
  /** User-created activities, shown in the rail alongside the presets. */
  customActivities: CustomActivity[];
  lang: Lang;
  units: UnitSystem;
  clock: ClockFormat;
  theme: ThemeChoice;
  loc: Place;
  /** True once geolocation/v1 import decided the starting location. */
  locChosen: boolean;
  /** The last place pinned by hand. Offered in the switcher so device
   * location and the spot you were looking at stay one tap apart. */
  lastPinned: Place | null;
  /** Favourite places for one-tap switching (max 3). */
  savedPlaces: Place[];
  /** Capability token for the subscribable calendar feed; null = feed off. */
  calFeedToken: string | null;

  setActivity: (a: ActivityId) => void;
  /** Dismiss an activity from the quick-access chips. */
  removeRecentActivity: (a: ActivityId) => void;
  setBlockLen: (b: BlockLen) => void;
  setPlanDays: (d: PlanDays) => void;
  setTolerance: (t: Tolerance) => void;
  setHours: (from: number, to: number) => void;
  setWeight: (act: ActivityId, k: keyof Weights, v: number) => void;
  setCritNum: (act: ActivityId, which: CritNumKey, v: number) => void;
  resetTune: (act: ActivityId) => void;
  /** Create a custom activity, select it, and return its id. */
  addActivity: (input: { name: string; emoji: string; cat: string; season: Season }) => ActivityId;
  removeActivity: (id: ActivityId) => void;
  setLang: (l: Lang) => void;
  setUnits: (u: UnitSystem) => void;
  setClock: (c: ClockFormat) => void;
  setTheme: (t: ThemeChoice) => void;
  setLoc: (p: Place, chosen?: boolean) => void;
  /** Save a place as a favourite, or un-save it if already saved. */
  toggleSavedPlace: (p: Place) => void;
  setCalFeedToken: (t: string | null) => void;
}

const samePlace = (a: Place, b: Place) => a.lat === b.lat && a.lon === b.lon;

export const MAX_SAVED_PLACES = 3;
export const MAX_RECENT_ACTIVITIES = 3;

const v1 = importV1(localStorage);

const defaults = {
  activity: v1.activity ?? ('tennis' as ActivityId),
  actChosen: v1.activity != null,
  recentActivities: [v1.activity ?? ('tennis' as ActivityId)],
  blockLen: v1.blockLen ?? (4 as BlockLen),
  planDays: 7 as PlanDays,
  tolerance: v1.tolerance ?? ('balanced' as Tolerance),
  hFrom: v1.hFrom ?? 6,
  hTo: v1.hTo ?? 20,
  tune: v1.tune ?? {},
  customActivities: [] as CustomActivity[],
  lang: v1.lang ?? detectLang(navigator.language),
  units: 'metric' as UnitSystem,
  clock: '24h' as ClockFormat,
  theme: 'system' as ThemeChoice,
  loc: v1.loc ?? { name: 'Québec', lat: 46.8131, lon: -71.2075 },
  locChosen: v1.loc != null,
  lastPinned: null as Place | null,
  savedPlaces: [] as Place[],
  calFeedToken: null as string | null,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      setActivity: (activity) =>
        set((s) => ({
          activity,
          actChosen: true,
          recentActivities: [
            activity,
            ...s.recentActivities.filter((a) => a !== activity),
          ].slice(0, MAX_RECENT_ACTIVITIES),
        })),
      removeRecentActivity: (id) =>
        set((s) => ({ recentActivities: s.recentActivities.filter((a) => a !== id) })),
      setBlockLen: (blockLen) => set({ blockLen }),
      setPlanDays: (planDays) => set({ planDays }),
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
      setCritNum: (act, which, v) =>
        set((s) => ({ tune: { ...s.tune, [act]: { ...s.tune[act], [which]: v } } })),
      resetTune: (act) =>
        set((s) => {
          const tune = { ...s.tune };
          delete tune[act];
          return { tune };
        }),
      addActivity: (input) => {
        const a = newCustomActivity(input);
        set((s) => ({ customActivities: [...s.customActivities, a], activity: a.id }));
        return a.id;
      },
      removeActivity: (id) =>
        set((s) => {
          const tune = { ...s.tune };
          delete tune[id];
          return {
            customActivities: s.customActivities.filter((c) => c.id !== id),
            tune,
            activity: s.activity === id ? 'tennis' : s.activity,
            recentActivities: s.recentActivities.filter((a) => a !== id),
          };
        }),
      setLang: (lang) => set({ lang }),
      setUnits: (units) => set({ units }),
      setClock: (clock) => set({ clock }),
      setTheme: (theme) => set({ theme }),
      setLoc: (loc, chosen = true) =>
        set((s) => ({
          loc,
          locChosen: chosen,
          lastPinned: loc.follow ? s.lastPinned : loc,
        })),
      // saved spots are always pinned places: keeping `follow` would turn
      // "the city I saved while travelling" back into device tracking
      toggleSavedPlace: (p) =>
        set((s) =>
          s.savedPlaces.some((x) => samePlace(x, p))
            ? { savedPlaces: s.savedPlaces.filter((x) => !samePlace(x, p)) }
            : {
                savedPlaces: [...s.savedPlaces, { name: p.name, lat: p.lat, lon: p.lon }].slice(
                  -MAX_SAVED_PLACES,
                ),
              },
        ),
      setCalFeedToken: (calFeedToken) => set({ calFeedToken }),
    }),
    {
      name: KEYS.settings,
      version: 3,
      // v2 stores predate actChosen: anyone with a persisted store has been
      // using the app, so treat their current activity as a deliberate choice
      migrate: (persisted, version) => {
        const s = persisted as Partial<SettingsState>;
        if (version < 3) s.actChosen = true;
        return s;
      },
    },
  ),
);

/** Criteria for any activity: preset or custom, merged with saved tuning. */
export const critFor = (s: SettingsState, id: ActivityId): Criteria =>
  criteriaFrom(id, s.tune[id], s.customActivities);
