import { describe, expect, it } from 'vitest';
import { criteriaFrom, TOL_MULT, type ActivityId } from '../src/core/activities';
import { bestWindows, snowfallEvent, type SuggestOptions } from '../src/core/suggestions';
import { makeForecast } from './helpers';

const opts = (over: Partial<SuggestOptions> = {}): SuggestOptions => ({
  activities: ['tennis'] as ActivityId[],
  critFor: (id) => criteriaFrom(id),
  tolMult: TOL_MULT.balanced,
  blockLen: 4,
  hFrom: 6,
  hTo: 20,
  todayISO: '2026-07-20',
  nowHour: 8,
  ...over,
});

describe('bestWindows', () => {
  it('finds green windows and skips rainy days', () => {
    const data = makeForecast([
      { day: '2026-07-20' },
      { day: '2026-07-21', base: { pprob: 95, precip: 3 } }, // washout
      { day: '2026-07-22' },
    ]);
    const wins = bestWindows(data, opts());
    expect(wins.length).toBeGreaterThan(0);
    expect(wins.every((w) => w.band === 'g')).toBe(true);
    expect(wins.some((w) => w.day === '2026-07-21')).toBe(false);
  });

  it('returns at most one window per activity per day', () => {
    const data = makeForecast([{ day: '2026-07-20' }, { day: '2026-07-21' }]);
    const wins = bestWindows(data, opts());
    const perDay = new Map<string, number>();
    for (const w of wins) perDay.set(w.day, (perDay.get(w.day) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBe(1);
  });

  it('skips blocks already over today', () => {
    const data = makeForecast([{ day: '2026-07-20' }]);
    const wins = bestWindows(data, opts({ nowHour: 19 }));
    expect(wins.every((w) => w.h + w.len > 19)).toBe(true);
  });

  it('marks weekend windows', () => {
    // 2026-07-25 is a Saturday
    const data = makeForecast([{ day: '2026-07-25' }]);
    const wins = bestWindows(data, opts({ todayISO: '2026-07-25', nowHour: 0 }));
    expect(wins[0]?.isWeekend).toBe(true);
  });

  it('returns an empty list when nothing qualifies', () => {
    const data = makeForecast([{ day: '2026-07-20', base: { pprob: 100, precip: 5 } }]);
    expect(bestWindows(data, opts())).toEqual([]);
  });
});

describe('snowfallEvent', () => {
  it('triggers for a big forecasted snowfall when winter activities are candidates', () => {
    const data = makeForecast([
      { day: '2026-01-10', base: { temp: -5, sdep: 0.3 }, snowfallPerHour: 0.5 },
      { day: '2026-01-11', base: { temp: -5, sdep: 0.3 }, snowfallPerHour: 0.5 },
    ]);
    const ev = snowfallEvent(data, '2026-01-10', 8, ['skiing', 'snowmob', 'tennis']);
    expect(ev).not.toBeNull();
    expect(ev!.totalCm).toBeGreaterThanOrEqual(5);
    expect(ev!.activities).toEqual(['skiing', 'snowmob']);
  });

  it('stays quiet below the threshold', () => {
    const data = makeForecast([{ day: '2026-01-10', snowfallPerHour: 0.05 }]);
    expect(snowfallEvent(data, '2026-01-10', 8, ['skiing'])).toBeNull();
  });

  it('stays quiet when no winter activity is a candidate', () => {
    const data = makeForecast([{ day: '2026-01-10', snowfallPerHour: 1 }]);
    expect(snowfallEvent(data, '2026-01-10', 8, ['tennis'])).toBeNull();
  });
});
