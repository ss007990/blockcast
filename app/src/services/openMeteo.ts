import {
  applyRainBlend,
  RAIN_BLEND_MODELS,
  reshapeForecast,
  type ForecastData,
  type MarineResponse,
  type OpenMeteoResponse,
  type RainBlendResponse,
} from '../core/forecast';

const PAST_DAYS = 2; // needed to compute fresh snow over the last 48 h

// Whether a point has ocean data is a property of the map, not of today, and
// most users never move: remembering the inland verdict turns the swell
// request from every-load into once-per-area. It is a full weighted
// Open-Meteo call, so that is ~12% of the app's billable volume.
const INLAND_KEY = 'blockcast.v1.inland';
const CELL_PER_DEG = 10; // 0.1°, about 11 km — marine availability is stable at that scale
const MAX_CELLS = 200;

const cellKey = (lat: number, lon: number) =>
  `${Math.round(lat * CELL_PER_DEG)},${Math.round(lon * CELL_PER_DEG)}`;

function readInland(): string[] {
  try {
    const raw = localStorage.getItem(INLAND_KEY);
    const list: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return []; // private mode or corrupt entry: fall back to always fetching
  }
}

function markInland(lat: number, lon: number): void {
  try {
    const list = readInland();
    const key = cellKey(lat, lon);
    if (list.includes(key)) return;
    list.push(key);
    localStorage.setItem(INLAND_KEY, JSON.stringify(list.slice(-MAX_CELLS)));
  } catch {
    // best effort — skipping the memo only costs a request
  }
}

const anyNumber = (a: unknown): boolean => Array.isArray(a) && a.some((v) => v != null);

/**
 * What a marine response tells us about the place. Only a well-formed answer
 * with no numbers in it means "inland": anything unrecognisable is 'unusable'
 * and gets forgotten, because a wrong inland verdict sticks and would
 * silently drop swell and tide from a coastal user's scores.
 */
function marineVerdict(m: MarineResponse | null): 'coastal' | 'inland' | 'unusable' {
  const h = m?.hourly;
  if (!h?.time?.length) return 'unusable';
  const swell = h.swell_wave_height;
  const sea = h.sea_level_height_msl;
  if (!Array.isArray(swell) || !Array.isArray(sea)) return 'unusable';
  return anyNumber(swell) || anyNumber(sea) ? 'coastal' : 'inland';
}

/** Swell + tidal sea level from the Marine API. `failed` separates "the
 * request did not land" from "this place has no ocean": only the second is
 * worth remembering, since a network blip must not mark a coast inland. */
async function fetchMarine(
  lat: number,
  lon: number,
): Promise<{ data: MarineResponse | null; failed: boolean }> {
  const u = new URL('https://marine-api.open-meteo.com/v1/marine');
  u.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '7',
    past_days: String(PAST_DAYS),
    hourly: 'swell_wave_height,sea_level_height_msl',
  }).toString();
  try {
    const res = await fetch(u);
    if (!res.ok) return { data: null, failed: true };
    return { data: (await res.json()) as MarineResponse, failed: false };
  } catch {
    return { data: null, failed: true };
  }
}

/** Rain from the extra blend models. Failure-tolerant: a null just means the
 * forecast stays on best_match alone. */
async function fetchRainBlend(lat: number, lon: number): Promise<RainBlendResponse | null> {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '14',
    past_days: String(PAST_DAYS),
    hourly: 'precipitation_probability,precipitation',
    models: RAIN_BLEND_MODELS,
  }).toString();
  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    return (await res.json()) as RainBlendResponse;
  } catch {
    return null;
  }
}

// 14 days for the two-week planner; the marine fetch stays at 7 — the wave
// model's horizon is ~8 days, so week 2 scores without swell/tide factors.
export async function fetchForecast(lat: number, lon: number): Promise<ForecastData> {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '14',
    past_days: String(PAST_DAYS),
    hourly:
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,cloud_cover,uv_index,snowfall,snow_depth,weather_code,is_day,relative_humidity_2m,dew_point_2m',
    daily:
      'weather_code,apparent_temperature_max,apparent_temperature_min,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    // 15-minute nowcast for the next 24 h (rain vs snow split for the Today card)
    minutely_15: 'precipitation,rain,snowfall',
    forecast_minutely_15: '96',
  }).toString();
  const skipMarine = readInland().includes(cellKey(lat, lon));
  const [res, marine, blend] = await Promise.all([
    fetch(u),
    skipMarine ? Promise.resolve({ data: null, failed: false }) : fetchMarine(lat, lon),
    fetchRainBlend(lat, lon),
  ]);
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  if (!skipMarine && !marine.failed && marineVerdict(marine.data) === 'inland') {
    markInland(lat, lon);
  }
  const j = (await res.json()) as OpenMeteoResponse;
  applyRainBlend(j, blend);
  return reshapeForecast(j, PAST_DAYS, marine.data);
}
