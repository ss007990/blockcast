// Versioned persistence keys + one-way import of the v1 single-file app's
// localStorage, so existing users keep their tuning, location and sessions.

import type { ActivityId, Tolerance, Weights } from '../core/activities';
import { ACTIVITIES, TOL_MULT } from '../core/activities';
import type { PlannedSession } from '../core/alerts';

export const KEYS = {
  settings: 'blockcast.v2.settings',
  planner: 'blockcast.v2.planner',
  alerts: 'blockcast.v2.alerts',
  introSeen: 'blockcast.introSeen', // shared with v1 on purpose
} as const;

interface V1Settings {
  activity?: string;
  lang?: string;
  blockLen?: number;
  tolerance?: string;
  hFrom?: number;
  hTo?: number;
  tune?: Record<string, { w?: Partial<Weights>; tMin?: number; tMax?: number }>;
  loc?: { name?: string; lat?: number; lon?: number };
}

interface V1PlanItem {
  id?: number;
  activity?: string;
  day?: string;
  h?: number;
  len?: number;
  loc?: string;
  lat?: number;
  lon?: number;
}

export interface V1Import {
  activity?: ActivityId;
  lang?: 'en' | 'fr';
  blockLen?: 2 | 3 | 4 | 6;
  tolerance?: Tolerance;
  hFrom?: number;
  hTo?: number;
  tune?: Partial<Record<ActivityId, { w?: Partial<Weights>; tMin?: number; tMax?: number }>>;
  loc?: { name: string; lat: number; lon: number };
  sessions?: PlannedSession[];
}

const isActivity = (v: unknown): v is ActivityId =>
  typeof v === 'string' && v in ACTIVITIES;

/** Read the v1 keys; returns only fields that validate. Never throws. */
export function importV1(storage: Pick<Storage, 'getItem'>): V1Import {
  const out: V1Import = {};
  try {
    const s = JSON.parse(storage.getItem('blockcast.settings') ?? 'null') as V1Settings | null;
    if (s) {
      if (isActivity(s.activity)) out.activity = s.activity;
      if (s.lang === 'fr' || s.lang === 'en') out.lang = s.lang;
      if (s.blockLen === 2 || s.blockLen === 3 || s.blockLen === 4 || s.blockLen === 6)
        out.blockLen = s.blockLen;
      if (typeof s.tolerance === 'string' && s.tolerance in TOL_MULT)
        out.tolerance = s.tolerance as Tolerance;
      if (Number.isInteger(s.hFrom) && (s.hFrom as number) >= 0 && (s.hFrom as number) <= 22)
        out.hFrom = s.hFrom;
      if (Number.isInteger(s.hTo) && (s.hTo as number) >= 2 && (s.hTo as number) <= 24)
        out.hTo = s.hTo;
      if (s.tune && typeof s.tune === 'object') {
        out.tune = {};
        for (const [k, v] of Object.entries(s.tune))
          if (isActivity(k) && v && typeof v === 'object') out.tune[k] = v;
      }
      if (
        s.loc &&
        typeof s.loc.name === 'string' &&
        Number.isFinite(s.loc.lat) &&
        Number.isFinite(s.loc.lon)
      )
        out.loc = { name: s.loc.name, lat: s.loc.lat as number, lon: s.loc.lon as number };
    }
  } catch {
    /* corrupt v1 settings — start fresh */
  }
  try {
    const plans = JSON.parse(storage.getItem('blockcast.planner') ?? 'null') as
      | V1PlanItem[]
      | null;
    if (Array.isArray(plans)) {
      const sessions: PlannedSession[] = [];
      for (const p of plans) {
        if (
          !isActivity(p.activity) ||
          typeof p.day !== 'string' ||
          !Number.isInteger(p.h) ||
          !Number.isInteger(p.len)
        )
          continue;
        sessions.push({
          id: p.id ?? Date.now() + sessions.length,
          activityId: p.activity,
          day: p.day,
          h: p.h as number,
          len: p.len as number,
          locName: p.loc ?? '',
          // v1 items may predate lat/lon; NaN marks "assume current location"
          lat: Number.isFinite(p.lat) ? (p.lat as number) : NaN,
          lon: Number.isFinite(p.lon) ? (p.lon as number) : NaN,
          baseScore: null,
          baseBand: null,
        });
      }
      if (sessions.length) out.sessions = sessions;
    }
  } catch {
    /* corrupt v1 planner — skip */
  }
  return out;
}
