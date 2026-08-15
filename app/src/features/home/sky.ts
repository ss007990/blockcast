// Two views of the same sky maths, both pure so the hero re-paints from live
// data on every refresh.
//
// `paintSky` is the horizontal ribbon: left edge is the first shown hour, right
// edge the last, one stop per hour, derived from the sun's position (night →
// alpenglow → azure) and shaded by that hour's cloud cover and rain. Nothing
// sits on top of it, so it keeps its full saturation.
//
// `skyNow` is the panel behind the hero's type: the sky at this hour only, laid
// out vertically — zenith above, horizon below — and pinned to a luminance band
// so white text clears 4.5:1 at every hour of every season.

import type { HourSlice } from '../../core/scoring';
import { ramp } from '../../core/scoring';

type RGB = readonly [number, number, number];

// blue channels stay close to green: pushed further apart these read violet
// rather than as sky, and the panel amplifies whatever bias is in the constant
const NIGHT: RGB = [14, 21, 38];
const ROSE: RGB = [118, 84, 88]; // alpenglow shoulder
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

const css = (c: RGB): string => `rgb(${c.map(Math.round).join(' ')})`;

const scaleRGB = (c: RGB, k: number): RGB => [
  Math.min(255, c[0] * k),
  Math.min(255, c[1] * k),
  Math.min(255, c[2] * k),
];

/** WCAG relative luminance of an sRGB triple. */
function relLum(c: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

/**
 * The hero's contrast floor. The lightest stop stays under MAX_LUM so #f7f9fd
 * reads at ~7:1; the darkest gets lifted to MIN_LUM so a midwinter night still
 * separates from the page behind it.
 */
const MAX_LUM = 0.1;
const MIN_LUM = 0.022;

/** Cards sit a step lighter than the panel, so the hero stays the anchor. */
const CARD_MAX = 0.115;
const CARD_MIN = 0.032;

/** Pull a colour partway toward its own neutral. */
const desaturate = (c: RGB, t: number): RGB => {
  const grey = (c[0] + c[1] + c[2]) / 3;
  return mix(c, [grey, grey, grey], t);
};

/** Scale a colour until its luminance lands in [min, max]. Hue is untouched. */
function clampLum(c: RGB, min: number, max: number): RGB {
  const l = relLum(c);
  if (l >= min && l <= max) return c;
  const target = l > max ? max : min;
  // luminance rises monotonically with the scale factor, so bisect for it
  let lo = 0;
  let hi = 12;
  for (let i = 0; i < 20; i++) {
    const k = (lo + hi) / 2;
    if (relLum(scaleRGB(c, k)) > target) hi = k;
    else lo = k;
  }
  return scaleRGB(c, (lo + hi) / 2);
}

function clearSkyAt(h: number, rise: number, set: number): RGB {
  if (h <= rise - TWILIGHT || h >= set + TWILIGHT) return NIGHT;
  const twilight = (t: number) => (t < 0.5 ? mix(NIGHT, ROSE, t * 2) : mix(ROSE, GOLD, t * 2 - 1));
  if (h < rise + TWILIGHT) return twilight((h - (rise - TWILIGHT)) / (2 * TWILIGHT));
  if (h > set - TWILIGHT) return twilight((set + TWILIGHT - h) / (2 * TWILIGHT));
  const elevation = Math.sin(Math.PI * (h - rise) / (set - rise));
  return mix(DAY_LOW, DAY_HIGH, elevation);
}

/** The sky at one hour, cloud- and rain-shaded. */
function skyAt(
  slices: readonly (HourSlice | undefined)[],
  h: number,
  rise: number,
  set: number,
): RGB {
  let c = clearSkyAt(h, rise, set);
  const s = slices[Math.max(0, Math.min(Math.round(h), 23))];
  if (s) {
    c = mix(c, CLOUD, (s.cloud / 100) * 0.55);
    c = mix(c, RAIN, ramp(s.pprob, 25, 90) * 0.5);
  }
  return c;
}

/**
 * Build the hero panel's background: this hour's sky, vertically, held inside
 * the contrast band. `hour` may be fractional.
 */
export function skyNow(
  slices: readonly (HourSlice | undefined)[],
  hour: number,
  sunrise?: string,
  sunset?: string,
): string {
  const rise = sunrise ? isoHour(sunrise) : 6;
  const set = sunset ? isoHour(sunset) : 20;
  // the ribbon keeps full colour; the panel sits behind type, so it comes back
  // a step toward neutral before the luminance clamp
  const toned = desaturate(skyAt(slices, hour, rise, set), 0.18);
  const horizon = clampLum(toned, MIN_LUM, MAX_LUM);
  const zenith = scaleRGB(horizon, 0.58);
  const middle = scaleRGB(horizon, 0.79);
  return `linear-gradient(180deg, ${css(zenith)} 0%, ${css(middle)} 54%, ${css(horizon)} 100%)`;
}

/**
 * The radar/cams cards. Same sky, same hour, flattened further and allowed to
 * sit a step lighter than the panel — so the cards read as related to the hero
 * at every hour rather than as a fixed blue that clashes with it.
 */
export function skyCard(
  slices: readonly (HourSlice | undefined)[],
  hour: number,
  sunrise?: string,
  sunset?: string,
): string {
  const rise = sunrise ? isoHour(sunrise) : 6;
  const set = sunset ? isoHour(sunset) : 20;
  const base = clampLum(desaturate(skyAt(slices, hour, rise, set), 0.34), CARD_MIN, CARD_MAX);
  return `linear-gradient(150deg, ${css(scaleRGB(base, 1.08))}, ${css(base)} 62%, ${css(scaleRGB(base, 0.84))})`;
}

/**
 * Build the day ribbon for one day.
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
    const pct = (((h - hFrom) / span) * 100).toFixed(1);
    stops.push(`${css(skyAt(slices, h, rise, set))} ${pct}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
