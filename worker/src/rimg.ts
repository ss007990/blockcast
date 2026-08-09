// Xweather (Vaisala) flat-map image proxy. Their map URLs embed the
// client id/secret pair, so the app never talks to them directly: it asks
// this route for one image per radar frame and the worker signs the
// request. Edge-cached per tile-of-time so the free tier lasts.
//
//   GET /api/rimg/status                            → { enabled }
//   GET /api/rimg/{layer}/{w}x{h}/{lat},{lon},{z}/{offset}.png
//
// layer    radar | fradar   (observed / extrapolated future radar)
// offset   current, -10min, +30min, …

const XW_HOST = 'https://maps.api.xweather.com';

const LAYERS = new Set(['radar', 'fradar']);
const OFFSET_RE = /^(current|[+-]\d{1,3}min)$/;
const MAX_PX = 2048;
const CACHE_SECONDS = 240;

export interface RimgParams {
  layer: string;
  w: number;
  h: number;
  lat: number;
  lon: number;
  z: number;
  offset: string;
}

/** Parse and validate /api/rimg/... path segments. Null = bad request. */
export function parseRimgPath(pathname: string): RimgParams | null {
  const m = pathname.match(
    /^\/api\/rimg\/([a-z]+)\/(\d+)x(\d+)\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d{1,2})\/([a-z0-9+-]+)\.png$/,
  );
  if (!m) return null;
  const [, layer, wS, hS, latS, lonS, zS, offset] = m;
  const w = Number(wS);
  const h = Number(hS);
  const lat = Number(latS);
  const lon = Number(lonS);
  const z = Number(zS);
  if (!LAYERS.has(layer!)) return null;
  if (!OFFSET_RE.test(offset!)) return null;
  if (w < 1 || h < 1 || w > MAX_PX || h > MAX_PX) return null;
  if (Math.abs(lat) > 85 || Math.abs(lon) > 180 || z < 1 || z > 14) return null;
  return { layer: layer!, w, h, lat, lon, z, offset: offset! };
}

const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

export async function handleRimg(
  url: URL,
  id: string | undefined,
  secret: string | undefined,
  cors: Record<string, string>,
): Promise<Response> {
  if (url.pathname === '/api/rimg/status') {
    return json(200, { enabled: !!(id && secret) }, cors);
  }
  const p = parseRimgPath(url.pathname);
  if (!p) return json(400, { error: 'bad rimg path' }, cors);
  // pasted secrets sometimes carry stray whitespace; a newline in the URL
  // path turns into a 404 upstream
  id = id?.trim();
  secret = secret?.trim();
  if (!id || !secret) return json(503, { error: 'xweather not configured' }, cors);

  const cache = caches.default;
  // the public URL is already unique per frame; cache on it directly
  const cacheKey = new Request(`https://rimg-cache.blockcast.internal${url.pathname}`);
  const hit = await cache.match(cacheKey);
  if (hit) {
    const res = new Response(hit.body, hit);
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  const upstream = `${XW_HOST}/${id}_${secret}/${p.layer}/${p.w}x${p.h}/${p.lat},${p.lon},${p.z}/${p.offset}.png`;
  let res: Response;
  try {
    res = await fetch(upstream);
  } catch {
    return json(502, { error: 'xweather unreachable' }, cors);
  }
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
    // surface the upstream reason (auth, plan, layer). Upstream messages can
    // echo the request URL, so scrub the credential segment before replying.
    const detail = (await res.text().catch(() => ''))
      .replaceAll(`${id}_${secret}`, '[credentials]')
      .replaceAll(id, '[id]')
      .replaceAll(secret, '[secret]')
      .slice(0, 200);
    return json(502, { error: `xweather ${res.status}`, detail }, cors);
  }

  const body = await res.arrayBuffer();
  const cached = new Response(body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': `public, max-age=${CACHE_SECONDS}`,
    },
  });
  await cache.put(cacheKey, cached.clone());
  const out = new Response(body, {
    headers: { 'content-type': 'image/png', 'cache-control': `public, max-age=${CACHE_SECONDS}`, ...cors },
  });
  return out;
}
