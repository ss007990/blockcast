import { describe, expect, it } from 'vitest';
import { isWinter, orderActivities, seasonSignals, winterScore } from '../src/core/season';
import { makeForecast } from './helpers';

describe('winterScore', () => {
  it('deep Québec winter scores high', () => {
    expect(
      winterScore({ lat: 46.8, month: 0, weekMaxTemp: -8, weekMaxSnowCm: 40 }),
    ).toBeGreaterThanOrEqual(0.9);
  });
  it('Québec July scores ~0', () => {
    expect(winterScore({ lat: 46.8, month: 6, weekMaxTemp: 28, weekMaxSnowCm: 0 })).toBeLessThan(
      0.2,
    );
  });
  it('southern hemisphere flips the calendar: Patagonia July with snow is winter', () => {
    expect(
      isWinter({ lat: -41.1, month: 6, weekMaxTemp: 2, weekMaxSnowCm: 20 }),
    ).toBe(true);
  });
  it('snow on the ground forces winter even in an odd month', () => {
    expect(isWinter({ lat: 46.8, month: 9, weekMaxTemp: 4, weekMaxSnowCm: 25 })).toBe(true);
  });
});

describe('seasonSignals', () => {
  it('reads max temp and snow depth from the forecast', () => {
    const data = makeForecast([{ day: '2026-01-10', base: { temp: -5, sdep: 0.3 } }]);
    const s = seasonSignals(data, 46.8, '2026-01-10');
    expect(s.month).toBe(0);
    expect(s.weekMaxTemp).toBe(-5);
    expect(s.weekMaxSnowCm).toBeCloseTo(30);
  });
});

describe('orderActivities', () => {
  it('puts winter sports first in winter, last in summer', () => {
    const winter = orderActivities(true);
    expect(winter.slice(0, 2).sort()).toEqual(['skiing', 'snowmob']);
    const summer = orderActivities(false);
    expect(summer.slice(-2).sort()).toEqual(['skiing', 'snowmob']);
  });
  it('never drops an activity', () => {
    expect(orderActivities(true)).toHaveLength(10);
    expect(orderActivities(false)).toHaveLength(10);
  });
});
