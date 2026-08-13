// Where the future radar has data. The ECCC 1 km North American composite
// (and its extrapolation nowcast) merges every Canadian and US NEXRAD radar,
// so one free source covers the continent. The decision is a static
// geometry check: probing a live radar frame for pixels conflates "dry
// right now" with "no coverage" and mis-picks the source on clear days.

export type RadarProvider = 'eccc' | 'none';

// Generous box around the composite's useful reach: continental US up to
// the northern edge of Canadian radar coverage. Alaska, Hawaii and the
// territories north of the radar network fall outside and get an explicit
// no-coverage message instead of a blank animation.
const LAT = [24, 62] as const;
const LON = [-140, -52] as const;

export function radarProvider(lat: number, lon: number): RadarProvider {
  return lat >= LAT[0] && lat <= LAT[1] && lon >= LON[0] && lon <= LON[1] ? 'eccc' : 'none';
}
