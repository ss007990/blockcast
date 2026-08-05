import { describe, expect, it } from 'vitest';
import { applyRainBlend, type OpenMeteoResponse, type RainBlendResponse } from '../src/core/forecast';

// Minimal main response: two hours, best_match sees light rain risk.
const mainResponse = (): OpenMeteoResponse =>
  ({
    timezone: 'America/Toronto',
    hourly: {
      time: ['2026-08-06T14:00', '2026-08-06T15:00'],
      temperature_2m: [20, 20],
      apparent_temperature: [20, 20],
      precipitation_probability: [18, 20],
      precipitation: [0.1, 0.2],
      wind_speed_10m: [5, 5],
      wind_gusts_10m: [10, 10],
      cloud_cover: [50, 50],
      uv_index: [3, 3],
      snowfall: [0, 0],
      snow_depth: [0, 0],
    },
    daily: {
      time: ['2026-08-06'],
      weather_code: [80],
      apparent_temperature_max: [22],
      apparent_temperature_min: [15],
      sunrise: ['2026-08-06T05:40'],
      sunset: ['2026-08-06T20:10'],
    },
  }) as OpenMeteoResponse;

describe('applyRainBlend', () => {
  it('raises rain probability and amount to the worst case across models', () => {
    const j = mainResponse();
    const blend: RainBlendResponse = {
      hourly: {
        time: ['2026-08-06T14:00', '2026-08-06T15:00'],
        precipitation_probability_ecmwf_ifs025: [73, 10],
        precipitation_ecmwf_ifs025: [1.6, 0.0],
        precipitation_probability_gem_seamless: [26, 40],
        precipitation_gem_seamless: [0.0, 0.5],
      },
    };
    applyRainBlend(j, blend);
    // hour 14: ECMWF wins on both; hour 15: GEM wins on both
    expect(j.hourly.precipitation_probability).toEqual([73, 40]);
    expect(j.hourly.precipitation).toEqual([1.6, 0.5]);
  });

  it('ignores nulls (model past its horizon) and keeps best_match', () => {
    const j = mainResponse();
    const blend: RainBlendResponse = {
      hourly: {
        time: ['2026-08-06T14:00', '2026-08-06T15:00'],
        precipitation_probability_gem_seamless: [null, null],
        precipitation_gem_seamless: [null, null],
      },
    };
    applyRainBlend(j, blend);
    expect(j.hourly.precipitation_probability).toEqual([18, 20]);
    expect(j.hourly.precipitation).toEqual([0.1, 0.2]);
  });

  it('matches by timestamp, not index, and tolerates a missing blend', () => {
    const j = mainResponse();
    const blend: RainBlendResponse = {
      hourly: {
        // offset range: only 15:00 overlaps the main forecast
        time: ['2026-08-06T15:00', '2026-08-06T16:00'],
        precipitation_probability_ecmwf_ifs025: [90, 95],
        precipitation_ecmwf_ifs025: [2.0, 3.0],
      },
    };
    applyRainBlend(j, blend);
    expect(j.hourly.precipitation_probability).toEqual([18, 90]);
    expect(j.hourly.precipitation).toEqual([0.1, 2.0]);

    const untouched = mainResponse();
    applyRainBlend(untouched, null);
    expect(untouched.hourly.precipitation_probability).toEqual([18, 20]);
  });
});
