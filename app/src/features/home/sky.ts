// Paints today's sky as one CSS gradient: left edge is the first shown hour,
// right edge the last. Each hourly stop derives from the sun's position
// (night → alpenglow → azure) shaded by that hour's cloud cover and rain.
// Pure function so the hero re-paints from live data on every refresh.

import type { HourSlice } from '../../core/scoring';
import { ramp } from '../../core/scoring';

type RGB = readonly [number, number, number];

const NIGHT: RGB = [13, 17, 41];
const ROSE: RGB = [116, 78, 100]; // alpenglow shoulder
const GOLD: RGB = [211, 141, 88]; // horizon at sunrise/sunset
const DAY_LOW: RGB = [66, 116, 194]; // low sun azure
const DAY_HIGH: RGB = [116, 162, 224]; // midday
const CLOUD: RGB = [122, 131, 143];
const RAIN: RGB = [58, 72, 90];

/** Half-width, in hours, of the dawn/dusk colour transition. */
const TWILIGHT = 1.25;

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** "2026-07-19T05:10" → 5.17 (fractional local hour). */
const isoHour = (iso: string): number => +iso.slice(11, 13) + +iso.slice(14, 16) / 60;

function clearSkyAt(h: number, rise: number, set: number): RGB {
  if (h <= rise - TWILIGHT || h >= set + TWILIGHT) return NIGHT;
  const twilight = (t: number) => (t < 0.5 ? mix(NIGHT, ROSE, t * 2) : mix(ROSE, GOLD, t * 2 - 1));
  if (h < rise + TWILIGHT) return twilight((h - (rise - TWILIGHT)) / (2 * TWILIGHT));
  if (h > set - TWILIGHT) return twilight((set + TWILIGHT - h) / (2 * TWILIGHT));
  const elevation = Math.sin(Math.PI * (h - rise) / (set - rise));
  return mix(DAY_LOW, DAY_HIGH, elevation);
}

/**
 * Build the hero gradient for one day.
 * `slices` is the day's sparse hour array (index = hour 0–23).
 */
export function paintSky(
  slices: readonly (HourSlice | undefined)[],
  hFrom: number,
  hTo: number,
  sunrise?: string,
  sunset?: string,
): string {
  const rise = sunrise ? isoHour(sunrise) : 6;
  const set = sunset ? isoHour(sunset) : 20;
  const span = Math.max(1, hTo - hFrom);

  const stops: string[] = [];
  for (let h = hFrom; h <= hTo; h++) {
    let c = clearSkyAt(h, rise, set);
    const s = slices[Math.min(h, 23)];
    if (s) {
      c = mix(c, CLOUD, (s.cloud / 100) * 0.55);
      c = mix(c, RAIN, ramp(s.pprob, 25, 90) * 0.5);
    }
    const pct = (((h - hFrom) / span) * 100).toFixed(1);
    stops.push(`rgb(${c.map(Math.round).join(' ')}) ${pct}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
