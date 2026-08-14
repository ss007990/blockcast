// Frame plan for the future radar: ECCC observed radar for the last hour,
// ECCC's official PySTEPS extrapolation (a real nowcast, 6-min steps out to
// about +72 min) for the first stretch ahead, then HRDPS model rain beyond.
// MSC GeoMet advertises each layer's availability as a WMS time dimension
// like
//   "2026-08-06T10:54:00Z/2026-08-06T13:54:00Z/PT6M"
// and a GetMap outside that window comes back blank, so the frame list is
// built from what the server says it has, never from the wall clock.

export interface WmsTimeDim {
  /** ms epoch of the first available frame */
  start: number;
  /** ms epoch of the latest available frame */
  end: number;
  /** frame step in ms */
  stepMs: number;
}

const DIM_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\/PT(?:(\d+)H)?(?:(\d+)M)?$/;

/** Parse a GeoMet `start/end/PTnM` time dimension. Null on anything else. */
export function parseWmsTimeDim(text: string): WmsTimeDim | null {
  const m = DIM_RE.exec(text.trim());
  if (!m) return null;
  const start = Date.parse(m[1]!);
  const end = Date.parse(m[2]!);
  const stepMs = (Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0)) * 60_000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || stepMs <= 0 || end < start) return null;
  return { start, end, stepMs };
}

/** Pull the time dimension for a layer out of a filtered GetCapabilities
 * document without dragging in an XML parser. */
export function timeDimFromCapabilities(xml: string): WmsTimeDim | null {
  const m = /<Dimension[^>]*name="time"[^>]*>([^<]+)<\/Dimension>/.exec(xml);
  return m ? parseWmsTimeDim(m[1]!) : null;
}

export type FrameKind = 'radar' | 'nowcast' | 'model';

export interface RadarFrame {
  /** ms epoch this frame is valid for (WMS TIME) */
  time: number;
  /** observed composite, ECCC extrapolation, or model forecast */
  kind: FrameKind;
}

/** First grid time strictly after `afterMs` on `dim`'s step grid. */
const firstAfter = (dim: WmsTimeDim, afterMs: number): number =>
  afterMs < dim.start
    ? dim.start
    : dim.start + Math.ceil((afterMs + 1 - dim.start) / dim.stepMs) * dim.stepMs;

/**
 * Observed frames for the trailing `pastMin` minutes, every extrapolation
 * step the nowcast layer advertises after the latest observation, then model
 * frames for each step after the nowcast runs out, out to `aheadH` hours.
 * The latest radar frame is "now"; everything after it is forecast. Either
 * forecast source may be null (layer down or absent): the plan simply
 * continues with whatever remains.
 */
/**
 * Rainbow AI timeline: 10-minute analysis snapshots for the trailing
 * `pastMin` minutes, then its ML nowcast every 10 minutes out to `aheadMin`.
 * The snapshot itself is "now"; older snapshots serve the past, forecast
 * offsets against the latest snapshot serve the future.
 */
export function buildRainbowFrames(
  snapshotMs: number,
  { pastMin = 60, aheadMin = 240 }: { pastMin?: number; aheadMin?: number } = {},
): RadarFrame[] {
  const step = 600_000;
  const frames: RadarFrame[] = [];
  const from = snapshotMs - Math.floor((pastMin * 60_000) / step) * step;
  for (let t = from; t <= snapshotMs; t += step) frames.push({ time: t, kind: 'radar' });
  const to = snapshotMs + Math.floor((aheadMin * 60_000) / step) * step;
  for (let t = snapshotMs + step; t <= to; t += step) frames.push({ time: t, kind: 'nowcast' });
  return frames;
}

export function buildRadarFrames(
  radar: WmsTimeDim,
  nowcast: WmsTimeDim | null,
  model: WmsTimeDim | null,
  { pastMin = 60, aheadH = 6 }: { pastMin?: number; aheadH?: number } = {},
): RadarFrame[] {
  const frames: RadarFrame[] = [];
  const from = Math.max(radar.start, radar.end - pastMin * 60_000);
  for (let t = radar.end; t >= from; t -= radar.stepMs) frames.unshift({ time: t, kind: 'radar' });

  let lastFuture = radar.end;
  if (nowcast && nowcast.end > radar.end) {
    for (let t = firstAfter(nowcast, radar.end); t <= nowcast.end; t += nowcast.stepMs)
      frames.push({ time: t, kind: 'nowcast' });
    lastFuture = nowcast.end;
  }
  if (model) {
    const to = Math.min(model.end, radar.end + aheadH * 3_600_000);
    for (let t = firstAfter(model, lastFuture); t <= to; t += model.stepMs)
      frames.push({ time: t, kind: 'model' });
  }
  return frames;
}
