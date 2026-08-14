// Stitch Rainbow AI XYZ tiles (via the worker proxy) into one image for the
// visible bbox, drop-in compatible with the single-image-per-frame pipeline
// the radar player uses for GeoMet. Stitching client-side keeps the
// preload-then-play behaviour; per-frame lazy tile sources would blank the
// first playback pass.

const WORLD = 2 * Math.PI * 6378137;
const MAX_Z = 12; // Rainbow's precip tiles stop at zoom 12

export interface StitchView {
  /** EPSG:3857 metres */
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  /** output image size in px */
  w: number;
  h: number;
  /** map zoom (512px-tile convention, as MapLibre reports it) */
  zoom: number;
  /** CSS px → image px factor */
  scale: number;
}

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
 * frame set rather than animating holes.
 */
export async function stitchRainbowFrame(
  api: string,
  layer: string,
  snapshotSec: number,
  fsec: number,
  v: StitchView,
): Promise<string | null> {
  // +1 converts MapLibre's 512px-tile zoom to the 256px XYZ convention;
  // log2(scale) keeps tile resolution in step with the device pixel ratio
  const z = Math.max(0, Math.min(MAX_Z, Math.round(v.zoom + Math.log2(v.scale)) + 1));
  const n = 2 ** z;
  const span = WORLD / n;
  const tx0 = Math.max(0, Math.floor((v.xmin + WORLD / 2) / span));
  const tx1 = Math.min(n - 1, Math.floor((v.xmax + WORLD / 2) / span));
  const ty0 = Math.max(0, Math.floor((WORLD / 2 - v.ymax) / span));
  const ty1 = Math.min(n - 1, Math.floor((WORLD / 2 - v.ymin) / span));

  const jobs: { x: number; y: number }[] = [];
  for (let x = tx0; x <= tx1; x += 1)
    for (let y = ty0; y <= ty1; y += 1) jobs.push({ x, y });
  const imgs = await Promise.all(
    jobs.map((j) =>
      loadTile(`${api}/api/rain/tile/${layer}/${snapshotSec}/${fsec}/${z}/${j.x}/${j.y}.png`),
    ),
  );
  if (imgs.some((i) => i == null)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = v.w;
  canvas.height = v.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const sx = v.w / (v.xmax - v.xmin);
  const sy = v.h / (v.ymax - v.ymin);
  jobs.forEach((j, i) => {
    const mx0 = j.x * span - WORLD / 2;
    const my0 = WORLD / 2 - j.y * span; // tile top edge
    ctx.drawImage(imgs[i]!, (mx0 - v.xmin) * sx, (v.ymax - my0) * sy, span * sx, span * sy);
  });
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
