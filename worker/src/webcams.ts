import { distKm } from '../../app/src/core/geo';

// Nearby webcams — a thin proxy over the Windy Webcams API v3.
// The app never sees the API key, and responses are cached ~5 min per
// ~1 km grid cell: well under the 10-minute lifetime of the free-tier
// image tokens, so cached thumbnail URLs still load.

export interface SlimWebcam {
  id: number;
  title: string;
  lat: number;
  lon: number;
  /** "City, Region" when Windy knows it. */
  place?: string;
  /** Small still (~200px) for thumbnail rails. */
  thumb: string;
  /** Large still (~1080px) for the focused view. */
  preview: string;
  /** Live player embed URL — only some cams stream. */
  live?: string;
  /** Day timelapse player embed URL. */
  day?: string;
  /** The cam's page on windy.com (required attribution linkback). */
  detail?: string;
  /** ISO timestamp of the current image. */
  updated?: string;
}

const RADIUS_KM = 60;
const LIMIT = 12;
const CACHE_SECONDS = 300;

export const windyUrl = (lat: number, lon: number): string =>
  'https://api.windy.com/webcams/api/v3/webcams' +
  `?nearby=${lat},${lon},${RADIUS_KM}&limit=${LIMIT}` +
  '&include=images,location,player,urls';

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | undefined =>
  v && typeof v === 'object' ? (v as Rec) : undefined;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** Normalize a raw Windy v3 list response into the slim shape the app reads.
 * Defensive throughout: a cam missing coordinates or images is dropped. */
export function parseWindyWebcams(raw: unknown): SlimWebcam[] {
  const webcams = rec(raw)?.webcams;
  if (!Array.isArray(webcams)) return [];
  const out: SlimWebcam[] = [];
  for (const item of webcams) {
    const w = rec(item);
    if (!w || w.status === 'inactive') continue;
    const location = rec(w.location);
    const current = rec(rec(w.images)?.current);
    const player = rec(w.player);
    const lat = location?.latitude;
    const lon = location?.longitude;
    const thumb = str(current?.thumbnail);
    if (typeof w.webcamId !== 'number' || typeof lat !== 'number' || typeof lon !== 'number')
      continue;
    if (!thumb) continue;
    const place = [str(location?.city), str(location?.region)].filter(Boolean);
    out.push({
      id: w.webcamId,
      title: str(w.title) ?? `${lat}, ${lon}`,
      lat,
      lon,
      place: place.length ? place.join(', ') : undefined,
      thumb,
      preview: str(current?.preview) ?? thumb,
      live: str(player?.live),
      day: str(player?.day),
      detail: str(rec(w.urls)?.detail),
      updated: str(w.lastUpdatedOn),
    });
  }
  return out;
}

export function parseCoords(url: URL): { lat: number; lon: number } | null {
  const rawLat = url.searchParams.get('lat');
  const rawLon = url.searchParams.get('lon');
  if (rawLat == null || rawLon == null) return null;
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

export async function handleWebcams(
  url: URL,
  apiKey: string | undefined,
  cors: Record<string, string>,
): Promise<Response> {
  const coords = parseCoords(url);
  if (!coords) return json(400, { error: 'lat and lon required' }, cors);
  if (!apiKey) return json(503, { error: 'webcams not configured' }, cors);

  // ~1 km grid: nudging the pin around a spot keeps hitting the same entry
  const cacheKey = new Request(
    `https://webcams-cache.blockcast.internal/${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`,
  );
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  // CORS varies by caller, so re-attach it instead of caching it
  if (hit) return json(200, await hit.json(), cors);

  let res: Response;
  try {
    res = await fetch(windyUrl(coords.lat, coords.lon), {
      headers: { 'x-windy-api-key': apiKey },
    });
  } catch {
    return json(502, { error: 'windy unreachable' }, cors);
  }
  if (!res.ok) return json(502, { error: `windy ${res.status}` }, cors);

  // Windy's nearby search has no distance sort of its own
  const cams = parseWindyWebcams(await res.json()).sort(
    (a, b) => distKm(coords, a) - distKm(coords, b),
  );
  const body = { webcams: cams };
  await cache.put(
    cacheKey,
    new Response(JSON.stringify(body), {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${CACHE_SECONDS}`,
      },
    }),
  );
  return json(200, body, cors);
}
