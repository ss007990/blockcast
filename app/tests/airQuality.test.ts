// Two indexes, one advice band. AQHI is ECCC's formula over 3-hour means;
// the US AQI arrives precomputed and only needs its EPA breakpoints mapped.

import { describe, expect, it, vi } from 'vitest';
import {
  aqhiFrom,
  aqhiFromHourly,
  aqiCategory,
  aqiFromCurrent,
  aqiRisk,
  fetchAirQuality,
} from '../src/services/airQuality';

describe('AQHI', () => {
  it('matches ECCC reference points', () => {
    expect(aqhiFrom(0, 0, 0)).toBe(1); // clean air clamps to 1
    // ~30 ppb O3, ~15 ppb NO2, 10 µg/m³ PM2.5 is a typical summer "3"
    expect(aqhiFrom(30, 15, 10)).toBe(3);
    expect(aqhiFrom(200, 100, 150)).toBe(11); // smoke day clamps at 11+
  });

  it('averages the last three hours that have data', () => {
    const H = {
      time: ['t0', 't1', 't2', 't3', 't4'],
      pm2_5: [80, 80, 80, 80, null],
      nitrogen_dioxide: [0, 0, 0, 0, null],
      ozone: [0, 0, 0, 0, null],
    };
    const r = aqhiFromHourly(H);
    expect(r?.scale).toBe('aqhi');
    expect(r?.value).toBe(aqhiFrom(0, 0, 80));
    expect(r?.risk).toBe(1);
    expect(aqhiFromHourly({ time: [], pm2_5: [], nitrogen_dioxide: [], ozone: [] })).toBeNull();
  });
});

describe('US AQI', () => {
  it('maps EPA breakpoints to category and advice band', () => {
    expect(aqiCategory(0)).toBe(0);
    expect(aqiCategory(50)).toBe(0);
    expect(aqiCategory(51)).toBe(1);
    expect(aqiCategory(101)).toBe(2);
    expect(aqiCategory(151)).toBe(3);
    expect(aqiCategory(201)).toBe(4);
    expect(aqiCategory(301)).toBe(5);
    expect(aqiRisk(42)).toBe(0);
    expect(aqiRisk(120)).toBe(1); // sensitive groups
    expect(aqiRisk(180)).toBe(2); // reduce effort → alert tile
    expect(aqiRisk(250)).toBe(3);
  });

  it('builds the tile value from the current reading', () => {
    expect(aqiFromCurrent(137.4)).toEqual({ scale: 'aqi', value: 137, risk: 1, category: 2 });
    expect(aqiFromCurrent(null)).toBeNull();
    expect(aqiFromCurrent(undefined)).toBeNull();
  });
});

describe('fetchAirQuality', () => {
  it('asks for us_aqi in the US and the AQHI ingredients in Canada', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        seen.push(String(input));
        return Response.json({
          current: { us_aqi: 63 },
          hourly: { time: ['t'], pm2_5: [5], nitrogen_dioxide: [5], ozone: [40] },
        });
      }),
    );
    try {
      const us = await fetchAirQuality(40.71, -74.01);
      expect(us).toEqual({ scale: 'aqi', value: 63, risk: 1, category: 1 });
      expect(new URL(seen[0]!).searchParams.get('current')).toBe('us_aqi');
      expect(new URL(seen[0]!).searchParams.has('hourly')).toBe(false);

      const ca = await fetchAirQuality(53.55, -113.49);
      expect(ca?.scale).toBe('aqhi');
      expect(new URL(seen[1]!).searchParams.get('hourly')).toBe('pm2_5,nitrogen_dioxide,ozone');
      expect(new URL(seen[1]!).searchParams.has('current')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
