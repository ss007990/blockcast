// Which national weather service covers a point, and which measurement
// conventions a first-run user expects.
//
// The NWS answers 400 for a point outside the United States and ECCC has
// no alert zones south of the border, so a point must be assigned to one
// country, not a bounding box. The border below is piecewise by longitude:
// exact where the boundary is a parallel (49°N, 45°N), a mid-lake line
// through the Great Lakes, and a coarse cut through Maine and the Alaska
// panhandle. Twin towns that straddle a river (Windsor/Detroit, the two
// Niagara Falls) can land on the wrong side; the cost is the other
// country's air-quality index, not a missing alert.

export type Country = 'US' | 'CA';

/** Latitude of the US–Canada border at a longitude east of the Rockies'
 * 49th-parallel stretch; the Great Lakes, St Lawrence and Maine segments. */
function borderLat(lon: number): number {
  if (lon < -123.3) return 48.3; // Strait of Juan de Fuca
  if (lon < -95.15) return 49.0; // the 49th parallel
  if (lon < -89.5) return 48.6; // Lake of the Woods, Rainy River
  if (lon < -84.8) return 47.5; // Lake Superior
  if (lon < -83.2) return 46.0; // St Marys River, northern Lake Huron
  if (lon < -82.4) return 42.6; // Lake St Clair, Detroit and St Clair rivers
  if (lon < -79.1) return 42.5; // Lake Erie
  if (lon < -77.0) return 43.3; // western Lake Ontario
  if (lon < -76.4) return 43.7; // eastern Lake Ontario
  if (lon < -74.7) return 44.75; // Thousand Islands, St Lawrence
  if (lon < -71.5) return 45.0; // Québec–NY/VT/NH line
  if (lon < -70.0) return 45.4; // Québec–Maine highlands
  if (lon < -68.4) return 47.3; // St John River, northern Maine
  if (lon < -67.8) return 47.0; // Madawaska, Aroostook
  return 45.3; // St Croix, Passamaquoddy Bay
}

/** Latitude of the US–Mexico border at a longitude: the California line,
 * the Arizona diagonal, the New Mexico steps, then the Rio Grande. Twin
 * cities on the river (El Paso/Juárez, the two Nogales) share one side. */
function southBorderLat(lon: number): number {
  if (lon < -114.8) return 32.55; // California
  if (lon < -111.1) return 32.5 - ((lon + 114.8) / 3.7) * 1.17; // Arizona diagonal
  if (lon < -108.2) return 31.33; // Arizona, New Mexico bootheel
  if (lon < -106.5) return 31.78; // New Mexico
  if (lon < -104.5) return 30.5; // El Paso to Presidio
  if (lon < -102.5) return 29.0; // Big Bend
  if (lon < -100.5) return 29.2; // Del Rio
  if (lon < -99.0) return 27.3; // Eagle Pass, Laredo
  if (lon < -97.0) return 25.85; // lower Rio Grande valley
  return 24.4; // Gulf coast and Florida, down to Key West
}

/** The Alaska panhandle: a coastal strip that widens northward; Yukon and
 * northern BC sit east of the line. Above 60.3°N the border is 141°W. */
function inAlaska(lat: number, lon: number): boolean {
  if (lat < 51 || lat > 71.6) return false;
  if (lon > 0) return lon >= 172; // Aleutians beyond the antimeridian
  if (lat >= 60.3) return lon < -141;
  return lat >= 54.6 && lon < -(130 + (lat - 54.5) * 1.05);
}

export function countryOf(lat: number, lon: number): Country | null {
  if (inAlaska(lat, lon)) return 'US';
  if (lat >= 18.8 && lat <= 22.4 && lon >= -160.4 && lon <= -154.7) return 'US'; // Hawaii
  if (lat >= 17.6 && lat <= 18.6 && lon >= -67.4 && lon <= -64.5) return 'US'; // Puerto Rico, USVI
  if (lon < -141.1 || lon > -52.5) return null;
  if (lat >= 41.6 && lat <= 83.2 && lat >= borderLat(lon)) return 'CA';
  if (lat >= 24.4 && lat <= 49.4 && lon >= -125.0 && lon <= -66.9 && lat >= southBorderLat(lon))
    return 'US';
  return null;
}

export const inUsa = (lat: number, lon: number): boolean => countryOf(lat, lon) === 'US';
export const inCanada = (lat: number, lon: number): boolean => countryOf(lat, lon) === 'CA';

/** Region subtag of a BCP 47 tag ("en-US" → "US", "fr" → ""). */
export function regionOf(navLang: string | undefined): string {
  const parts = (navLang ?? '').split(/[-_]/);
  for (const p of parts.slice(1)) if (/^[A-Za-z]{2}$/.test(p)) return p.toUpperCase();
  return '';
}

/** Countries whose everyday weather is in °F and mph. */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

export function detectUnits(navLang: string | undefined): 'metric' | 'imperial' {
  return IMPERIAL_REGIONS.has(regionOf(navLang)) ? 'imperial' : 'metric';
}

/** Americans read 3 PM, not 15:00; everyone else keeps the app's 24 h default. */
export function detectClock(navLang: string | undefined): '12h' | '24h' {
  return regionOf(navLang) === 'US' ? '12h' : '24h';
}
