// Subscribable calendar feed: the app pushes planned sessions here, and any
// calendar client (Apple, Google, Outlook) polls GET /api/calendar/<token>.ics.
// The token is an unguessable capability — same model as Google's "secret
// address" — so possession of the URL is the only auth.

import { ACTIVITIES, type ActivityId } from '../../app/src/core/activities';
import { buildCalendar, type IcsEvent } from '../../app/src/core/ics';
import { en } from '../../app/src/i18n/en';
import { fr } from '../../app/src/i18n/fr';
import type { FeedSession, StoredFeed } from './types';

export const FEED_KEY_PREFIX = 'cal:';
export const feedKey = (token: string): string => FEED_KEY_PREFIX + token;

/** 32 lowercase hex chars — what the app generates from 16 random bytes. */
export const isFeedToken = (v: string): boolean => /^[a-f0-9]{32}$/.test(v);

const MAX_SESSIONS = 120;

const isActivity = (v: unknown): v is ActivityId =>
  typeof v === 'string' && (v in ACTIVITIES || /^c-[a-z0-9]{1,24}$/.test(v));
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Strict parse of the feed-sync body; an empty session list is valid (it
 * clears the calendar without killing the subscription). */
export function parseFeedBody(raw: unknown): StoredFeed | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Record<string, unknown>;
  if (!Array.isArray(b.sessions)) return null;

  const sessions: FeedSession[] = [];
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
      (s.len as number) > 12
    )
      continue;
    sessions.push({
      id: num(s.id) ? (s.id as number) : Date.now(),
      activityId: s.activityId,
      ...(typeof s.name === 'string' && s.name ? { name: s.name.slice(0, 60) } : {}),
      day: s.day,
      h: s.h as number,
      len: s.len as number,
      lat: num(s.lat) ? s.lat : NaN,
      lon: num(s.lon) ? s.lon : NaN,
      locName: typeof s.locName === 'string' ? s.locName.slice(0, 120) : '',
      baseBand: null,
      baseScore: null,
      ...(typeof s.purpose === 'string' && s.purpose ? { purpose: s.purpose.slice(0, 20) } : {}),
      ...(typeof s.note === 'string' && s.note ? { note: s.note.slice(0, 500) } : {}),
    });
  }

  return {
    sessions,
    lang: b.lang === 'fr' ? 'fr' : 'en',
    updatedAt: Date.now(),
  };
}

export function feedToIcs(feed: StoredFeed): string {
  const dict = feed.lang === 'fr' ? fr : en;
  const purposes = dict.planner.purposes as Record<string, string>;
  const events: IcsEvent[] = feed.sessions.map((s: FeedSession) => {
    const name =
      (dict.activities as Record<string, string>)[s.activityId] ?? s.name ?? s.activityId;
    const purposeLabel = s.purpose ? purposes[s.purpose] : undefined;
    return {
      uid: `${s.id}-${s.day.replace(/-/g, '')}${String(s.h).padStart(2, '0')}@blockcast`,
      day: s.day,
      h: s.h,
      len: s.len,
      summary: purposeLabel ? `${name} — ${purposeLabel}` : `${name} — BlockCast`,
      location: s.locName,
      description: s.note ? `${s.note}\nPlanned with BlockCast` : 'Planned with BlockCast',
    };
  });
  return buildCalendar(events, new Date().toISOString(), 'BlockCast');
}
