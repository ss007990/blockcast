import { describe, expect, it } from 'vitest';
import {
  CELL_PX,
  isValidRect,
  mercX,
  mercY,
  rectBbox,
  rectCorners,
  snapView,
  WORLD,
} from '../src/core/radarView';

/** Mercator bounds for a lon/lat window, the way the map reports them. */
const bounds = (w: number, s: number, e: number, n: number) => ({
  xmin: mercX(w),
  ymin: mercY(s),
  xmax: mercX(e),
  ymax: mercY(n),
});

// a phone-sized radar card over Montréal at the player's default zoom
const MTL = bounds(-74.7, 44.4, -72.4, 46.6);

describe('snapView', () => {
  it('covers the requested extent', () => {
    const v = snapView(MTL, 7, 3);
    const [xmin, ymin, xmax, ymax] = v.bbox;
    expect(xmin).toBeLessThanOrEqual(MTL.xmin);
    expect(ymin).toBeLessThanOrEqual(MTL.ymin);
    expect(xmax).toBeGreaterThanOrEqual(MTL.xmax);
    expect(ymax).toBeGreaterThanOrEqual(MTL.ymax);
  });

  it('produces a valid, in-range rectangle sized in whole cells', () => {
    const v = snapView(MTL, 7, 3);
    expect(isValidRect(v)).toBe(true);
    expect(v.width).toBe(v.nx * CELL_PX);
    expect(v.height).toBe(v.ny * CELL_PX);
  });

  it('gives nearby viewers the same rectangle, which is the whole point', () => {
    // two users a few hundred metres apart, same zoom: one cache entry
    const a = snapView(MTL, 7, 3);
    const b = snapView(bounds(-74.699, 44.401, -72.399, 46.601), 7, 3);
    expect({ z: b.z, x0: b.x0, y0: b.y0, nx: b.nx, ny: b.ny }).toEqual({
      z: a.z,
      x0: a.x0,
      y0: a.y0,
      nx: a.nx,
      ny: a.ny,
    });
  });

  it('separates viewers who are genuinely looking elsewhere', () => {
    const mtl = snapView(MTL, 7, 3);
    const van = snapView(bounds(-124.2, 48.2, -121.9, 50.4), 7, 3);
    expect(van.x0).not.toBe(mtl.x0);
  });

  it('asks for a coarser grid at lower density, and a finer one at higher', () => {
    const half = snapView(MTL, 7, 1.5);
    const full = snapView(MTL, 7, 3);
    expect(half.z).toBe(full.z - 1);
  });

  it('never exceeds the WMS size limit, however deep the zoom', () => {
    for (const z of [3, 7, 9, 11]) {
      const v = snapView(MTL, z, 3);
      expect(v.width).toBeLessThanOrEqual(2048);
      expect(v.height).toBeLessThanOrEqual(2048);
      expect(isValidRect(v)).toBe(true);
    }
  });

  it('never asks for the whole planet because a container measured zero', () => {
    // regression: resolution used to come from the container size, so a
    // clientWidth of 0 mid-layout resolved to zoom 0 and one world-wide frame
    const v = snapView(MTL, 7, 3);
    expect(v.z).toBeGreaterThan(6);
    expect(v.nx).toBeLessThan(2 ** v.z);
    const [nw] = v.coords;
    expect(nw[0]).toBeGreaterThan(-90); // still over Québec, not the Pacific
    expect(nw[0]).toBeLessThan(-60);
  });

  it('keeps a frame within a phone-sized download', () => {
    // a 1 km composite does not reward chasing devicePixelRatio: a frame
    // should stay near the old viewport-exact size, not balloon past it
    const v = snapView(bounds(-98.24, 49.15, -96.04, 50.64), 7, 3);
    expect(v.width * v.height).toBeLessThanOrEqual(1400 * 1400);
  });

  it('stays inside the grid at the extremes', () => {
    const world = snapView(bounds(-179.9, -85, 179.9, 85), 1, 2);
    expect(isValidRect(world)).toBe(true);
    expect(world.x0).toBeGreaterThanOrEqual(0);
    expect(world.x0 + world.nx).toBeLessThanOrEqual(2 ** world.z);
    expect(world.y0 + world.ny).toBeLessThanOrEqual(2 ** world.z);
  });
});

describe('rectBbox and rectCorners', () => {
  it('spans the world at zoom 0', () => {
    const [xmin, ymin, xmax, ymax] = rectBbox({ z: 0, x0: 0, y0: 0, nx: 1, ny: 1 });
    expect(xmin).toBeCloseTo(-WORLD / 2, 6);
    expect(xmax).toBeCloseTo(WORLD / 2, 6);
    expect(ymin).toBeCloseTo(-WORLD / 2, 6);
    expect(ymax).toBeCloseTo(WORLD / 2, 6);
  });

  it('puts the corners in overlay order: [w,n] [e,n] [e,s] [w,s]', () => {
    const [nw, ne, se, sw] = rectCorners({ z: 4, x0: 4, y0: 5, nx: 2, ny: 2 });
    expect(nw[0]).toBeLessThan(ne[0]); // west of east
    expect(nw[1]).toBeGreaterThan(sw[1]); // north of south
    expect(ne[0]).toBe(se[0]);
    expect(nw[1]).toBe(ne[1]);
    expect(sw[1]).toBe(se[1]);
  });

  it('round-trips a snapped view back to its own bbox', () => {
    const v = snapView(MTL, 7, 3);
    expect(rectBbox(v)).toEqual(v.bbox);
  });
});

describe('isValidRect', () => {
  it('accepts a plausible rectangle', () => {
    expect(isValidRect({ z: 9, x0: 140, y0: 180, nx: 4, ny: 6 })).toBe(true);
  });

  it('rejects rectangles that fall outside the grid', () => {
    expect(isValidRect({ z: 2, x0: 3, y0: 0, nx: 2, ny: 1 })).toBe(false); // x overruns 2^2
    expect(isValidRect({ z: 2, x0: 0, y0: -1, nx: 1, ny: 1 })).toBe(false);
  });

  it('rejects sizes that would ask an upstream server for too much', () => {
    expect(isValidRect({ z: 9, x0: 0, y0: 0, nx: 9, ny: 1 })).toBe(false);
    expect(isValidRect({ z: 9, x0: 0, y0: 0, nx: 0, ny: 1 })).toBe(false);
  });

  it('rejects non-integers and out-of-range zooms', () => {
    expect(isValidRect({ z: 9.5, x0: 1, y0: 1, nx: 1, ny: 1 })).toBe(false);
    expect(isValidRect({ z: 13, x0: 1, y0: 1, nx: 1, ny: 1 })).toBe(false);
    expect(isValidRect({ z: 9, x0: 1.5, y0: 1, nx: 1, ny: 1 })).toBe(false);
  });
});
