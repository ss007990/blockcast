// The "geographically relevant" gate: the Marine API returns all-null arrays
// inland, real values on the coast, and a near-flat sea level where tides are
// negligible — reshapeForecast must map those to marine: null / {tide}.

import { describe, expect, it } from 'vitest';
import { reshapeForecast, type MarineResponse, type OpenMeteoResponse } from '../src/core/forecast';

const T = ['2026-07-20T00:00', '2026-07-20T01:00', '2026-07-20T02:00'];

const weather = (): OpenMeteoResponse => ({
  timezone: 'America/Halifax',
  utc_offset_seconds: -3 * 3600,
  hourly: {
    time: [...T],
    temperature_2m: [20, 20, 20],
    apparent_temperature: [20, 20, 20],
    precipitation_probability: [0, 0, 0],
    precipitation: [0, 0, 0],
    wind_speed_10m: [5, 5, 5],
    wind_gusts_10m: [10, 10, 10],
    cloud_cover: [0, 0, 0],
    uv_index: [2, 2, 2],
    snowfall: [0, 0, 0],
    snow_depth: [0, 0, 0],
  },
  daily: {
    time: ['2026-07-20'],
    weather_code: [0],
    apparent_temperature_max: [22],
    apparent_temperature_min: [15],
    sunrise: ['2026-07-20T05:30'],
    sunset: ['2026-07-20T20:30'],
  },
});

const marine = (
  swell: (number | null)[],
  sea: (number | null)[],
): MarineResponse => ({ hourly: { time: [...T], swell_wave_height: swell, sea_level_height_msl: sea } });

describe('reshapeForecast marine gate', () => {
  it('no marine response → marine null, no slice fields', () => {
    const d = reshapeForecast(weather(), 0);
    expect(d.marine).toBeNull();
    expect(d.days['2026-07-20']?.[0]?.swell).toBeUndefined();
  });

  it('inland all-null marine data → marine null', () => {
    const d = reshapeForecast(weather(), 0, marine([null, null, null], [null, null, null]));
    expect(d.marine).toBeNull();
  });

  it('coastal data → swell on slices and tide normalized over the range', () => {
    const d = reshapeForecast(weather(), 0, marine([0.4, 0.6, 0.8], [-1, 0, 1]));
    expect(d.marine).toEqual({ swell: true, tide: true });
    const day = d.days['2026-07-20'];
    expect(day?.[1]?.swell).toBe(0.6);
    expect(day?.[0]?.tide).toBe(0);
    expect(day?.[1]?.tide).toBe(0.5);
    expect(day?.[2]?.tide).toBe(1);
  });

  it('micro-tidal sea (range under 0.3 m) → swell yes, tide no', () => {
    const d = reshapeForecast(weather(), 0, marine([0.4, 0.6, 0.8], [0, 0.1, 0.2]));
    expect(d.marine).toEqual({ swell: true, tide: false });
    expect(d.days['2026-07-20']?.[1]?.swell).toBe(0.6);
    expect(d.days['2026-07-20']?.[1]?.tide).toBeUndefined();
  });

  it('tidal river (no wave model, e.g. lower St. Lawrence) → tide yes, swell no', () => {
    const d = reshapeForecast(weather(), 0, marine([null, null, null], [-1.6, 0, 1.7]));
    expect(d.marine).toEqual({ swell: false, tide: true });
    const day = d.days['2026-07-20'];
    expect(day?.[0]?.swell).toBeUndefined();
    expect(day?.[0]?.tide).toBe(0);
    expect(day?.[2]?.tide).toBe(1);
  });
});
