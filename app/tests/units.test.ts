import { describe, expect, it } from 'vitest';
import {
  cToF,
  formatDepth,
  formatHour,
  formatHourRange,
  formatPrecip,
  formatSpeed,
  formatTemp,
  kmhToMph,
} from '../src/core/units';

describe('conversions', () => {
  it('converts °C to °F', () => {
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
  });
  it('converts km/h to mph', () => {
    expect(kmhToMph(100)).toBeCloseTo(62.14, 1);
  });
});

describe('formatting', () => {
  it('formats temperature per unit system', () => {
    expect(formatTemp(20, 'metric')).toBe('20°');
    expect(formatTemp(20, 'imperial')).toBe('68°');
  });
  it('formats speed', () => {
    expect(formatSpeed(30, 'metric')).toBe('30 km/h');
    expect(formatSpeed(30, 'imperial')).toBe('19 mph');
  });
  it('formats precipitation and depth', () => {
    expect(formatPrecip(2.5, 'metric')).toBe('2.5 mm');
    expect(formatPrecip(25.4, 'imperial')).toBe('1 in');
    expect(formatDepth(30, 'metric')).toBe('30 cm');
    expect(formatDepth(2.54, 'imperial')).toBe('1 in');
  });
  it('formats hours in both clocks', () => {
    expect(formatHour(6, '24h')).toBe('06:00');
    expect(formatHour(24, '24h')).toBe('24:00');
    expect(formatHour(0, '12h')).toBe('12 AM');
    expect(formatHour(12, '12h')).toBe('12 PM');
    expect(formatHour(15, '12h')).toBe('3 PM');
    expect(formatHourRange(14, 18, '24h')).toBe('14:00 – 18:00');
    expect(formatHourRange(14, 18, '12h')).toBe('2 PM – 6 PM');
  });
});
