// Request-body validation for /api/subscribe. Deliberately strict: this is a
// public endpoint, so anything malformed is rejected before it reaches KV.

import { ACTIVITIES, type ActivityId } from '../../app/src/core/activities';
import type { StoredSub, StoredSession, StoredCriteria } from './types';

const MAX_SESSIONS = 30;

const isActivity = (v: unknown): v is ActivityId =>
  typeof v === 'string' && (v in ACTIVITIES || /^c-[a-z0-9]{1,24}$/.test(v));
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseSubscribeBody(raw: unknown): StoredSub | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Record<string, unknown>;

  const sub = b.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (
    !sub ||
    typeof sub.endpoint !== 'string' ||
    !sub.endpoint.startsWith('https://') ||
    typeof sub.keys?.p256dh !== 'string' ||
    typeof sub.keys?.auth !== 'string'
  )
    return null;

  if (!Array.isArray(b.sessions) || b.sessions.length === 0) return null;
  const sessions: StoredSession[] = [];
  for (const s of (b.sessions as Record<string, unknown>[]).slice(0, MAX_SESSIONS)) {
    if (
      !isActivity(s.activityId) ||
      typeof s.day !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(s.day) ||
      !Number.isInteger(s.h) ||
      (s.h as number) < 0 ||
      (s.h as number) > 23 ||
      !Number.isInteger(s.len) ||
      (s.len as number) < 1 ||
      (s.len as number) > 12 ||
      !num(s.lat) ||
      !num(s.lon)
    )
      continue;
    sessions.push({
      id: num(s.id) ? (s.id as number) : Date.now(),
      activityId: s.activityId,
      ...(typeof s.name === 'string' && s.name ? { name: s.name.slice(0, 60) } : {}),
      day: s.day,
      h: s.h as number,
      len: s.len as number,
      lat: s.lat,
      lon: s.lon,
      locName: typeof s.locName === 'string' ? s.locName.slice(0, 120) : '',
      baseBand: s.baseBand === 'g' || s.baseBand === 'y' || s.baseBand === 'r' ? s.baseBand : null,
      baseScore: num(s.baseScore) ? s.baseScore : null,
    });
  }
  if (!sessions.length) return null;

  const criteria: StoredSub['criteria'] = {};
  if (typeof b.criteria === 'object' && b.criteria !== null) {
    for (const [k, v] of Object.entries(b.criteria as Record<string, unknown>)) {
      if (!isActivity(k) || typeof v !== 'object' || v === null) continue;
      const c = v as Record<string, unknown>;
      if (typeof c.w !== 'object' || c.w === null || !num(c.tMin) || !num(c.tMax)) continue;
      criteria[k] = {
        w: c.w,
        tMin: c.tMin,
        tMax: c.tMax,
        ...(num(c.snowBase) ? { snowBase: c.snowBase } : {}),
      } as StoredCriteria;
    }
  }

  return {
    subscription: {
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    },
    sessions,
    criteria,
    tolMult: num(b.tolMult) && (b.tolMult as number) > 0 && (b.tolMult as number) < 3 ? (b.tolMult as number) : 1,
    lang: b.lang === 'fr' ? 'fr' : 'en',
    units: b.units === 'imperial' ? 'imperial' : 'metric',
    createdAt: Date.now(),
  };
}

export async function endpointKey(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
