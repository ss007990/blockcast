import { describe, expect, it } from 'vitest';
import {
  buildRadarFrames,
  parseWmsTimeDim,
  timeDimFromCapabilities,
} from '../src/core/radarFrames';
import { radarProvider } from '../src/core/radarCoverage';

const T = (iso: string) => Date.parse(iso);

describe('parseWmsTimeDim', () => {
  it('parses a GeoMet minute-step dimension', () => {
    const d = parseWmsTimeDim('2026-08-06T10:54:00Z/2026-08-06T13:54:00Z/PT6M');
    expect(d).toEqual({
      start: T('2026-08-06T10:54:00Z'),
      end: T('2026-08-06T13:54:00Z'),
      stepMs: 6 * 60_000,
    });
  });
  it('parses an hour-step dimension', () => {
    const d = parseWmsTimeDim('2026-08-06T07:00:00Z/2026-08-08T06:00:00Z/PT1H');
    expect(d!.stepMs).toBe(3_600_000);
  });
  it('rejects garbage, zero steps and reversed ranges', () => {
    expect(parseWmsTimeDim('nope')).toBeNull();
    expect(parseWmsTimeDim('2026-08-06T10:00:00Z/2026-08-06T11:00:00Z/PT0M')).toBeNull();
    expect(parseWmsTimeDim('2026-08-06T12:00:00Z/2026-08-06T11:00:00Z/PT6M')).toBeNull();
  });
});

describe('timeDimFromCapabilities', () => {
  it('finds the time dimension in a capabilities snippet', () => {
    const xml =
      '<Layer><Name>RADAR_1KM_RRAI</Name><Dimension name="time" units="ISO8601" default="x" nearestValue="0">2026-08-06T10:54:00Z/2026-08-06T13:54:00Z/PT6M</Dimension></Layer>';
    expect(timeDimFromCapabilities(xml)!.stepMs).toBe(360_000);
  });
  it('returns null when absent', () => {
    expect(timeDimFromCapabilities('<Layer/>')).toBeNull();
  });
});

describe('buildRadarFrames', () => {
  // shapes lifted from live GeoMet capabilities: the extrapolation window
  // starts one step before the composite's latest frame and runs ~72 min past it
  const radar = parseWmsTimeDim('2026-08-13T08:00:00Z/2026-08-13T11:00:00Z/PT6M')!;
  const nowcast = parseWmsTimeDim('2026-08-13T10:54:00Z/2026-08-13T12:06:00Z/PT6M')!;
  const model = parseWmsTimeDim('2026-08-13T07:00:00Z/2026-08-15T06:00:00Z/PT1H')!;

  it('lays out observed past, extrapolation next, model beyond', () => {
    const frames = buildRadarFrames(radar, nowcast, model);
    const obs = frames.filter((f) => f.kind === 'radar');
    const nc = frames.filter((f) => f.kind === 'nowcast');
    const mod = frames.filter((f) => f.kind === 'model');

    expect(obs).toHaveLength(11); // 60 min at 6-min steps, inclusive
    expect(obs[0]!.time).toBe(T('2026-08-13T10:00:00Z'));
    expect(obs.at(-1)!.time).toBe(T('2026-08-13T11:00:00Z'));

    // every advertised step strictly after the latest observation
    expect(nc[0]!.time).toBe(T('2026-08-13T11:06:00Z'));
    expect(nc.at(-1)!.time).toBe(T('2026-08-13T12:06:00Z'));
    expect(nc).toHaveLength(11);

    // model picks up after the nowcast runs out, capped at +6 h
    expect(mod[0]!.time).toBe(T('2026-08-13T13:00:00Z'));
    expect(mod.at(-1)!.time).toBe(T('2026-08-13T17:00:00Z'));

    // one strictly increasing timeline, no duplicates
    const times = frames.map((f) => f.time);
    expect([...new Set(times)].sort((a, b) => a - b)).toEqual(times);
  });

  it('falls back to observed then model when the nowcast layer is down', () => {
    const frames = buildRadarFrames(radar, null, model);
    expect(frames.some((f) => f.kind === 'nowcast')).toBe(false);
    // model starts right after the radar's "now", not after a skipped hour
    expect(frames.find((f) => f.kind === 'model')!.time).toBe(T('2026-08-13T12:00:00Z'));
  });

  it('ends at the nowcast when the model is down', () => {
    const frames = buildRadarFrames(radar, nowcast, null);
    expect(frames.some((f) => f.kind === 'model')).toBe(false);
    expect(frames.at(-1)!.time).toBe(T('2026-08-13T12:06:00Z'));
  });

  it('ignores a stale nowcast that ends before the latest observation', () => {
    const stale = parseWmsTimeDim('2026-08-13T09:00:00Z/2026-08-13T10:12:00Z/PT6M')!;
    const frames = buildRadarFrames(radar, stale, model);
    expect(frames.some((f) => f.kind === 'nowcast')).toBe(false);
    expect(frames.find((f) => f.kind === 'model')!.time).toBe(T('2026-08-13T12:00:00Z'));
  });

  it('clamps to what the layers actually offer', () => {
    const shortRadar = parseWmsTimeDim('2026-08-13T10:48:00Z/2026-08-13T11:00:00Z/PT6M')!;
    const shortModel = parseWmsTimeDim('2026-08-13T07:00:00Z/2026-08-13T13:00:00Z/PT1H')!;
    const frames = buildRadarFrames(shortRadar, nowcast, shortModel);
    expect(frames.filter((f) => f.kind === 'radar')).toHaveLength(3);
    expect(frames.filter((f) => f.kind === 'model').at(-1)!.time).toBe(T('2026-08-13T13:00:00Z'));
  });
});

describe('radarProvider', () => {
  it('serves ECCC across North American radar reach', () => {
    expect(radarProvider(45.51, -73.57)).toBe('eccc'); // Montréal
    expect(radarProvider(49.28, -123.12)).toBe('eccc'); // Vancouver
    expect(radarProvider(25.76, -80.19)).toBe('eccc'); // Miami
    expect(radarProvider(44.98, -93.27)).toBe('eccc'); // Minneapolis
  });
  it('reports no coverage elsewhere instead of a blank animation', () => {
    expect(radarProvider(48.85, 2.35)).toBe('none'); // Paris
    expect(radarProvider(35.68, 139.69)).toBe('none'); // Tokyo
    expect(radarProvider(61.22, -149.9)).toBe('none'); // Anchorage (outside the 1 km composite)
    expect(radarProvider(21.31, -157.86)).toBe('none'); // Honolulu
  });
});
