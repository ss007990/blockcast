import { describe, expect, it } from 'vitest';
import { parseRainTilePath } from '../src/rain';

describe('parseRainTilePath', () => {
  const ok = (p: string) => parseRainTilePath(p);

  it('parses a valid tile path', () => {
    expect(ok('/api/rain/tile/precip/1786725600/1800/7/38/45.png')).toEqual({
      layer: 'precip',
      snapshot: 1786725600,
      fsec: 1800,
      z: 7,
      x: 38,
      y: 45,
    });
  });

  it('accepts the global layer and the zero forecast', () => {
    expect(ok('/api/rain/tile/precip-global/1786725600/0/12/4095/4095.png')?.layer).toBe(
      'precip-global',
    );
  });

  it('rejects unknown layers', () => {
    expect(ok('/api/rain/tile/clouds/1786725600/0/7/38/45.png')).toBeNull();
  });

  it('rejects unaligned snapshots and forecast offsets', () => {
    expect(ok('/api/rain/tile/precip/1786725601/0/7/38/45.png')).toBeNull(); // not 10-min aligned
    expect(ok('/api/rain/tile/precip/1786725600/900/7/38/45.png')).toBeNull(); // 15 min ∉ 600 s grid
    expect(ok('/api/rain/tile/precip/1786725600/15000/7/38/45.png')).toBeNull(); // beyond +4 h
  });

  it('rejects out-of-range zoom and tile coordinates', () => {
    expect(ok('/api/rain/tile/precip/1786725600/0/13/0/0.png')).toBeNull();
    expect(ok('/api/rain/tile/precip/1786725600/0/7/128/45.png')).toBeNull(); // x ≥ 2^7
    expect(ok('/api/rain/tile/precip/1786725600/0/7/38/128.png')).toBeNull();
  });

  it('rejects paths that are not tile paths at all', () => {
    expect(ok('/api/rain/tile/precip/1786725600/0/7/38/45.jpg')).toBeNull();
    expect(ok('/api/rain/snapshot/precip')).toBeNull();
  });
});
