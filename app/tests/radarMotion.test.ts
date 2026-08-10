import { describe, expect, it } from 'vitest';
import { combineMotions, estimateShift } from '../src/core/radarMotion';

const W = 96;
const H = 96;

/** A grid with one soft round echo centred at (cx, cy). */
function blobGrid(cx: number, cy: number, r = 9): Float32Array {
  const g = new Float32Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r) g[y * W + x] = 1 - d / r;
    }
  }
  return g;
}

describe('estimateShift', () => {
  it('recovers a known translation', () => {
    const a = blobGrid(40, 48);
    const b = blobGrid(46, 44); // moved +6 x, -4 y
    const m = estimateShift(a, b, W, H, { maxShift: 10, stride: 1 });
    expect(m.dx).toBe(6);
    expect(m.dy).toBe(-4);
    expect(m.confidence).toBeGreaterThan(0.5);
  });

  it('reports zero motion for identical frames', () => {
    const a = blobGrid(48, 48);
    const m = estimateShift(a, a, W, H, { maxShift: 8, stride: 1 });
    expect(m.dx).toBe(0);
    expect(m.dy).toBe(0);
  });

  it('has no confidence in an empty sky', () => {
    const empty = new Float32Array(W * H);
    const m = estimateShift(empty, empty, W, H);
    expect(m.confidence).toBe(0);
    expect(m.dx).toBe(0);
  });

  it('keeps confidence low when the field appears rather than moves', () => {
    const nothing = new Float32Array(W * H);
    const appeared = blobGrid(48, 48);
    const m = estimateShift(nothing, appeared, W, H, { maxShift: 8, stride: 1 });
    expect(m.confidence).toBeLessThan(0.4);
  });
});

describe('combineMotions', () => {
  it('averages agreeing pairs and keeps confidence', () => {
    const m = combineMotions([
      { dx: 6, dy: -4, confidence: 0.8 },
      { dx: 5, dy: -4, confidence: 0.7 },
    ]);
    expect(m.dx).toBeCloseTo(5.5);
    expect(m.dy).toBeCloseTo(-4);
    expect(m.confidence).toBeGreaterThan(0.5);
  });

  it('collapses confidence when pairs disagree wildly', () => {
    const m = combineMotions([
      { dx: 9, dy: 0, confidence: 0.8 },
      { dx: -8, dy: 2, confidence: 0.8 },
    ]);
    expect(m.confidence).toBeLessThan(0.3);
  });

  it('ignores low-confidence pairs entirely', () => {
    const m = combineMotions([
      { dx: 40, dy: 40, confidence: 0.05 },
      { dx: 4, dy: 2, confidence: 0.7 },
    ]);
    expect(m.dx).toBe(4);
    expect(m.dy).toBe(2);
  });

  it('returns stillness when nothing is usable', () => {
    expect(combineMotions([{ dx: 3, dy: 3, confidence: 0.1 }])).toEqual({
      dx: 0,
      dy: 0,
      confidence: 0,
    });
  });
});
