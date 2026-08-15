// The hero panel's contrast floor. The sky colour is derived from live data —
// sun angle, cloud, rain — so the only way to keep the white type legible in
// every season is to pin the gradient's luminance rather than eyeball it.

import { describe, expect, it } from 'vitest';
import type { HourSlice } from '../src/core/scoring';
import { paintSky, skyCard, skyNow } from '../src/features/home/sky';

const DAY = '2026-08-04';
const PANEL_INK = 1.05; // relative luminance of #f7f9fd + 0.05, for the ratio

/** WCAG relative luminance of "rgb(r g b)". */
function lumOf(rgb: string): number {
  const [r = 0, g = 0, b = 0] = (rgb.match(/\d+/g) ?? []).map(Number);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const stopsOf = (gradient: string): string[] => gradient.match(/rgb\([^)]+\)/g) ?? [];
const lumsOf = (gradient: string): number[] => stopsOf(gradient).map(lumOf);

/** Hue in degrees, for checking the cards track the panel's colour. */
function hueOf(rgb: string): number {
  const [r = 0, g = 0, b = 0] = (rgb.match(/\d+/g) ?? []).map(Number);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (Math.round(h * 60) + 360) % 360;
}

function slice(cloud: number, pprob: number): HourSlice {
  return { temp: 15, pprob, precip: 0, wind: 5, gust: 8, cloud, uv: 3, sdep: 0 };
}

/** Every hour of a day, at one cloud/rain condition. */
const day = (cloud: number, pprob: number) =>
  Array.from({ length: 24 }, () => slice(cloud, pprob));

describe('skyNow', () => {
  it('keeps white type above 4.5:1 at every hour, in every condition', () => {
    for (const cloud of [0, 40, 100]) {
      for (const pprob of [0, 50, 100]) {
        // sunrise and sunset swept across the year, from midwinter to midsummer
        for (const [rise, set] of [
          ['07:35', '16:10'],
          ['05:41', '19:57'],
          ['04:58', '20:48'],
        ]) {
          for (let h = 0; h < 24; h++) {
            const g = skyNow(day(cloud, pprob), h, `${DAY}T${rise}`, `${DAY}T${set}`);
            for (const stop of stopsOf(g)) {
              const ratio = PANEL_INK / (lumOf(stop) + 0.05);
              expect(ratio, `${stop} at ${h}h cloud=${cloud} pprob=${pprob}`).toBeGreaterThan(4.5);
            }
          }
        }
      }
    }
  });

  it('lifts a midwinter night clear of the page behind it', () => {
    // --bg in dark mode is #0c0d0f, luminance ~0.004
    const lightest = Math.max(...lumsOf(skyNow(day(0, 0), 2, `${DAY}T07:35`, `${DAY}T16:10`)));
    expect(lightest).toBeGreaterThan(0.015);
  });

  it('paints a darker zenith than horizon', () => {
    const [zenith = 0, , horizon = 0] = lumsOf(
      skyNow(day(0, 0), 13, `${DAY}T05:41`, `${DAY}T19:57`),
    );
    expect(zenith).toBeLessThan(horizon);
  });

  it('keeps blue skies blue rather than indigo', () => {
    // What made the panel read purple was blue towering over green: the night
    // constant sat at a 2.4 ratio, and lifting a dark sky amplified it. Below
    // ~1.9 the colour reads as navy or slate; above it, as indigo.
    for (const cloud of [0, 50, 100]) {
      for (let h = 0; h < 24; h++) {
        for (const stop of stopsOf(skyNow(day(cloud, 0), h, `${DAY}T05:41`, `${DAY}T19:57`))) {
          const [r = 0, g = 0, b = 0] = (stop.match(/\d+/g) ?? []).map(Number);
          if (b <= r || b <= g) continue; // warm twilight, not a blue sky
          expect(b / g, `${stop} at ${h}h cloud=${cloud}`).toBeLessThan(1.9);
        }
      }
    }
  });
});

describe('skyCard', () => {
  it('shares the panel’s hue so the cards never clash with the hero', () => {
    for (const h of [2, 8, 13, 18, 22]) {
      const [panel = ''] = stopsOf(skyNow(day(20, 0), h, `${DAY}T05:41`, `${DAY}T19:57`)).slice(-1);
      const [card = ''] = stopsOf(skyCard(day(20, 0), h, `${DAY}T05:41`, `${DAY}T19:57`)).slice(1, 2);
      expect(Math.abs(hueOf(card) - hueOf(panel)), `${h}h: ${card} vs ${panel}`).toBeLessThan(12);
    }
  });

  it('sits a step lighter than the panel, so the hero stays the anchor', () => {
    for (const h of [2, 13, 22]) {
      const panel = Math.max(...lumsOf(skyNow(day(0, 0), h, `${DAY}T05:41`, `${DAY}T19:57`)));
      const card = Math.max(...lumsOf(skyCard(day(0, 0), h, `${DAY}T05:41`, `${DAY}T19:57`)));
      expect(card, `${h}h`).toBeGreaterThan(panel);
    }
  });

  it('keeps its own type above 4.5:1', () => {
    for (const cloud of [0, 60, 100]) {
      for (let h = 0; h < 24; h++) {
        for (const stop of stopsOf(skyCard(day(cloud, 0), h, `${DAY}T05:41`, `${DAY}T19:57`))) {
          expect(PANEL_INK / (lumOf(stop) + 0.05), `${stop} at ${h}h`).toBeGreaterThan(4.5);
        }
      }
    }
  });
});

describe('paintSky', () => {
  it('spans hFrom to hTo with one stop per hour', () => {
    const g = paintSky(day(0, 0), 6, 22, `${DAY}T05:41`, `${DAY}T19:57`);
    expect(stopsOf(g)).toHaveLength(17);
    expect(g).toContain('0.0%');
    expect(g).toContain('100.0%');
  });

  it('stays saturated — the ribbon carries no type, so it keeps full colour', () => {
    const [noon = 0] = lumsOf(paintSky(day(0, 0), 12, 13, `${DAY}T05:41`, `${DAY}T19:57`));
    expect(noon).toBeGreaterThan(0.25);
  });
});
