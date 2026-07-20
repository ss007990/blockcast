import {
  reshapeForecast,
  type ForecastData,
  type MarineResponse,
  type OpenMeteoResponse,
} from '../core/forecast';

const PAST_DAYS = 2; // needed to compute fresh snow over the last 48 h

/** Swell + tidal sea level from the Marine API. Coastal points get numbers,
 * inland points get all-null arrays — so a failed or empty fetch simply means
 * "not near an ocean" and the app carries on without marine factors. */
async function fetchMarine(lat: number, lon: number): Promise<MarineResponse | null> {
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
    if (!res.ok) return null;
    return (await res.json()) as MarineResponse;
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
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,cloud_cover,uv_index,snowfall,snow_depth',
    daily: 'weather_code,apparent_temperature_max,apparent_temperature_min,sunrise,sunset',
  }).toString();
  const [res, marine] = await Promise.all([fetch(u), fetchMarine(lat, lon)]);
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  const j = (await res.json()) as OpenMeteoResponse;
  return reshapeForecast(j, PAST_DAYS, marine);
}
