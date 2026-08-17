// ECCC GeoMet proxy with an edge cache.
//
// Radar frames used to go straight from every device to geo.weather.gc.ca:
// about 30 requests per radar open (3 GetCapabilities + one GetMap per frame),
// all with viewport-unique bboxes, so nothing cached and upstream load grew
// with users. MSC's service usage policy asks anyone sustaining 86,400
// requests a day to contact them and says consistent use above that "may be
// subject to having access limited or otherwise revoked".
//
// Requests here name a rectangle on the shared cell grid instead of a
// viewport (see core/radarView.ts), so everyone looking at the same city at
// the same zoom collapses onto one upstream fetch:
//
//   GET /api/geomet/caps/{layer}
//   GET /api/geomet/map/{layer}/{time}/{z}/{x0}/{y0}/{nx}/{ny}.png
//
// The client never sends a bbox. The worker rebuilds it from the cell
// rectangle, which keeps this from being an open proxy to a public service.

import { isValidRect, rectBbox, type CellRect } from '../../app/src/core/radarView';

const GEOMET = 'https://geo.weather.gc.ca/geomet';
const UA = 'BlockCast-worker/1.0 (+https://blockcast.ca)';

/** Only the three layers the radar player actually plays. */
const LAYERS = new Set([
  'RADAR_1KM_RRAI',
  'Radar_1km_RainPrecipRate-Extrapolation',
  'HRDPS.CONTINENTAL_RT',
]);

// How long a frame may be reused. An observed composite for a given TIME
// never changes, so it is effectively immutable. The extrapolation is rerun
// every 6 minutes and the model hourly, and a rerun can reissue the same TIME
// with different content, so those get short lives rather than a stale
// forecast pinned for hours.
const OBSERVED_TTL = 6 * 3600;
const NOWCAST_TTL = 300;
const MODEL_TTL = 900;
const CAPS_TTL = 60; // the frame plan must notice a new run promptly

const ttlFor = (layer: string): number =>
  layer === 'RADAR_1KM_RRAI'
    ? OBSERVED_TTL
    : layer === 'HRDPS.CONTINENTAL_RT'
      ? MODEL_TTL
      : NOWCAST_TTL;

/** WMS TIME as GeoMet advertises it: whole seconds, UTC, no fraction. */
const TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export interface GeometMapParams extends CellRect {
  layer: string;
  time: string;
}

/** Parse and validate /api/geomet/map/... Null means "do not forward". */
export function parseGeometMapPath(pathname: string): GeometMapParams | null {
  const m = pathname.match(
    /^\/api\/geomet\/map\/([A-Za-z0-9_.-]+)\/([0-9TZ:-]+)\/(\d{1,2})\/(\d{1,5})\/(\d{1,5})\/(\d{1,2})\/(\d{1,2})\.png$/,
  );
  if (!m) return null;
  const [, layer, time, z, x0, y0, nx, ny] = m;
  if (!LAYERS.has(layer!)) return null;
  if (!TIME_RE.test(time!)) return null;
  if (Number.isNaN(Date.parse(time!))) return null;
  const rect: CellRect = {
    z: Number(z),
    x0: Number(x0),
    y0: Number(y0),
    nx: Number(nx),
    ny: Number(ny),
  };
  if (!isValidRect(rect)) return null;
  return { layer: layer!, time: time!, ...rect };
}

/** Parse /api/geomet/caps/{layer}. Null means "do not forward". */
export function parseGeometCapsPath(pathname: string): string | null {
  const m = pathname.match(/^\/api\/geomet\/caps\/([A-Za-z0-9_.-]+)$/);
  return m && LAYERS.has(m[1]!) ? m[1]! : null;
}

/** GetMap URL for a validated cell rectangle. */
export function geometMapUrl(p: GeometMapParams): string {
  const [xmin, ymin, xmax, ymax] = rectBbox(p);
  return `${GEOMET}?${new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: p.layer,
    format: 'image/png',
    transparent: 'true',
    crs: 'EPSG:3857',
    bbox: `${xmin},${ymin},${xmax},${ymax}`,
    width: String(p.nx * 256),
    height: String(p.ny * 256),
    time: p.time,
  })}`;
}

const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

/** Serve from the edge cache, else fetch upstream and store. The cache key is
 * the canonical request path, so it is shared by every viewer of that cell
 * rectangle. */
async function cached(
  cacheKeyPath: string,
  upstream: string,
  /** acceptable upstream content types; the first is the fallback served */
  accept: string[],
  ttl: number,
  cors: Record<string, string>,
): Promise<Response> {
  const cache = caches.default;
  const key = new Request(`https://geomet-cache.blockcast.internal${cacheKeyPath}`);
  const hit = await cache.match(key);
  if (hit) {
    const res = new Response(hit.body, hit);
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    res.headers.set('x-bc-cache', 'hit');
    return res;
  }

  let up: Response;
  try {
    up = await fetch(upstream, { headers: { 'User-Agent': UA } });
  } catch {
    return json(502, { error: 'geomet unreachable' }, cors);
  }
  // GeoMet answers 200 with an XML ServiceException for a bad TIME, so the
  // content type is the real check on a frame; caching one of those would pin
  // an error. Capabilities come back as "text/xml; charset=UTF-8", hence a
  // list rather than one prefix.
  const upType = up.headers.get('content-type') ?? '';
  if (!up.ok || !accept.some((a) => upType.startsWith(a))) {
    return json(502, { error: `geomet ${up.status}`, type: upType.slice(0, 60) }, cors);
  }

  const body = await up.arrayBuffer();
  const headers = {
    'content-type': upType || accept[0]!,
    'cache-control': `public, max-age=${ttl}`,
  };
  await cache.put(key, new Response(body, { headers }));
  return new Response(body, { headers: { ...headers, ...cors, 'x-bc-cache': 'miss' } });
}

export async function handleGeomet(url: URL, cors: Record<string, string>): Promise<Response> {
  const capsLayer = parseGeometCapsPath(url.pathname);
  if (capsLayer) {
    return cached(
      url.pathname,
      `${GEOMET}?service=WMS&version=1.3.0&request=GetCapabilities&layers=${capsLayer}`,
      ['text/xml', 'application/xml'],
      CAPS_TTL,
      cors,
    );
  }

  const p = parseGeometMapPath(url.pathname);
  if (!p) return json(400, { error: 'bad geomet path' }, cors);
  return cached(url.pathname, geometMapUrl(p), ['image/png'], ttlFor(p.layer), cors);
}
