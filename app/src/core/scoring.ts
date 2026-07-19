// The scoring engine — pure functions only.
// Comfort is judged on the felt (apparent) temperature: wind chill and
// humidity matter more outdoors than the thermometer reading.

import type { Criteria, FactorKey, Weights } from './activities';

/** One hour of weather at the location. */
export interface HourSlice {
  /** Felt (apparent) temperature, °C. */
  temp: number;
  /** Precipitation probability, %. */
  pprob: number;
  /** Precipitation amount, mm. */
  precip: number;
  /** Sustained wind, km/h. */
  wind: number;
  /** Gusts, km/h. */
  gust: number;
  /** Cloud cover, %. */
  cloud: number;
  /** UV index. */
  uv: number;
  /** Snow depth on the ground, metres. */
  sdep: number;
  /** Ocean swell height, metres — only set for coastal locations. */
  swell?: number;
  /** Tide level normalized 0 (week's low) – 1 (week's high) — coastal only. */
  tide?: number;
}

export type Severities = Record<FactorKey, number>;

export interface BlockFactors {
  rainProb: number;
  rainSum: number;
  wind: number;
  gust: number;
  temp: number;
  uv: number;
  cloud: number;
  /** Snow cover on the ground, cm. */
  depth: number;
  /** Fresh snowfall over the previous 48 h, cm. */
  fresh48: number;
  /** Peak ocean swell, metres — undefined away from the coast. */
  swell?: number;
  /** Mean tide level over the block, 0–1 — undefined away from the coast. */
  tideNorm?: number;
  /** Tide direction over the block: last hour minus first hour. */
  tideTrend?: number;
  sev: Severities;
}

export const ramp = (v: number, lo: number, hi: number): number =>
  v <= lo ? 0 : v >= hi ? 1 : (v - lo) / (hi - lo);

/** Aggregate hourly slices for one block into factor severities (0–1 each). */
export function blockFactors(hours: HourSlice[], fresh48: number, crit: Criteria): BlockFactors {
  const max = (k: keyof HourSlice) => Math.max(...hours.map((h) => h[k] ?? 0));
  const avg = (k: keyof HourSlice) => hours.reduce((a, h) => a + (h[k] ?? 0), 0) / hours.length;
  const { act } = crit;

  const rainProb = max('pprob');
  const rainSum = +hours.reduce((a, h) => a + h.precip, 0).toFixed(1);
  const wind = Math.round(max('wind'));
  const gust = Math.round(max('gust'));
  const temp = +avg('temp').toFixed(1);
  const uv = +max('uv').toFixed(1);
  const cloud = Math.round(avg('cloud'));
  const depth = Math.round(max('sdep') * 100);

  const swells = hours.map((h) => h.swell).filter((v): v is number => v != null);
  const tides = hours.map((h) => h.tide).filter((v): v is number => v != null);
  const swell = swells.length ? +Math.max(...swells).toFixed(1) : undefined;
  const tideNorm = tides.length
    ? +(tides.reduce((a, v) => a + v, 0) / tides.length).toFixed(2)
    : undefined;
  const tideTrend = tides.length
    ? +((tides.at(-1) ?? 0) - (tides[0] ?? 0)).toFixed(2)
    : undefined;

  const baseCm = (act.snowBase ?? 0) * 100;
  const sev: Severities = {
    rain: Math.max(ramp(rainProb, 30, 75), ramp(rainSum, 0.4, 4)),
    wind: Math.max(ramp(wind, 20, 45), ramp(gust, 38, 68)),
    cold: ramp(crit.tMin - temp, 0, 8),
    heat: ramp(temp - crit.tMax, 0, 8),
    uv: ramp(uv, 6, 9.5),
    snow: baseCm ? ramp(baseCm - depth, 0, baseCm) : 0,
    fresh: 1 - ramp(fresh48, 0, 15),
    // both stay 0 inland, so weights on water activities are inert there
    swell: swell != null ? ramp(swell, 0.5, 2.5) : 0,
    tide: tides.length ? Math.max(...tides) : 0,
  };
  // sailing-style: not enough wind is also bad
  if (act.windIdeal) {
    const [lo, hi] = act.windIdeal;
    sev.wind = Math.max(ramp(wind, hi, hi + 18), ramp(lo - wind, 0, lo));
  }
  return { rainProb, rainSum, wind, gust, temp, uv, cloud, depth, fresh48, swell, tideNorm, tideTrend, sev };
}

/** One number 0–100. Worst weighted factor dominates; others add a little. */
export function riskScore(
  f: { sev: Partial<Severities> },
  weights: Partial<Weights>,
  tolMult: number,
): number {
  const contribs = Object.entries(f.sev).map(
    ([k, sev]) => Math.min(1, (sev ?? 0) * tolMult) * ((weights[k as FactorKey] ?? 0) / 10),
  );
  const worst = Math.max(...contribs);
  const others = contribs.reduce((a, c) => a + c, 0) - worst;
  return Math.round(Math.min(1, worst + 0.18 * others) * 100);
}

export type Band = 'g' | 'y' | 'r';
export const riskBand = (s: number): Band => (s < 25 ? 'g' : s < 55 ? 'y' : 'r');
