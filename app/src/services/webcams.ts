// Nearby live webcams, served by the worker's Windy proxy. The worker owns
// the API key and caches per grid cell; this side only adds a short client
// cache so reopening the sheet doesn't refetch.

export interface Webcam {
  id: number;
  title: string;
  lat: number;
  lon: number;
  place?: string;
  thumb: string;
  preview: string;
  live?: string;
  day?: string;
  detail?: string;
  updated?: string;
}

const API = import.meta.env.VITE_PUSH_API as string | undefined;

export const webcamsAvailable = (): boolean => !!API;

const TTL_MS = 5 * 60_000;
let cache: { key: string; at: number; cams: Webcam[] } | null = null;

/** Nearest webcams for a spot. Empty array = none around; null = the
 * feature is unavailable (no worker, no key, network trouble). */
export async function fetchNearbyWebcams(lat: number, lon: number): Promise<Webcam[] | null> {
  if (!API) return null;
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) return cache.cams;
  try {
    const res = await fetch(`${API}/api/webcams?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { webcams?: Webcam[] };
    if (!Array.isArray(j.webcams)) return null;
    cache = { key, at: Date.now(), cams: j.webcams };
    return j.webcams;
  } catch {
    return null;
  }
}
