// Forecast-change detection for planned sessions. Each session remembers the
// risk band it had when planned (or last acknowledged); when a fresh forecast
// moves a session to a different band, that's an alert. The push worker runs
// this same logic server-side.

import type { ActivityId } from './activities';
import type { Band } from './scoring';

/** Calendar purposes a session can be tagged with; labels live in i18n. */
export const PURPOSES = ['training', 'match', 'social', 'family', 'work', 'travel'] as const;
export type Purpose = (typeof PURPOSES)[number];

export interface PlannedSession {
  id: number;
  activityId: ActivityId;
  /** ISO day "2026-07-20". */
  day: string;
  h: number;
  len: number;
  locName: string;
  lat: number;
  lon: number;
  /** Score/band at planning time (or when the user last saw an alert). */
  baseScore: number | null;
  baseBand: Band | null;
  purpose?: Purpose;
  /** Freeform note, e.g. "Playing tennis with John from 9–10". */
  note?: string;
}

export interface SessionCheck {
  score: number;
  band: Band;
}

export type AlertKind = 'improved' | 'worsened';

export interface AlertItem {
  id: string;
  sessionId: number;
  activityId: ActivityId;
  day: string;
  h: number;
  kind: AlertKind;
  fromBand: Band;
  toBand: Band;
  score: number;
  /** Epoch ms when the alert was generated. */
  at: number;
}

const BAND_RANK: Record<Band, number> = { g: 0, y: 1, r: 2 };

/**
 * Compare each session's remembered band against the fresh forecast.
 * Returns one alert per session whose band moved; the caller is responsible
 * for updating baseBand afterwards so an alert fires once per change.
 */
export function detectChanges(
  sessions: PlannedSession[],
  checkOf: (s: PlannedSession) => SessionCheck | null,
  now: number,
): AlertItem[] {
  const out: AlertItem[] = [];
  for (const s of sessions) {
    if (s.baseBand == null) continue;
    const cur = checkOf(s);
    if (!cur || cur.band === s.baseBand) continue;
    out.push({
      id: `${s.id}-${s.baseBand}-${cur.band}-${now}`,
      sessionId: s.id,
      activityId: s.activityId,
      day: s.day,
      h: s.h,
      kind: BAND_RANK[cur.band] < BAND_RANK[s.baseBand] ? 'improved' : 'worsened',
      fromBand: s.baseBand,
      toBand: cur.band,
      score: cur.score,
      at: now,
    });
  }
  return out;
}

/** Chronological sort/prune key ("2026-07-20T06" — hour zero-padded). */
export const planKey = (p: { day: string; h: number }): string =>
  p.day + 'T' + String(p.h).padStart(2, '0');
