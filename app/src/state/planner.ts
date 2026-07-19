import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { planKey, type PlannedSession } from '../core/alerts';
import type { BlockResult, ForecastData } from '../core/forecast';
import { getBlock } from '../core/forecast';
import type { Criteria } from '../core/activities';
import { importV1, KEYS } from '../services/storage';

export interface PlannerState {
  sessions: PlannedSession[];
  add: (s: PlannedSession) => void;
  remove: (id: number) => void;
  /** Drop sessions more than a day in the past (location wall clock). */
  prune: (cutKey: string) => void;
  /** Set the baseline band for sessions that don't have one yet. */
  baseline: (updates: { id: number; score: number; band: PlannedSession['baseBand'] }[]) => void;
}

const v1Sessions = importV1(localStorage).sessions ?? [];

export const usePlanner = create<PlannerState>()(
  persist(
    (set) => ({
      sessions: v1Sessions,
      add: (s) =>
        set((st) => ({
          sessions: [...st.sessions, s].sort((a, b) => (planKey(a) < planKey(b) ? -1 : 1)),
        })),
      remove: (id) => set((st) => ({ sessions: st.sessions.filter((s) => s.id !== id) })),
      prune: (cutKey) =>
        set((st) => {
          const sessions = st.sessions.filter((s) => planKey(s) > cutKey);
          return sessions.length === st.sessions.length ? st : { sessions };
        }),
      baseline: (updates) =>
        set((st) => ({
          sessions: st.sessions.map((s) => {
            const u = updates.find((x) => x.id === s.id);
            return u ? { ...s, baseScore: u.score, baseBand: u.band } : s;
          }),
        })),
    }),
    { name: KEYS.planner, version: 2 },
  ),
);

/** The loaded forecast only applies to a session planned at (nearly) the same
    coordinates; imported v1 items without lat/lon are assumed local. */
export const sameLoc = (s: PlannedSession, loc: { lat: number; lon: number }): boolean =>
  Number.isNaN(s.lat) || (Math.abs(s.lat - loc.lat) < 0.05 && Math.abs(s.lon - loc.lon) < 0.05);

/** Live re-check of one session against the loaded forecast. */
export function checkSession(
  s: PlannedSession,
  data: ForecastData | null,
  dataFor: { lat: number; lon: number } | null,
  crit: Criteria,
  tolMult: number,
): BlockResult | null {
  if (!data || !dataFor || !sameLoc(s, dataFor)) return null;
  return getBlock(data, s.day, s.h, s.len, crit, tolMult);
}
