import { describe, expect, it } from 'vitest';
import { ACTIVITY_IDS } from '../src/core/activities';
import {
  groupActivities,
  inSeason,
  isWinter,
  orderActivities,
  seasonSignals,
  winterScore,
} from '../src/core/season';
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

describe('groupActivities', () => {
  it('winter: powersports leads with the snowmobile in season, moto off-season', () => {
    const groups = groupActivities(true);
    expect(groups[0]!.cat).toBe('powersports');
    expect(groups[0]!.inSeason).toContain('snowmob');
    expect(groups[0]!.inSeason).toContain('utv');
    expect(groups[0]!.offSeason).toContain('motorcycle');
    expect(groups[1]!.cat).toBe('snow');
  });
  it('summer: snow and skiing are off-season, moto and UTV ride', () => {
    const groups = groupActivities(false);
    const power = groups.find((g) => g.cat === 'powersports')!;
    expect(power.inSeason).toEqual(['motorcycle', 'utv']);
    expect(power.offSeason).toEqual(['snowmob']);
    const snow = groups.find((g) => g.cat === 'snow')!;
    expect(snow.inSeason).toHaveLength(0);
    expect(snow.offSeason).toEqual(['skiing']);
  });
  it('summer: groups with nothing in season sink to the end', () => {
    const groups = groupActivities(false);
    expect(groups[groups.length - 1]!.cat).toBe('snow');
  });
  it('all-season activities are always in season', () => {
    for (const winter of [true, false]) {
      expect(inSeason('hiking', winter)).toBe(true);
      expect(inSeason('fishing', winter)).toBe(true);
    }
  });
});

describe('orderActivities', () => {
  it('puts winter sports up front in winter, last in summer', () => {
    const winter = orderActivities(true);
    expect(winter.indexOf('snowmob')).toBeLessThan(winter.indexOf('hiking'));
    expect(winter.indexOf('tennis')).toBeGreaterThan(winter.indexOf('skiing'));
    const summer = orderActivities(false);
    expect(summer.slice(-2)).toEqual(expect.arrayContaining(['skiing', 'snowmob']));
  });
  it('never drops an activity', () => {
    expect(orderActivities(true)).toHaveLength(ACTIVITY_IDS.length);
    expect(orderActivities(false)).toHaveLength(ACTIVITY_IDS.length);
    expect(new Set(orderActivities(true)).size).toBe(ACTIVITY_IDS.length);
  });
});
