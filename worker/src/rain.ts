// Rainbow AI tile proxy. Their API wants an Azure-style subscription-key
// header, so the app never talks to them directly: it asks this route for
// the current snapshot and one PNG per tile, and the worker adds the key.
// Tiles are immutable per (snapshot, forecast) pair, so the edge cache
// makes cost scale with viewed areas, not users.
//
//   GET /api/rain/status                                     → { enabled }
//   GET /api/rain/snapshot/{layer}                           → { snapshot }
//   GET /api/rain/tile/{layer}/{snapshot}/{fsec}/{z}/{x}/{y}.png
//
// layer     precip | precip-global
// snapshot  epoch seconds, 10-minute aligned (from /snapshot; older
//           snapshots reach 2 h back with fsec 0)
// fsec      forecast offset in seconds, 0..14400 in steps of 600

const RB_HOST = 'https://api.rainbow.ai';
const UA = 'BlockCast-worker/1.0';

const LAYERS = new Set(['precip', 'precip-global']);
const TILE_CACHE_SECONDS = 6 * 3600; // a (snapshot, fsec) tile never changes
const SNAPSHOT_CACHE_SECONDS = 60;

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
  const headers = {
    'content-type': contentType,
    'cache-control': `public, max-age=${cacheSeconds}`,
  };
  await cache.put(cacheKey, new Response(body, { headers }));
  return new Response(body, { headers: { ...headers, ...cors } });
}

export async function handleRain(
  url: URL,
  key: string | undefined,
  cors: Record<string, string>,
): Promise<Response> {
  if (url.pathname === '/api/rain/status') return json(200, { enabled: !!key }, cors);
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
  return cachedUpstream(
    url.pathname,
    `${RB_HOST}/tiles/v1/${p.layer}/${p.snapshot}/${p.fsec}/${p.z}/${p.x}/${p.y}`,
    key,
    'image/png',
    TILE_CACHE_SECONDS,
    cors,
  );
}
