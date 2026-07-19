import { describe, expect, it } from 'vitest';
import { ACTIVITIES, TOL_MULT, criteriaFrom, type ActivityId } from '../src/core/activities';
import { blockFactors, ramp, riskBand, riskScore, type HourSlice } from '../src/core/scoring';

// a comfortable hour for a summer sport
const hour = (over: Partial<HourSlice> = {}): HourSlice => ({
  temp: 20,
  pprob: 0,
  precip: 0,
  wind: 5,
  gust: 10,
  cloud: 0,
  uv: 2,
  sdep: 0,
  ...over,
});
const crit = (id: ActivityId) => criteriaFrom(id);

describe('ramp', () => {
  it('interpolates between lo and hi', () => {
    expect(ramp(5, 0, 10)).toBe(0.5);
    expect(ramp(-1, 0, 10)).toBe(0);
    expect(ramp(11, 0, 10)).toBe(1);
  });
});

describe('riskBand', () => {
  it('splits at 25 and 55', () => {
    expect(riskBand(24)).toBe('g');
    expect(riskBand(25)).toBe('y');
    expect(riskBand(54)).toBe('y');
    expect(riskBand(55)).toBe('r');
  });
});

describe('blockFactors', () => {
  it('scores a perfect hour as zero severity', () => {
    const f = blockFactors([hour()], 0, crit('tennis'));
    expect(f.sev.rain).toBe(0);
    expect(f.sev.wind).toBe(0);
    expect(f.sev.cold).toBe(0);
    expect(f.sev.heat).toBe(0);
  });
  it('maxes rain severity in a downpour', () => {
    expect(blockFactors([hour({ pprob: 100, precip: 10 })], 0, crit('tennis')).sev.rain).toBe(1);
  });
  it('maxes cold severity when freezing', () => {
    expect(blockFactors([hour({ temp: 2 })], 0, crit('tennis')).sev.cold).toBe(1);
  });
  it('maxes heat severity in a heatwave', () => {
    expect(blockFactors([hour({ temp: 40 })], 0, crit('tennis')).sev.heat).toBe(1);
  });
  it('sailing: a dead calm is as bad as a storm', () => {
    expect(blockFactors([hour({ wind: 0, gust: 0 })], 0, crit('sailing')).sev.wind).toBe(1);
  });
  it('skiing: thin snow base is a risk, a solid base is not', () => {
    expect(blockFactors([hour({ temp: -5 })], 0, crit('skiing')).sev.snow).toBe(1);
    expect(blockFactors([hour({ temp: -5, sdep: 0.5 })], 0, crit('skiing')).sev.snow).toBe(0);
  });
});

describe('riskScore', () => {
  const f = { sev: { rain: 0.5 } };
  it('scales severity by tolerance', () => {
    expect(riskScore(f, { rain: 10 }, TOL_MULT.balanced)).toBe(50);
    expect(riskScore(f, { rain: 10 }, TOL_MULT.tolerant)).toBe(34);
    expect(riskScore(f, { rain: 10 }, TOL_MULT.cautious)).toBe(65);
  });
  it('ignores weight-0 factors', () => {
    expect(riskScore({ sev: { rain: 1 } }, { rain: 0 }, 1)).toBe(0);
  });
  it('scores a perfect tennis block 0', () => {
    const fGood = blockFactors([hour()], 0, crit('tennis'));
    expect(riskScore(fGood, ACTIVITIES.tennis.w, TOL_MULT.balanced)).toBe(0);
  });
});
