// Fixture builder: a ForecastData covering the given days with a base hour
// pattern and per-day overrides. Keeps suggestion/season tests readable.

import type { ForecastData } from '../src/core/forecast';
import type { HourSlice } from '../src/core/scoring';

export const fairHour = (over: Partial<HourSlice> = {}): HourSlice => ({
  temp: 20,
  pprob: 0,
  precip: 0,
  wind: 5,
  gust: 10,
  cloud: 10,
  uv: 3,
  sdep: 0,
  ...over,
});

export interface DaySpec {
  day: string;
  /** Base slice for every hour of the day. */
  base?: Partial<HourSlice>;
  /** Per-hour overrides, e.g. { 14: { pprob: 90 } }. */
  hours?: Record<number, Partial<HourSlice>>;
  /** Hourly snowfall (cm) for the day, defaults to 0. */
  snowfallPerHour?: number;
}

export function makeForecast(specs: DaySpec[], pastDays = 0): ForecastData {
  const days: ForecastData['days'] = {};
  const timeIndex = new Map<string, number>();
  const snowfall: number[] = [];
  let i = 0;
  for (const spec of specs) {
    const arr: (HourSlice | undefined)[] = [];
    for (let h = 0; h < 24; h++) {
      arr[h] = fairHour({ ...spec.base, ...spec.hours?.[h] });
      timeIndex.set(`${spec.day}T${String(h).padStart(2, '0')}:00`, i);
      snowfall.push(spec.snowfallPerHour ?? 0);
      i++;
    }
    days[spec.day] = arr;
  }
  return {
    days,
    daily: {
      time: specs.map((s) => s.day),
      weather_code: specs.map(() => 0),
      apparent_temperature_max: specs.map(() => 20),
      apparent_temperature_min: specs.map(() => 10),
      sunrise: specs.map((s) => `${s.day}T05:30`),
      sunset: specs.map((s) => `${s.day}T20:30`),
    },
    timezone: 'America/Toronto',
    utcOffsetSeconds: -4 * 3600,
    timeIndex,
    snowfall,
    pastDays,
  };
}
