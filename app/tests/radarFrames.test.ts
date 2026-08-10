import { describe, expect, it } from 'vitest';
import {
  buildHybridFrames,
  buildRadarFrames,
  parseWmsTimeDim,
  timeDimFromCapabilities,
} from '../src/core/radarFrames';

const T = (iso: string) => Date.parse(iso);

describe('buildHybridFrames', () => {
  const now = T('2026-08-09T15:07:00Z');
  const model = {
    start: T('2026-08-09T13:00:00Z'),
    end: T('2026-08-11T12:00:00Z'),
    stepMs: 3_600_000,
  };

  it('lays out radar past, fradar first hour, model beyond', () => {
    const f = buildHybridFrames(model, now, { firstHour: 'fradar' });
    expect(f.filter((x) => x.kind === 'radar').map((x) => x.offMin)).toEqual([
      -60, -50, -40, -30, -20, -10, 0,
    ]);
    expect(f.filter((x) => x.kind === 'fradar').map((x) => x.offMin)).toEqual([
      10, 20, 30, 40, 50, 60,
    ]);
    const m = f.filter((x) => x.kind === 'model');
    // first hourly step strictly after now+60min (16:07Z → 17:00Z)
    expect(m[0]!.time).toBe(T('2026-08-09T17:00:00Z'));
    // capped at now+6h (21:07Z → last step 21:00Z)
    expect(m[m.length - 1]!.time).toBe(T('2026-08-09T21:00:00Z'));
    expect(m.every((x) => x.offMin > 60)).toBe(true);
  });

  it('still yields the radar+fradar loop when the model is unavailable', () => {
    const f = buildHybridFrames(null, now, { firstHour: 'fradar' });
    expect(f).toHaveLength(13);
    expect(f.some((x) => x.kind === 'model')).toBe(false);
  });

  it('uses nowcast frames for the first hour outside US radar coverage', () => {
    const f = buildHybridFrames(model, now, { firstHour: 'nowcast' });
    expect(f.filter((x) => x.kind === 'nowcast').map((x) => x.offMin)).toEqual([
      10, 20, 30, 40, 50, 60,
    ]);
    expect(f.some((x) => x.kind === 'fradar')).toBe(false);
    // model still starts after the projected hour
    expect(f.filter((x) => x.kind === 'model')[0]!.time).toBe(T('2026-08-09T17:00:00Z'));
  });

  it('jumps straight to model steps when no first hour source exists', () => {
    const f = buildHybridFrames(model, now, { firstHour: 'none' });
    expect(f.some((x) => x.kind === 'fradar' || x.kind === 'nowcast')).toBe(false);
    const m = f.filter((x) => x.kind === 'model');
    // model picks up right after now (16:00Z), not after a skipped hour
    expect(m[0]!.time).toBe(T('2026-08-09T16:00:00Z'));
    expect(m[m.length - 1]!.time).toBe(T('2026-08-09T21:00:00Z'));
  });
});

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
