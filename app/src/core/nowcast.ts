// Nowcast analysis for the Today page — pure functions.
// computeNowcast reads the 15-minute series for the "rain starting at 15:10"
// card; precipStory reads the hourly series for the hero's one-line narrative.

import type { ForecastData } from './forecast';
import type { HourSlice } from './scoring';

/** Snow WMO codes (snow fall, snow grains, snow showers). */
const isSnowCode = (c: number | undefined): boolean =>
  c != null && ((c >= 71 && c <= 77) || c === 85 || c === 86);

export interface Nowcast {
  kind: 'rain' | 'snow';
  /** ISO of the first wet 15-min step; null when it is already precipitating. */
  startISO: string | null;
  /** ISO when the precipitation tapers off; null when it lasts past the horizon. */
  endISO: string | null;
  /** Rain over the next 3 h, mm. */
  rainMm: number;
  /** Snow over the next 3 h, cm. */
  snowCm: number;
  /** 15-min intensities from "now", for the bar strip — mm of rain, or cm of
   * snow when `kind` is 'snow' (so the chart scale reads in the same unit as
   * the accumulation line). */
  bars: number[];
}

/** A 15-min step at or above this (mm) counts as precipitation. */
const WET_STEP_MM = 0.1;
/** Steps within which precip must start for the card to show (2 h). */
const LEAD_STEPS = 8;
/** Steps summed for accumulation and bars (3 h). */
const WINDOW_STEPS = 12;

/**
 * Analyse the 15-minute series around location-local `nowISO`
 * ("YYYY-MM-DDTHH:MM"). Returns null — card hidden — when nothing falls
 * within the next 2 h or the series is missing.
 */
export function computeNowcast(data: ForecastData, nowISO: string): Nowcast | null {
  const m = data.minutely;
  if (!m?.time.length) return null;
  let idx = -1;
  for (let i = 0; i < m.time.length; i++) {
    if (m.time[i]! >= nowISO) {
      idx = i;
      break;
    }
  }
  // findIndex of the first step at/after now; series entirely in the past → no card
  if (idx < 0) return null;
  // the step covering "now" starts up to 15 min before it
  if (idx > 0 && m.time[idx]! > nowISO) idx--;

  const lead = m.precip.slice(idx, idx + LEAD_STEPS);
  if (!lead.some((v) => v >= WET_STEP_MM)) return null;

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const rainMm = +sum(m.rain.slice(idx, idx + WINDOW_STEPS)).toFixed(1);
  const snowCm = +sum(m.snow.slice(idx, idx + WINDOW_STEPS)).toFixed(1);
  // units differ (cm vs mm) but ~1 cm snow ≈ 1 mm water: whichever dominates
  // the window names the card
  const kind: Nowcast['kind'] = snowCm >= Math.max(0.3, rainMm) ? 'snow' : 'rain';
  const bars = (kind === 'snow' ? m.snow : m.precip).slice(idx, idx + WINDOW_STEPS);

  // start/end detection always reads total precipitation, whatever the kind
  const firstWet = m.precip
    .slice(idx, idx + WINDOW_STEPS)
    .findIndex((v) => v >= WET_STEP_MM);
  const startISO = firstWet <= 0 ? null : (m.time[idx + firstWet] ?? null);

  let endISO: string | null = null;
  for (let j = idx + Math.max(firstWet, 0); j < m.time.length - 1; j++) {
    if (m.precip[j]! >= WET_STEP_MM) continue;
    if (m.precip[j + 1]! < WET_STEP_MM) {
      // two consecutive dry steps: the event is over, not just a lull
      endISO = m.time[j] ?? null;
      break;
    }
  }
  return { kind, startISO, endISO, rainMm, snowCm, bars };
}

export type PrecipStory =
  | { type: 'dry' }
  | { type: 'start' | 'end'; kind: 'rain' | 'snow'; hour: number };

/** An hour is "wet" when precipitation is both likely and material. */
const wetHour = (s: HourSlice): boolean => s.pprob >= 50 && s.precip >= 0.2;

/**
 * The day's precipitation story from `fromH` on: dry all day, precip starting
 * at some hour, or current precip ending at some hour.
 */
export function precipStory(day: (HourSlice | undefined)[], fromH: number): PrecipStory {
  const cur = day[fromH];
  const kindOf = (s: HourSlice): 'rain' | 'snow' =>
    isSnowCode(s.code) || (s.code == null && s.temp <= 0) ? 'snow' : 'rain';

  if (cur && wetHour(cur)) {
    for (let h = fromH + 1; h < 24; h++) {
      const s = day[h];
      if (s && !wetHour(s)) return { type: 'end', kind: kindOf(cur), hour: h };
    }
    return { type: 'end', kind: kindOf(cur), hour: 23 };
  }
  for (let h = fromH + 1; h < 24; h++) {
    const s = day[h];
    if (s && wetHour(s)) return { type: 'start', kind: kindOf(s), hour: h };
  }
  return { type: 'dry' };
}
