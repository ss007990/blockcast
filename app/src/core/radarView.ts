// Canonical geometry for a radar frame request.
//
// The app used to ask GeoMet for exactly the visible bbox, which meant every
// user, at every pan position, generated a unique URL: nothing could be
// cached, and upstream load grew linearly with users against a free public
// service that asks anyone over 86,400 requests/day to get in touch.
//
// So a request is no longer "my viewport". It is a rectangle of cells on the
// standard web-mercator grid: (zoom, x0, y0, nx, ny) with 256 px per cell.
// Two people looking at the same city at the same zoom produce the same
// rectangle, hence the same URL, hence one upstream fetch and an edge-cache
// hit for everyone after the first. The image covers slightly more than the
// viewport; the map clips it.
//
// Both sides need this identical arithmetic — the app to place the overlay,
// the worker to rebuild the bbox it will ask GeoMet for — so it lives in core
// and is imported by each.

/** Web-mercator world extent in metres (2πR at the equator). */
export const WORLD = 40075016.6855784;
const R = 6378137;
/** Image pixels per grid cell. Also the WMS width/height quantum. */
export const CELL_PX = 256;
/** Radar is a 1 km product; past this, zoom buys nothing but bytes. */
const MAX_Z = 12;
/** Keep WMS width/height within limits every server tolerates. */
const MAX_CELLS = 8; // 8 * 256 = 2048 px per axis

export interface CellRect {
  /** grid zoom, in the 256 px tile convention */
  z: number;
  /** west and north cell indices */
  x0: number;
  y0: number;
  /** cell counts, at least 1 */
  nx: number;
  ny: number;
}

export type Corners = [[number, number], [number, number], [number, number], [number, number]];

export interface SnappedView extends CellRect {
  /** snapped EPSG:3857 bounds, [xmin, ymin, xmax, ymax] */
  bbox: [number, number, number, number];
  /** WMS image size in pixels */
  width: number;
  height: number;
  /** overlay corners as [lon, lat]: [w,n] [e,n] [e,s] [w,s] */
  coords: Corners;
  /** image pixels per CSS pixel, for pixel-space effects like the model blur */
  scale: number;
}

export const mercX = (lon: number): number => R * ((lon * Math.PI) / 180);
export const mercY = (lat: number): number =>
  R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

const lonOf = (x: number): number => (x / R) * (180 / Math.PI);
const latOf = (y: number): number =>
  (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);

const cellSpan = (z: number): number => WORLD / 2 ** z;

/** Rebuild the snapped mercator bbox from a cell rectangle. The worker does
 * this to derive the bbox it asks GeoMet for, so the client cannot name an
 * arbitrary one. */
export function rectBbox(r: CellRect): [number, number, number, number] {
  const span = cellSpan(r.z);
  const half = WORLD / 2;
  return [
    r.x0 * span - half,
    half - (r.y0 + r.ny) * span,
    (r.x0 + r.nx) * span - half,
    half - r.y0 * span,
  ];
}

/** Corner coordinates of a cell rectangle, in the order an image overlay wants. */
export function rectCorners(r: CellRect): Corners {
  const [xmin, ymin, xmax, ymax] = rectBbox(r);
  const w = lonOf(xmin);
  const e = lonOf(xmax);
  const n = latOf(ymax);
  const s = latOf(ymin);
  return [
    [w, n],
    [e, n],
    [e, s],
    [w, s],
  ];
}

/** True when a rectangle is inside the grid and within the size limits. The
 * worker validates every request with this before touching GeoMet. */
export function isValidRect(r: CellRect): boolean {
  if (!Number.isInteger(r.z) || r.z < 0 || r.z > MAX_Z) return false;
  for (const v of [r.x0, r.y0, r.nx, r.ny]) if (!Number.isInteger(v)) return false;
  if (r.nx < 1 || r.ny < 1 || r.nx > MAX_CELLS || r.ny > MAX_CELLS) return false;
  const n = 2 ** r.z;
  return r.x0 >= 0 && r.y0 >= 0 && r.x0 + r.nx <= n && r.y0 + r.ny <= n;
}

/** The cells covering `bounds` at one zoom, clamped into the grid. */
function coverAt(
  bounds: { xmin: number; ymin: number; xmax: number; ymax: number },
  z: number,
): CellRect {
  const span = cellSpan(z);
  const half = WORLD / 2;
  const n = 2 ** z;
  const x0 = Math.max(0, Math.min(n - 1, Math.floor((bounds.xmin + half) / span)));
  const y0 = Math.max(0, Math.min(n - 1, Math.floor((half - bounds.ymax) / span)));
  const x1 = Math.max(x0 + 1, Math.min(n, Math.ceil((bounds.xmax + half) / span)));
  const y1 = Math.max(y0 + 1, Math.min(n, Math.ceil((half - bounds.ymin) / span)));
  return { z, x0, y0, nx: x1 - x0, ny: y1 - y0 };
}

/**
 * The cell rectangle covering a viewport.
 *
 * `bounds` is the visible extent in EPSG:3857 metres, `mapZoom` the map's own
 * zoom (MapLibre's 512 px tile convention), `density` the image pixels wanted
 * per CSS pixel (a capped devicePixelRatio; below 1 asks for a coarser grid).
 *
 * Resolution comes from the zoom rather than from measuring the container,
 * deliberately: a container can report a zero dimension mid-layout, and
 * dividing by that produced a request for the entire planet in one 256 px
 * image — valid, cacheable, and useless. Zoom is authoritative and always set.
 *
 * Zoom steps down until the rectangle fits the size limit, so a very wide
 * window gets a slightly coarser frame rather than an oversized one.
 * Rectangles are clamped into the grid, which also means the antimeridian is
 * never crossed: the ECCC composite does not span it.
 */
export function snapView(
  bounds: { xmin: number; ymin: number; xmax: number; ymax: number },
  mapZoom: number,
  density: number,
): SnappedView {
  // 512 px tiles at mapZoom carry the same resolution as 256 px tiles one
  // level deeper, hence the +1; density shifts it to match the screen.
  //
  // Floor rather than round, on purpose. Rounding up crossed a grid level and,
  // with cells padded out to 256 px boundaries, asked for roughly 2.5x the
  // pixels the old viewport-exact request did. The underlying composite is a
  // 1 km product: at these levels a frame is already finer than its own data,
  // so the extra level bought bytes on a phone connection and nothing visible.
  const d = Math.max(0.25, density);
  const z0 = Math.max(0, Math.min(MAX_Z, Math.floor(mapZoom + 1 + Math.log2(d))));

  let z = z0;
  let rect = coverAt(bounds, z);
  // too many cells for one image: a coarser level quarters them
  while (z > 0 && (rect.nx > MAX_CELLS || rect.ny > MAX_CELLS)) {
    z -= 1;
    rect = coverAt(bounds, z);
  }

  // image px per CSS px: the requested density, reduced by any step-down
  return {
    ...rect,
    bbox: rectBbox(rect),
    width: rect.nx * CELL_PX,
    height: rect.ny * CELL_PX,
    coords: rectCorners(rect),
    scale: d * 2 ** (rect.z - z0),
  };
}
