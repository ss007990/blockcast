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

export interface StoredSub {
  subscription: Subscription;
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
}
