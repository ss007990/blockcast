// Which source feeds the future radar where. The ECCC 1 km North American
// composite (and its extrapolation nowcast) merges every Canadian and US
// NEXRAD radar, so one free source covers the continent; everywhere else
// Rainbow AI's ML nowcast takes over (radar+satellite derived, most of the
// developed world). The decision is a static geometry check: probing a live
// radar frame for pixels conflates "dry right now" with "no coverage" and
// mis-picks the source on clear days.

export type RadarProvider = 'eccc' | 'rainbow';

// Generous box around the ECCC composite's useful reach: continental US up
// to the northern edge of Canadian radar coverage. Alaska, Hawaii and the
// territories north of the radar network fall to the Rainbow tier.
const LAT = [24, 62] as const;
const LON = [-140, -52] as const;

export function radarProvider(lat: number, lon: number): RadarProvider {
  return lat >= LAT[0] && lat <= LAT[1] && lon >= LON[0] && lon <= LON[1] ? 'eccc' : 'rainbow';
}
