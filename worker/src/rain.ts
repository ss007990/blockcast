// Rainbow AI tile proxy. Their API wants an Azure-style subscription-key
// header, so the app never talks to them directly: it asks this route for
// the current snapshot and one PNG per tile, and the worker adds the key.
// Tiles are immutable per (snapshot, forecast) pair, so the edge cache
// makes cost scale with viewed areas, not users.
//
//   GET /api/rain/status                                     → { enabled, spent, budget }
//   GET /api/rain/snapshot/{layer}                           → { snapshot }
//   GET /api/rain/tile/{layer}/{snapshot}/{fsec}/{z}/{x}/{y}.png
//
// layer     precip | precip-global
// snapshot  epoch seconds, 10-minute aligned (from /snapshot; older
//           snapshots reach 2 h back with fsec 0)
// fsec      forecast offset in seconds, 0..14400 in steps of 600
//
// Every cache miss is a billed Rainbow call, and this endpoint is public:
// the iOS app only reaches it outside North America, but blockcast.ca is
// worldwide, so a daily budget caps the damage a single enthusiastic visitor
// (or a scraper) can do. See `chargeTile` for what the counter is and is not.

import type { Env } from './types';

const RB_HOST = 'https://api.rainbow.ai';
const UA = 'BlockCast-worker/1.0';

const LAYERS = new Set(['precip', 'precip-global']);
const TILE_CACHE_SECONDS = 6 * 3600; // a (snapshot, fsec) tile never changes
const SNAPSHOT_CACHE_SECONDS = 60;

const DEFAULT_DAILY_BUDGET = 5000; // ~12 full radar views/day at 418 tiles each
const FLUSH_EVERY = 25; // billed tiles per KV write — keeps writes off the free-tier ceiling
const COUNTER_FRESH_MS = 60_000;
const COUNTER_TTL_SECONDS = 3 * 24 * 3600;

interface Tally {
  key: string;
  /** last value read back from KV */
  stored: number;
  /** billed in this isolate since the last flush */
  pending: number;
  readAt: number;
}

// Per-isolate, deliberately. Cloudflare runs many isolates and KV is
// eventually consistent, so this undercounts across the fleet and can
// overshoot the budget by roughly (isolates x FLUSH_EVERY). It is a spend
// guard, not an accountant: the point is that a runaway costs dollars
// instead of hundreds.
let tally: Tally | null = null;

/** Billed tiles allowed per day. Anything missing, unparseable or <= 0 falls
 * back to the default rather than uncapping the endpoint. */
export const tileBudget = (env: Pick<Env, 'RAIN_TILE_BUDGET'>): number => {
  const n = Number(env.RAIN_TILE_BUDGET);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_BUDGET;
};

const dayKey = (now: number): string => `rbq:${new Date(now).toISOString().slice(0, 10)}`;

/** Today's billed-tile count, re-read from KV at most once a minute. */
async function spentToday(env: Env, now: number): Promise<Tally> {
  const key = dayKey(now);
  if (!tally || tally.key !== key) tally = { key, stored: 0, pending: 0, readAt: 0 };
  if (now - tally.readAt > COUNTER_FRESH_MS) {
    const raw = await env.SUBS.get(key);
    tally.stored = Number(raw) || 0;
    tally.readAt = now;
  }
  return tally;
}

/** Count one billed tile, flushing to KV every FLUSH_EVERY. */
async function chargeTile(env: Env, t: Tally): Promise<void> {
  t.pending += 1;
  if (t.pending < FLUSH_EVERY) return;
  const flushed = t.pending;
  t.pending = 0;
  try {
    const raw = await env.SUBS.get(t.key);
    const total = (Number(raw) || 0) + flushed;
    await env.SUBS.put(t.key, String(total), { expirationTtl: COUNTER_TTL_SECONDS });
    t.stored = total;
    t.readAt = Date.now();
  } catch {
    t.pending += flushed; // KV hiccup: try again on the next tile
  }
}

export interface RainTileParams {
  layer: string;
  snapshot: number;
  fsec: number;
  z: number;
  x: number;
  y: number;
}

/** Parse and validate /api/rain/tile/... path segments. Null = bad request. */
export function parseRainTilePath(pathname: string): RainTileParams | null {
  const m = pathname.match(
    /^\/api\/rain\/tile\/([a-z-]+)\/(\d{10})\/(\d{1,5})\/(\d{1,2})\/(\d{1,4})\/(\d{1,4})\.png$/,
  );
  if (!m) return null;
  const [, layer, snapS, fsecS, zS, xS, yS] = m;
  const snapshot = Number(snapS);
  const fsec = Number(fsecS);
  const z = Number(zS);
  const x = Number(xS);
  const y = Number(yS);
  if (!LAYERS.has(layer!)) return null;
  if (snapshot % 600 !== 0) return null;
  if (fsec % 600 !== 0 || fsec > 14400) return null;
  if (z > 12 || x >= 2 ** z || y >= 2 ** z) return null;
  return { layer: layer!, snapshot, fsec, z, x, y };
}

const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

async function cachedUpstream(
  cachePath: string,
  upstream: string,
  key: string,
  contentType: string,
  cacheSeconds: number,
  cors: Record<string, string>,
  /** called once the upstream call has actually happened, i.e. been billed */
  onBilled?: () => Promise<void>,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(`https://rain-cache.blockcast.internal${cachePath}`);
  const hit = await cache.match(cacheKey);
  if (hit) {
    const res = new Response(hit.body, hit);
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  let res: Response;
  try {
    res = await fetch(upstream, {
      headers: { 'Ocp-Apim-Subscription-Key': key, 'User-Agent': UA },
    });
  } catch {
    return json(502, { error: 'rainbow unreachable' }, cors);
  }
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith(contentType)) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    return json(502, { error: `rainbow ${res.status}`, detail }, cors);
  }

  const body = await res.arrayBuffer();
  await onBilled?.();
  const headers = {
    'content-type': contentType,
    'cache-control': `public, max-age=${cacheSeconds}`,
  };
  await cache.put(cacheKey, new Response(body, { headers }));
  return new Response(body, { headers: { ...headers, ...cors } });
}

export async function handleRain(
  url: URL,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  let key = env.RAINBOW_KEY;
  const budget = tileBudget(env);

  if (url.pathname === '/api/rain/status') {
    if (!key) return json(200, { enabled: false }, cors);
    const t = await spentToday(env, Date.now());
    const spent = t.stored + t.pending;
    return json(200, { enabled: spent < budget, spent, budget }, cors);
  }
  if (!key) return json(503, { error: 'rainbow not configured' }, cors);
  key = key.trim();

  const snap = url.pathname.match(/^\/api\/rain\/snapshot\/([a-z-]+)$/);
  if (snap) {
    if (!LAYERS.has(snap[1]!)) return json(400, { error: 'bad layer' }, cors);
    // cache-bust minutely so clients see a fresh snapshot within a minute
    const minute = Math.floor(Date.now() / 60_000);
    return cachedUpstream(
      `${url.pathname}?m=${minute}`,
      `${RB_HOST}/tiles/v1/snapshot?layer=${snap[1]}`,
      key,
      'application/json',
      SNAPSHOT_CACHE_SECONDS,
      cors,
    );
  }

  const p = parseRainTilePath(url.pathname);
  if (!p) return json(400, { error: 'bad rain path' }, cors);

  // Cached tiles are free, so the budget is only consulted for the ones that
  // would reach Rainbow. A 429 lets the client keep whatever it already has.
  const t = await spentToday(env, Date.now());
  if (t.stored + t.pending >= budget) {
    return json(429, { error: 'daily tile budget reached', budget }, cors);
  }

  return cachedUpstream(
    url.pathname,
    `${RB_HOST}/tiles/v1/${p.layer}/${p.snapshot}/${p.fsec}/${p.z}/${p.x}/${p.y}`,
    key,
    'image/png',
    TILE_CACHE_SECONDS,
    cors,
    () => chargeTile(env, t),
  );
}
