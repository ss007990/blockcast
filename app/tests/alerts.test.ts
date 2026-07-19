import { describe, expect, it } from 'vitest';
import { detectChanges, planKey, type PlannedSession } from '../src/core/alerts';

const session = (over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: 1,
  activityId: 'tennis',
  day: '2026-07-20',
  h: 6,
  len: 4,
  locName: 'Québec',
  lat: 46.8,
  lon: -71.2,
  baseScore: 10,
  baseBand: 'g',
  ...over,
});

describe('planKey', () => {
  it('zero-pads hours so 6:00 sorts before 12:00', () => {
    expect(planKey({ day: '2026-07-20', h: 6 }) < planKey({ day: '2026-07-20', h: 12 })).toBe(true);
    expect(planKey({ day: '2026-07-20', h: 22 }) < planKey({ day: '2026-07-21', h: 2 })).toBe(true);
  });
});

describe('detectChanges', () => {
  it('flags a worsened session', () => {
    const alerts = detectChanges([session()], () => ({ score: 70, band: 'r' }), 1000);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.kind).toBe('worsened');
    expect(alerts[0]!.fromBand).toBe('g');
    expect(alerts[0]!.toBand).toBe('r');
  });
  it('flags an improved session', () => {
    const alerts = detectChanges([session({ baseBand: 'r', baseScore: 70 })], () => ({
      score: 10,
      band: 'g',
    }), 1000);
    expect(alerts[0]!.kind).toBe('improved');
  });
  it('stays quiet when the band is unchanged', () => {
    expect(detectChanges([session()], () => ({ score: 20, band: 'g' }), 1000)).toEqual([]);
  });
  it('skips sessions without data or baseline', () => {
    expect(detectChanges([session({ baseBand: null })], () => ({ score: 90, band: 'r' }), 1)).toEqual(
      [],
    );
    expect(detectChanges([session()], () => null, 1)).toEqual([]);
  });
});
