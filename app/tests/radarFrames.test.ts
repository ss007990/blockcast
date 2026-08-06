import { describe, expect, it } from 'vitest';
import {
  buildRadarFrames,
  parseWmsTimeDim,
  timeDimFromCapabilities,
} from '../src/core/radarFrames';

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
  const radar = parseWmsTimeDim('2026-08-06T10:54:00Z/2026-08-06T13:54:00Z/PT6M')!;
  const model = parseWmsTimeDim('2026-08-06T07:00:00Z/2026-08-08T06:00:00Z/PT1H')!;

  it('covers the past hour of radar then six model hours', () => {
    const frames = buildRadarFrames(radar, model);
    const obs = frames.filter((f) => f.kind === 'radar');
    const fut = frames.filter((f) => f.kind === 'model');
    expect(obs).toHaveLength(11); // 60 min at 6-min steps, inclusive
    expect(obs[0]!.time).toBe(T('2026-08-06T12:54:00Z'));
    expect(obs.at(-1)!.time).toBe(T('2026-08-06T13:54:00Z'));
    expect(fut[0]!.time).toBe(T('2026-08-06T14:00:00Z')); // first hour after "now"
    expect(fut.at(-1)!.time).toBe(T('2026-08-06T19:00:00Z')); // within +6 h
    // strictly increasing, radar before model
    const times = frames.map((f) => f.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('clamps to what the layers actually offer', () => {
    const shortRadar = parseWmsTimeDim('2026-08-06T13:42:00Z/2026-08-06T13:54:00Z/PT6M')!;
    const shortModel = parseWmsTimeDim('2026-08-06T07:00:00Z/2026-08-06T15:00:00Z/PT1H')!;
    const frames = buildRadarFrames(shortRadar, shortModel);
    expect(frames.filter((f) => f.kind === 'radar')).toHaveLength(3);
    expect(frames.filter((f) => f.kind === 'model').at(-1)!.time).toBe(T('2026-08-06T15:00:00Z'));
  });
});
