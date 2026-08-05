import type { Band } from '../../app/src/core/scoring';
import type { ActivityId, Weights } from '../../app/src/core/activities';

export interface StoredSession {
  id: number;
  activityId: ActivityId;
  /** Display name for user-created activities (presets are labelled server-side). */
  name?: string;
  /** ISO day "2026-07-20". */
  day: string;
  h: number;
  len: number;
  lat: number;
  lon: number;
  locName: string;
  baseBand: Band | null;
  baseScore: number | null;
}

export interface StoredCriteria {
  w: Weights;
  tMin: number;
  tMax: number;
  /** Metres of snow cover under which risk rises (winter custom activities). */
  snowBase?: number;
}

export interface Subscription {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

/** One entry of a subscribable calendar feed: a planned session plus the
 * calendar-facing freeform note. */
export interface FeedSession extends StoredSession {
  note?: string;
}

/** A user's calendar feed, keyed in KV by `cal:<token>`. */
export interface StoredFeed {
  sessions: FeedSession[];
  lang: 'en' | 'fr';
  /** IANA zone of the planning device, e.g. "America/Toronto". Lets the feed
   * emit UTC times — Google reads floating times as UTC and shifts them. */
  tz?: string;
  updatedAt: number;
}

export interface StoredSub {
  /** Web Push subscription — present for browser subscribers. */
  subscription?: Subscription;
  /** APNs device token — present for native iOS subscribers. */
  apns?: { token: string };
  sessions: StoredSession[];
  criteria: Partial<Record<ActivityId, StoredCriteria>>;
  tolMult: number;
  lang: 'en' | 'fr';
  units: 'metric' | 'imperial';
  createdAt: number;
}

export interface Env {
  SUBS: KVNamespace;
  ALLOWED_ORIGINS: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  /** APNs (native iOS push) — all optional; native push is off until set. */
  APNS_PRIVATE_KEY?: string;
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  APNS_TOPIC?: string;
  APNS_ENV?: 'sandbox' | 'production';
  /** Windy Webcams API key — nearby cams are off until set. */
  WINDY_API_KEY?: string;
}
