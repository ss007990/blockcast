// Shareable forecast links. A link names a sport, optionally a place, and
// optionally one block of the week: blockcast.ca/?a=golf&at=46.8131,-71.2075
// &n=Québec&d=2026-10-25&h=9. Opening it shows the same forecast the sender
// was looking at, so a plan made in BlockCast can travel by text message to
// the rest of the foursome. Pure: no DOM, no stores.

import { ACTIVITY_IDS, type PresetActivityId } from './activities';

export const SHARE_ORIGIN = 'https://blockcast.ca';

export interface ShareTarget {
  activity?: PresetActivityId;
  place?: { name: string; lat: number; lon: number };
  /** ISO date and start hour of one block; both or neither. */
  day?: string;
  h?: number;
}

const NAME_MAX = 60;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const isPreset = (a: string | null): a is PresetActivityId =>
  a != null && (ACTIVITY_IDS as readonly string[]).includes(a);

/** Coordinates to 4 decimals (about 10 m): enough for a court, short in a text. */
const coord = (v: number) => String(Math.round(v * 1e4) / 1e4);

/** Custom activities live on one device only, so links carry presets alone. */
export function buildShareUrl(t: ShareTarget, origin = SHARE_ORIGIN): string {
  const q = new URLSearchParams();
  if (t.activity) q.set('a', t.activity);
  if (t.place) {
    q.set('at', `${coord(t.place.lat)},${coord(t.place.lon)}`);
    q.set('n', t.place.name.slice(0, NAME_MAX));
  }
  if (t.day && t.h != null) {
    q.set('d', t.day);
    q.set('h', String(t.h));
  }
  const s = q.toString();
  return s ? `${origin}/?${s}` : `${origin}/`;
}

/** Read a share link's query string. Anything malformed is dropped on its
 * own, so a mangled place still opens the right sport. Returns null when the
 * URL carries nothing BlockCast understands (e.g. only ?ref=reddit). */
export function parseShareParams(search: string): ShareTarget | null {
  const q = new URLSearchParams(search);
  const out: ShareTarget = {};

  const a = q.get('a');
  if (isPreset(a)) out.activity = a;

  const at = q.get('at')?.split(',');
  if (at?.length === 2) {
    const lat = Number(at[0]);
    const lon = Number(at[1]);
    const ok =
      at[0] !== '' &&
      at[1] !== '' &&
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180;
    if (ok) {
      const name = (q.get('n') ?? '').trim().slice(0, NAME_MAX);
      out.place = { name: name || `${coord(lat)}, ${coord(lon)}`, lat, lon };
    }
  }

  const d = q.get('d');
  const h = Number(q.get('h'));
  if (d && DAY_RE.test(d) && q.get('h') !== null && Number.isInteger(h) && h >= 0 && h < 24) {
    out.day = d;
    out.h = h;
  }

  return out.activity || out.place || out.day ? out : null;
}

/** The query keys a share link owns; everything else (ref, utm_*) is left in
 * the address bar for analytics. */
export const SHARE_KEYS = ['a', 'at', 'n', 'd', 'h'] as const;
