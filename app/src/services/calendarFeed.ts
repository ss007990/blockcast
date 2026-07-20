// Subscribable calendar feed: the planner syncs to the worker, calendar apps
// poll the .ics URL. The token is an unguessable capability generated here —
// whoever holds the URL can read the feed, nobody can write without the app.

import type { ActivityId, CustomActivity } from '../core/activities';
import type { PlannedSession } from '../core/alerts';
import type { Lang } from '../i18n';

const apiBase = (): string | undefined => import.meta.env.VITE_PUSH_API as string | undefined;

export const feedAvailable = (): boolean => !!apiBase();

export function newFeedToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const feedUrl = (token: string): string => `${apiBase()}/api/calendar/${token}.ics`;
export const webcalUrl = (token: string): string => feedUrl(token).replace(/^https:\/\//, 'webcal://');

/** "Add by URL" pages of the big calendars, pre-filled with the feed. */
export const googleSubscribeUrl = (token: string): string =>
  `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(token))}`;
export const outlookSubscribeUrl = (token: string, host: 'live' | 'office'): string =>
  `https://outlook.${host}.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl(token))}&name=BlockCast`;

export async function syncFeed(
  token: string,
  sessions: PlannedSession[],
  customs: readonly CustomActivity[],
  lang: Lang,
): Promise<boolean> {
  const API = apiBase();
  if (!API) return false;
  const customName = (id: ActivityId) => customs.find((c) => c.id === id)?.name;
  try {
    const res = await fetch(`${API}/api/calendar/${token}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessions: sessions.map((s) => ({ ...s, name: customName(s.activityId) })),
        lang,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteFeed(token: string): Promise<void> {
  const API = apiBase();
  if (!API) return;
  try {
    await fetch(`${API}/api/calendar/${token}`, { method: 'DELETE' });
  } catch {
    // feed will self-expire via KV TTL anyway
  }
}
