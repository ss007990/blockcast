// Stitch Rainbow AI XYZ tiles (via the worker proxy) into one image, drop-in
// compatible with the single-image-per-frame pipeline the radar player uses
// for GeoMet. Stitching client-side keeps the preload-then-play behaviour;
// per-frame lazy tile sources would blank the first playback pass.
//
// Rainbow serves 256 px tiles on the standard web-mercator grid, which is the
// same grid core/radarView.ts snaps to, so a frame is exactly the rectangle's
// cells drawn at their own offsets: no projection or resampling arithmetic
// here, and no chance of the stitched image drifting from where the map places
// it. Requesting one zoom level coarser is the caller's business (it passes a
// lower density), because every tile is a billed call.

import { CELL_PX, type SnappedView } from '../../core/radarView';

const loadTile = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

/**
 * One stitched frame. Null when any tile fails: the caller keeps the old
 * frame set rather than animating holes. A 429 from the worker's daily tile
 * budget arrives here as a failed image, which is the intended outcome — the
 * player holds what it has instead of showing gaps.
 */
export async function stitchRainbowFrame(
  api: string,
  layer: string,
  snapshotSec: number,
  fsec: number,
  v: SnappedView,
): Promise<string | null> {
  const jobs: { x: number; y: number; col: number; row: number }[] = [];
  for (let col = 0; col < v.nx; col += 1)
    for (let row = 0; row < v.ny; row += 1) jobs.push({ x: v.x0 + col, y: v.y0 + row, col, row });

  const imgs = await Promise.all(
    jobs.map((j) =>
      loadTile(`${api}/api/rain/tile/${layer}/${snapshotSec}/${fsec}/${v.z}/${j.x}/${j.y}.png`),
    ),
  );
  if (imgs.some((i) => i == null)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = v.width;
  canvas.height = v.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  jobs.forEach((j, i) => {
    ctx.drawImage(imgs[i]!, j.col * CELL_PX, j.row * CELL_PX, CELL_PX, CELL_PX);
  });
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
