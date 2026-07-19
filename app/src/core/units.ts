// Unit conversion + formatting. The whole app stores metric internally
// (°C, km/h, mm, cm) — imperial is a display concern only.

export type UnitSystem = 'metric' | 'imperial';
export type ClockFormat = '12h' | '24h';

export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const fToC = (f: number): number => ((f - 32) * 5) / 9;
export const kmhToMph = (k: number): number => k / 1.609344;
export const mmToIn = (mm: number): number => mm / 25.4;
export const cmToIn = (cm: number): number => cm / 2.54;

export const formatTemp = (c: number, u: UnitSystem): string =>
  `${Math.round(u === 'imperial' ? cToF(c) : c)}°`;

export const formatTempUnit = (u: UnitSystem): string => (u === 'imperial' ? '°F' : '°C');

export const formatSpeed = (kmh: number, u: UnitSystem): string =>
  u === 'imperial' ? `${Math.round(kmhToMph(kmh))} mph` : `${Math.round(kmh)} km/h`;

export const formatPrecip = (mm: number, u: UnitSystem): string =>
  u === 'imperial' ? `${+mmToIn(mm).toFixed(2)} in` : `${+mm.toFixed(1)} mm`;

export const formatDepth = (cm: number, u: UnitSystem): string =>
  u === 'imperial' ? `${+cmToIn(cm).toFixed(1)} in` : `${Math.round(cm)} cm`;

export const mToFt = (m: number): number => m * 3.28084;

/** Wave/swell heights: metres, or feet in imperial. */
export const formatHeight = (m: number, u: UnitSystem): string =>
  u === 'imperial' ? `${+mToFt(m).toFixed(1)} ft` : `${+m.toFixed(1)} m`;

/** "14:00" or "2 PM". */
export function formatHour(h: number, clock: ClockFormat): string {
  const hh = h >= 24 ? h - 24 : h;
  if (clock === '24h') return String(h === 24 ? 24 : hh).padStart(2, '0') + ':00';
  if (hh === 0) return '12 AM';
  if (hh === 12) return '12 PM';
  return hh < 12 ? `${hh} AM` : `${hh - 12} PM`;
}

/** "14:00 – 18:00" / "2 – 6 PM"-style range. */
export function formatHourRange(h0: number, h1: number, clock: ClockFormat): string {
  if (clock === '24h') return `${formatHour(h0, clock)} – ${h1 >= 24 ? '24:00' : formatHour(h1, clock)}`;
  return `${formatHour(h0, clock)} – ${formatHour(h1, clock)}`;
}
