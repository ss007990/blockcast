import { describe, expect, it } from 'vitest';
import { locKey } from '../src/check';

describe('locKey', () => {
  it('snaps to a 0.05 degree grid so neighbours share one forecast fetch', () => {
    // ~1 km apart in Montréal: one fetch, not two
    expect(locKey(45.503, -73.567)).toBe(locKey(45.512, -73.572));
    expect(locKey(45.503, -73.567)).toBe('45.50,-73.55');
  });

  it('keeps places further apart than the cell on separate fetches', () => {
    // Montréal vs Laval, ~15 km: genuinely different weather
    expect(locKey(45.5, -73.57)).not.toBe(locKey(45.61, -73.71));
  });

  it('formats consistently across the equator and prime meridian', () => {
    expect(locKey(0, 0)).toBe('0.00,0.00');
    expect(locKey(-0.01, -0.01)).toBe('0.00,0.00'); // no "-0.00" keys
    expect(locKey(-33.87, 151.21)).toBe('-33.85,151.20');
  });
});
