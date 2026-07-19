import { describe, expect, it } from 'vitest';
import {
  distKm,
  expandLocAbbrev,
  normTxt,
  parseLocQuery,
  rankLocResults,
  type GeoResult,
} from '../src/core/geo';

const sherbrooke = { lat: 45.4, lon: -71.9 };
const almas: GeoResult[] = [
  {
    name: 'Alma',
    admin1: 'Georgia',
    country: 'United States',
    country_code: 'US',
    latitude: 31.54,
    longitude: -82.46,
    population: 3536,
  },
  {
    name: 'Almaty',
    admin1: 'Almaty',
    country: 'Kazakhstan',
    country_code: 'KZ',
    latitude: 43.25,
    longitude: 76.92,
    population: 1977011,
  },
  {
    name: 'Alma',
    admin1: 'Québec',
    country: 'Canada',
    country_code: 'CA',
    latitude: 48.55,
    longitude: -71.65,
    population: 29526,
  },
  {
    name: 'Alma',
    admin1: 'Nebraska',
    country: 'United States',
    country_code: 'US',
    latitude: 40.1,
    longitude: -99.36,
    population: 1146,
  },
];

describe('normTxt', () => {
  it('lowercases and strips accents', () => {
    expect(normTxt('Québec ')).toBe('quebec');
  });
});

describe('expandLocAbbrev', () => {
  it('expands St/Ste/Ft/Mt before a space or hyphen', () => {
    expect(expandLocAbbrev('Port St Lucie')).toBe('Port Saint Lucie');
    expect(expandLocAbbrev('Port St. Lucie')).toBe('Port Saint Lucie');
    expect(expandLocAbbrev('Ste-Foy')).toBe('Sainte-Foy');
    expect(expandLocAbbrev('Ft Lauderdale')).toBe('Fort Lauderdale');
    expect(expandLocAbbrev('Mt Vernon')).toBe('Mount Vernon');
  });
  it('leaves other names alone', () => {
    expect(expandLocAbbrev('Stockholm')).toBe('Stockholm');
    expect(expandLocAbbrev('Fte Ville')).toBe('Fte Ville');
  });
});

describe('parseLocQuery', () => {
  it('parses a plain query', () => {
    expect(parseLocQuery('Geneva')).toEqual({ name: 'Geneva', qual: '' });
  });
  it('splits off a region qualifier', () => {
    expect(parseLocQuery('Alma, Qc')).toEqual({ name: 'Alma', qual: 'qc' });
  });
});

describe('distKm', () => {
  it('Sherbrooke → Alma QC is ≈ 350 km', () => {
    const d = distKm(sherbrooke, { lat: 48.55, lon: -71.65 });
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(400);
  });
});

describe('rankLocResults', () => {
  it("filters to Québec for a 'Qc' qualifier", () => {
    expect(rankLocResults(almas, 'Alma', 'qc', sherbrooke).map((x) => x.country_code)).toEqual([
      'CA',
    ]);
  });
  it('ranks Alma QC first from Sherbrooke, exact matches before fuzzy', () => {
    expect(rankLocResults(almas, 'Alma', '', sherbrooke).map((x) => x.admin1)).toEqual([
      'Québec',
      'Georgia',
      'Nebraska',
      'Almaty',
    ]);
  });
  it('lets population decide without a reference point', () => {
    expect(rankLocResults(almas, 'Alma', '', null).map((x) => x.admin1)).toEqual([
      'Québec',
      'Georgia',
      'Nebraska',
      'Almaty',
    ]);
  });
  it('falls back to all results for an unmatched qualifier', () => {
    expect(rankLocResults(almas, 'Alma', 'zz', sherbrooke)).toHaveLength(4);
  });
  it('accepts a full province name', () => {
    expect(rankLocResults(almas, 'Alma', 'quebec', sherbrooke).map((x) => x.country_code)).toEqual([
      'CA',
    ]);
  });
});
