// Synthesised first-hour radar: load the last few observed ECCC frames for
// the current view, estimate how the echoes are moving (core/radarMotion),
// and paint the newest frame slid along that motion for +10…+60 min. The
// result is one data-URL PNG per step, drop-in compatible with the image
// overlays the radar sheet already animates.

import { combineMotions, estimateShift } from '../../core/radarMotion';

const ANALYSIS_W = 320; // motion is estimated on a downscaled grid for speed
const MIN_CONFIDENCE = 0.2;

const loadImage = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

/** Alpha channel as intensity — radar PNGs are transparent where dry. */
function intensityGrid(img: HTMLImageElement, w: number, h: number): Float32Array | null {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return null; // canvas tainted: CORS headers missing
  }
  const grid = new Float32Array(w * h);
  for (let i = 0; i < grid.length; i += 1) grid[i] = data.data[i * 4 + 3]! / 255;
  return grid;
}

export interface NowcastFrames {
  /** One PNG data-URL per requested step, aligned with `stepsMin`. */
  urls: string[];
  confidence: number;
}

/**
 * Build projected frames from observed ones.
 *
 * @param sourceUrls   trailing observed frames, oldest → newest, same bbox
 * @param stepsMin     minutes ahead to synthesise, e.g. [10, 20, …, 60]
 * @param intervalMin  minutes between the source frames (6 for ECCC)
 */
export async function synthesizeNowcast(
  sourceUrls: string[],
  stepsMin: number[],
  intervalMin: number,
): Promise<NowcastFrames | null> {
  const images = await Promise.all(sourceUrls.map(loadImage));
  if (images.some((i) => i == null) || images.length < 2) return null;
  const imgs = images as HTMLImageElement[];
  const newest = imgs[imgs.length - 1]!;

  const aw = ANALYSIS_W;
  const ah = Math.max(40, Math.round((newest.height / newest.width) * aw));
  const grids = imgs.map((i) => intensityGrid(i, aw, ah));
  if (grids.some((g) => g == null)) return null;

  const pairs = [];
  for (let i = 1; i < grids.length; i += 1)
    pairs.push(estimateShift(grids[i - 1]!, grids[i]!, aw, ah));
  const motion = combineMotions(pairs);
  if (motion.confidence < MIN_CONFIDENCE) return null;

  // analysis-grid cells → full-resolution pixels
  const scale = newest.width / aw;
  const canvas = document.createElement('canvas');
  canvas.width = newest.width;
  canvas.height = newest.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const urls = stepsMin.map((min) => {
    const k = min / intervalMin;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // the faintest touch of growing blur for uncertainty — cells must stay
    // readable as cells all the way to +60
    ctx.filter = `blur(${((min / 60) * 0.8).toFixed(2)}px)`;
    ctx.drawImage(newest, motion.dx * k * scale, motion.dy * k * scale);
    ctx.filter = 'none';
    return canvas.toDataURL('image/png');
  });
  return { urls, confidence: motion.confidence };
}
