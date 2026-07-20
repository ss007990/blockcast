// Forecast data model + block extraction. Pure: the fetch itself lives in
// services/openMeteo.ts; reshaping and scoring take data as arguments.

import type { Criteria } from './activities';
import { blockFactors, riskScore, riskBand, type Band, type BlockFactors, type HourSlice } from './scoring';

/** Raw shape of the Open-Meteo response fields we request. */
export interface OpenMeteoResponse {
  timezone: string;
  utc_offset_seconds?: number;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    apparent_temperature: (number | null)[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
    cloud_cover: (number | null)[];
    uv_index: (number | null)[];
    snowfall: (number | null)[];
    snow_depth: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    sunrise: string[];
    sunset: string[];
  };
}

/** Raw shape of the Open-Meteo Marine API fields we request.
 * Inland the model has no data: every value comes back null — that absence
 * IS the "geographically relevant" test for showing swell/tide anywhere. */
export interface MarineResponse {
  hourly: {
    time: string[];
    swell_wave_height: (number | null)[];
    sea_level_height_msl: (number | null)[];
  };
}

/** Tidal ranges under this are noise (lakes, near-tideless seas) — skip tide. */
const MIN_TIDE_RANGE_M = 0.3;

interface MarineByTime {
  swell: Map<string, number>;
  /** Sea level normalized 0 (range low) – 1 (range high); empty if micro-tidal. */
  tide: Map<string, number>;
}

/** Index marine hours by timestamp; null when the location has no ocean data.
 * Swell and tide gate independently: tidal estuaries like the lower
 * St. Lawrence have sea-level (tide) cells but no wave-model coverage. */
function indexMarine(m: MarineResponse | null | undefined): MarineByTime | null {
  if (!m?.hourly?.time?.length) return null;
  const swell = new Map<string, number>();
  const sea = new Map<string, number>();
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < m.hourly.time.length; i++) {
    const t = m.hourly.time[i];
    if (!t) continue;
    const sw = m.hourly.swell_wave_height[i];
    if (sw != null) swell.set(t, sw);
    const sl = m.hourly.sea_level_height_msl[i];
    if (sl != null) {
      sea.set(t, sl);
      lo = Math.min(lo, sl);
      hi = Math.max(hi, sl);
    }
  }
  const tide = new Map<string, number>();
  if (hi - lo >= MIN_TIDE_RANGE_M)
    for (const [t, v] of sea) tide.set(t, (v - lo) / (hi - lo));
  if (!swell.size && !tide.size) return null;
  return { swell, tide };
}

export interface ForecastData {
  /** dayISO → sparse array indexed by hour 0–23. */
  days: Record<string, (HourSlice | undefined)[]>;
  daily: OpenMeteoResponse['daily'];
  timezone: string;
  utcOffsetSeconds: number;
  /** "2026-07-20T14:00" → index into the flat hourly arrays. */
  timeIndex: Map<string, number>;
  /** Flat hourly snowfall (cm) aligned with timeIndex. */
  snowfall: number[];
  /** Number of past days included at the start of the range. */
  pastDays: number;
  /** Non-null when the location has any ocean data; each flag says which
   * factor is actually available (tidal rivers can be tide-only). */
  marine: { swell: boolean; tide: boolean } | null;
}

export function reshapeForecast(
  j: OpenMeteoResponse,
  pastDays: number,
  marineRaw?: MarineResponse | null,
): ForecastData {
  const H = j.hourly;
  const marine = indexMarine(marineRaw);
  const days: ForecastData['days'] = {};
  const timeIndex = new Map<string, number>();
  for (let i = 0; i < H.time.length; i++) {
    const t = H.time[i];
    if (!t) continue;
    timeIndex.set(t, i);
    const day = t.slice(0, 10);
    const hour = +t.slice(11, 13);
    (days[day] ??= [])[hour] = {
      temp: H.apparent_temperature[i] ?? H.temperature_2m[i] ?? 0,
      pprob: H.precipitation_probability[i] ?? 0,
      precip: H.precipitation[i] ?? 0,
      wind: H.wind_speed_10m[i] ?? 0,
      gust: H.wind_gusts_10m[i] ?? 0,
      cloud: H.cloud_cover[i] ?? 0,
      uv: H.uv_index[i] ?? 0,
      sdep: H.snow_depth[i] ?? 0,
      swell: marine?.swell.get(t),
      tide: marine?.tide.get(t),
    };
  }
  return {
    days,
    daily: j.daily,
    timezone: j.timezone,
    utcOffsetSeconds: j.utc_offset_seconds ?? 0,
    timeIndex,
    snowfall: H.snowfall.map((v) => v ?? 0),
    pastDays,
    marine: marine ? { swell: marine.swell.size > 0, tide: marine.tide.size > 0 } : null,
  };
}

export interface BlockResult {
  f: BlockFactors;
  score: number;
  band: Band;
}

/** Score one block: [startHour, startHour+len) on dayISO with the given criteria. */
export function getBlock(
  data: ForecastData,
  dayISO: string,
  startHour: number,
  len: number,
  crit: Criteria,
  tolMult: number,
): BlockResult | null {
  const day = data.days[dayISO];
  if (!day) return null;
  const hours: HourSlice[] = [];
  for (let h = startHour; h < startHour + len && h < 24; h++) {
    const slice = day[h];
    if (slice) hours.push(slice);
  }
  if (!hours.length) return null;
  // fresh snowfall accumulated over the 48 h before the block starts
  let fresh = 0;
  const idx = data.timeIndex.get(`${dayISO}T${String(startHour).padStart(2, '0')}:00`);
  if (idx !== undefined)
    for (let j = Math.max(0, idx - 48); j < idx; j++) fresh += data.snowfall[j] ?? 0;
  const f = blockFactors(hours, +fresh.toFixed(1), crit);
  const score = riskScore(f, crit.weights, tolMult);
  return { f, score, band: riskBand(score) };
}

/** The forecast days to display: today plus the coming days (one week by default). */
export function forecastDayKeys(data: ForecastData, days = 7): string[] {
  return Object.keys(data.days)
    .sort()
    .slice(data.pastDays, data.pastDays + days);
}

/** Wall-clock "now" at the forecast location, given the browser's clock. */
export function locNow(data: ForecastData | null, nowMs: number): Date {
  if (!data) return new Date(nowMs);
  return new Date(nowMs + data.utcOffsetSeconds * 1000 + new Date(nowMs).getTimezoneOffset() * 60000);
}

export const isoDate = (dt: Date): string =>
  dt.getFullYear() +
  '-' +
  String(dt.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(dt.getDate()).padStart(2, '0');

/** WMO weather code → emoji glyph. */
export const wmoIcon = (c: number): string =>
  c === 0
    ? '☀️'
    : c <= 2
      ? '🌤'
      : c === 3
        ? '☁️'
        : c <= 48
          ? '🌫'
          : c <= 57
            ? '🌦'
            : c <= 67
              ? '🌧'
              : c <= 77
                ? '🌨'
                : c <= 82
                  ? '🌧'
                  : c <= 86
                    ? '🌨'
                    : '⛈';
