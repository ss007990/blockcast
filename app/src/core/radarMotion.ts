// First-hour radar nowcast, the way broadcast future radar does it: estimate
// how the echoes moved between the last few observed frames, then slide the
// newest frame along that motion. Pure array maths here — the canvas work
// (decoding PNGs, painting shifted frames) lives with the UI.
//
// Frames come in as intensity grids (0..1 per cell, 0 = no echo). Motion is
// found by brute-force shift search minimising mean absolute difference over
// the overlap, weighted toward cells that actually contain echo. A global
// vector is deliberate: over 60 minutes, precipitation fields translate far
// more than they rotate or deform, and a stable global estimate beats a
// noisy local field.

export interface Motion {
  /** Cell offsets per frame interval (positive = toward +x / +y). */
  dx: number;
  dy: number;
  /** 0..1 — how much echo supported the estimate; low = unreliable. */
  confidence: number;
}

/**
 * Best integer shift taking `prev` onto `cur`, searched within ±maxShift.
 * `stride` samples the grid for speed (2 halves the work fourfold).
 */
export function estimateShift(
  prev: Float32Array,
  cur: Float32Array,
  w: number,
  h: number,
  { maxShift = 16, stride = 2 }: { maxShift?: number; stride?: number } = {},
): Motion {
  let echo = 0;
  let cells = 0;
  for (let i = 0; i < cur.length; i += 1) {
    if (cur[i]! > 0.02) echo += 1;
    cells += 1;
  }
  const coverage = cells ? echo / cells : 0;
  // almost nothing on screen: no motion worth estimating
  if (coverage < 0.001) return { dx: 0, dy: 0, confidence: 0 };

  let best = Infinity;
  let bdx = 0;
  let bdy = 0;
  for (let dy = -maxShift; dy <= maxShift; dy += 1) {
    for (let dx = -maxShift; dx <= maxShift; dx += 1) {
      let sum = 0;
      let n = 0;
      for (let y = maxShift; y < h - maxShift; y += stride) {
        const rowP = (y - dy) * w;
        const rowC = y * w;
        for (let x = maxShift; x < w - maxShift; x += stride) {
          const p = prev[rowP + (x - dx)]!;
          const c = cur[rowC + x]!;
          if (p > 0.02 || c > 0.02) {
            sum += Math.abs(c - p);
            n += 1;
          }
        }
      }
      if (n === 0) continue;
      const score = sum / n;
      // prefer the smaller shift on ties: still air should stay still
      if (score < best - 1e-9 || (score < best + 1e-9 && dx * dx + dy * dy < bdx * bdx + bdy * bdy)) {
        best = score;
        bdx = dx;
        bdy = dy;
      }
    }
  }
  if (!Number.isFinite(best)) return { dx: 0, dy: 0, confidence: 0 };
  // confidence: how much better the best shift is than staying put
  let stay = 0;
  let stayN = 0;
  for (let y = maxShift; y < h - maxShift; y += stride) {
    for (let x = maxShift; x < w - maxShift; x += stride) {
      const p = prev[y * w + x]!;
      const c = cur[y * w + x]!;
      if (p > 0.02 || c > 0.02) {
        stay += Math.abs(c - p);
        stayN += 1;
      }
    }
  }
  const stayScore = stayN ? stay / stayN : 0;
  const confidence =
    stayScore <= 1e-9 ? 0 : Math.max(0, Math.min(1, (stayScore - best) / stayScore));
  return { dx: bdx, dy: bdy, confidence };
}

/**
 * Combine per-pair motions from the trailing frames into one vector.
 * Consistent pairs reinforce confidence; disagreement collapses it.
 */
export function combineMotions(pairs: Motion[]): Motion {
  const usable = pairs.filter((m) => m.confidence > 0.15);
  if (usable.length === 0) return { dx: 0, dy: 0, confidence: 0 };
  const dx = usable.reduce((s, m) => s + m.dx, 0) / usable.length;
  const dy = usable.reduce((s, m) => s + m.dy, 0) / usable.length;
  const conf = usable.reduce((s, m) => s + m.confidence, 0) / usable.length;
  // wildly disagreeing pairs mean the field is evolving, not translating
  const spread = usable.reduce(
    (s, m) => s + Math.hypot(m.dx - dx, m.dy - dy),
    0,
  ) / usable.length;
  const mag = Math.hypot(dx, dy);
  const agreement = mag < 1 ? 1 : Math.max(0, 1 - spread / (mag + 4));
  return { dx, dy, confidence: conf * agreement };
}
