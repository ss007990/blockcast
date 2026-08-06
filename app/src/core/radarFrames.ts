// Frame plan for the hybrid future radar: ECCC observed radar for the last
// hour, then HRDPS model rain for the hours ahead. MSC GeoMet advertises
// each layer's availability as a WMS time dimension like
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

export interface RadarFrame {
  /** ms epoch this frame is valid for (WMS TIME). */
  time: number;
  /** observed radar or model forecast */
  kind: 'radar' | 'model';
}

/**
 * Observed frames for the trailing `pastMin` minutes, then model frames for
 * every model step after the radar's latest image, out to `aheadH` hours.
 * The latest radar frame is "now"; everything after it is forecast.
 */
export function buildRadarFrames(
  radar: WmsTimeDim,
  model: WmsTimeDim,
  { pastMin = 60, aheadH = 6 }: { pastMin?: number; aheadH?: number } = {},
): RadarFrame[] {
  const frames: RadarFrame[] = [];
  const from = Math.max(radar.start, radar.end - pastMin * 60_000);
  for (let t = radar.end; t >= from; t -= radar.stepMs) frames.unshift({ time: t, kind: 'radar' });

  // first model step strictly after the radar's "now"
  const first = model.start + Math.ceil((radar.end + 1 - model.start) / model.stepMs) * model.stepMs;
  const to = Math.min(model.end, radar.end + aheadH * 3_600_000);
  for (let t = first; t <= to; t += model.stepMs) frames.push({ time: t, kind: 'model' });
  return frames;
}
