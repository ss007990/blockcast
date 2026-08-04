// Nowcast analysis: the card only shows when precip is due within 2 h, names
// rain vs snow correctly, and totals accumulation over the 3 h window.

import { describe, expect, it } from 'vitest';
import { computeNowcast, precipStory } from '../src/core/nowcast';
import { fairHour, makeForecast } from './helpers';

const DAY = '2026-08-04';

/** Minutely series builder: 15-min steps from 10:00, values in mm. */
function withMinutely(precip: number[], rain?: number[], snow?: number[]) {
  const data = makeForecast([{ day: DAY }]);
  const time = precip.map((_, i) => {
    const mins = 10 * 60 + i * 15;
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    return `${DAY}T${h}:${m}`;
  });
  data.minutely = {
    time,
    precip,
    rain: rain ?? precip,
    snow: snow ?? precip.map(() => 0),
  };
  return data;
}

describe('computeNowcast', () => {
  it('is null when the next 2 h are dry', () => {
    // wet only at step 10 (2.5 h out) — beyond the 8-step lead window
    const precip = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2, 1.2];
    expect(computeNowcast(withMinutely(precip), `${DAY}T10:00`)).toBeNull();
  });

  it('reports rain starting at the first wet step', () => {
    const precip = [0, 0, 0, 0, 1.0, 1.4, 0.8, 0, 0, 0, 0, 0];
    const nc = computeNowcast(withMinutely(precip), `${DAY}T10:00`)!;
    expect(nc.kind).toBe('rain');
    expect(nc.startISO).toBe(`${DAY}T11:00`);
    expect(nc.rainMm).toBeCloseTo(3.2, 1);
  });

  it('reports ongoing precip with an end time', () => {
    const precip = [0.8, 0.9, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const nc = computeNowcast(withMinutely(precip), `${DAY}T10:00`)!;
    expect(nc.startISO).toBeNull();
    expect(nc.endISO).toBe(`${DAY}T10:45`);
  });

  it('names snow when snowfall dominates and totals it in cm', () => {
    const precip = [0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0];
    const rain = precip.map(() => 0);
    const snow = [0.6, 0.6, 0.6, 0.6, 0, 0, 0, 0, 0, 0, 0, 0];
    const nc = computeNowcast(withMinutely(precip, rain, snow), `${DAY}T10:00`)!;
    expect(nc.kind).toBe('snow');
    expect(nc.snowCm).toBeCloseTo(2.4, 1);
    // the bar strip plots cm of snow, matching the accumulation unit
    expect(nc.bars[0]).toBeCloseTo(0.6, 2);
  });

  it('plots rain bars in mm of total precipitation', () => {
    const precip = [1.0, 1.4, 0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const nc = computeNowcast(withMinutely(precip), `${DAY}T10:00`)!;
    expect(nc.bars[1]).toBeCloseTo(1.4, 2);
  });

  it('is null without a minutely series (worker data, stale cache)', () => {
    const data = makeForecast([{ day: DAY }]);
    expect(computeNowcast(data, `${DAY}T10:00`)).toBeNull();
  });
});

describe('precipStory', () => {
  const dry = () => fairHour();
  const wet = (over = {}) => fairHour({ pprob: 80, precip: 1.2, ...over });

  it('dry all day', () => {
    const day = Array.from({ length: 24 }, dry);
    expect(precipStory(day, 8)).toEqual({ type: 'dry' });
  });

  it('rain starting later', () => {
    const day = Array.from({ length: 24 }, (_, h) => (h >= 15 ? wet() : dry()));
    expect(precipStory(day, 8)).toEqual({ type: 'start', kind: 'rain', hour: 15 });
  });

  it('current rain ending', () => {
    const day = Array.from({ length: 24 }, (_, h) => (h <= 11 ? wet() : dry()));
    expect(precipStory(day, 9)).toEqual({ type: 'end', kind: 'rain', hour: 12 });
  });

  it('calls it snow on snow codes', () => {
    const day = Array.from({ length: 24 }, (_, h) => (h >= 15 ? wet({ code: 73 }) : dry()));
    expect(precipStory(day, 8)).toEqual({ type: 'start', kind: 'snow', hour: 15 });
  });
});
