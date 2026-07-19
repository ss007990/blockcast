// Location search helpers.
// The Open-Meteo geocoder matches the city NAME only ("Alma, Qc" → nothing)
// and ranks small foreign towns above big local ones, so we split off a
// ", region" qualifier, fetch a generous batch and filter/rank ourselves.

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  population?: number;
  admin1?: string;
  admin2?: string;
  country?: string;
  country_code?: string;
}

export const normTxt = (s: string): string =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const CA_PROV: Record<string, string> = {
  qc: 'quebec',
  on: 'ontario',
  bc: 'british columbia',
  ab: 'alberta',
  mb: 'manitoba',
  sk: 'saskatchewan',
  ns: 'nova scotia',
  nb: 'new brunswick',
  nl: 'newfoundland',
  pe: 'prince edward island',
  yt: 'yukon',
  nt: 'northwest territories',
  nu: 'nunavut',
};

// GeoNames stores "Saint"/"Sainte" spelled out, and the geocoder does no
// abbreviation expansion — "Port St Lucie" and "St-Jérôme" both return nothing.
const ABBREV: Record<string, string> = {
  st: 'Saint',
  ste: 'Sainte',
  ft: 'Fort',
  mt: 'Mount',
};

/** "Port St Lucie" → "Port Saint Lucie", "Ste-Foy" → "Sainte-Foy". */
export function expandLocAbbrev(name: string): string {
  return name.replace(
    /\b(st|ste|ft|mt)\.?(?=[ -])/gi,
    (m, a: string) => ABBREV[a.toLowerCase()] ?? m,
  );
}

export function parseLocQuery(q: string): { name: string; qual: string } {
  const i = q.indexOf(',');
  if (i < 0) return { name: q.trim(), qual: '' };
  return { name: q.slice(0, i).trim(), qual: normTxt(q.slice(i + 1)) };
}

/** Great-circle distance in km. */
export function distKm(a: LatLon, b: LatLon): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Keep results matching the qualifier (if it matches anything), float exact
 * name matches, then rank "close and big" first: from ref (the user's current
 * spot), one decade of population offsets ~1000 km of distance — so searching
 * "Alma" from Sherbrooke finds Alma QC, not Alma Nebraska.
 */
export function rankLocResults(
  results: GeoResult[],
  name: string,
  qual: string,
  ref: LatLon | null,
): GeoResult[] {
  let out = results;
  if (qual) {
    const want = CA_PROV[qual] ?? qual;
    const m = results.filter((x) =>
      [x.admin1, x.admin2, x.country, x.country_code].some((f) => f && normTxt(f).startsWith(want)),
    );
    if (m.length) out = m;
  }
  const names = new Set([normTxt(name), normTxt(expandLocAbbrev(name))]);
  const score = (x: GeoResult) =>
    Math.log10((x.population ?? 0) + 1) -
    (ref ? distKm(ref, { lat: x.latitude, lon: x.longitude }) / 1000 : 0);
  return out
    .map((x, i) => ({ x, exact: names.has(normTxt(x.name)) ? 0 : 1, s: -score(x), i }))
    .sort((a, b) => a.exact - b.exact || a.s - b.s || a.i - b.i)
    .map((o) => o.x);
}
