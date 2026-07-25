import { distKm, expandLocAbbrev, normTxt, type GeoResult } from '../core/geo';
import type { Lang } from '../i18n';

async function fetchCities(name: string, lang: Lang): Promise<GeoResult[]> {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=20&language=${lang}`,
  );
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: GeoResult[] };
  return j.results ?? [];
}

async function searchCities(name: string, lang: Lang): Promise<GeoResult[]> {
  const out = await fetchCities(name, lang);
  if (out.length) return out;
  const expanded = expandLocAbbrev(name);
  return expanded === name ? out : fetchCities(expanded, lang);
}

// The city geocoder only knows populated places — a ski resort, peak, or
// lake ("Le Valinouët") returns nothing. Photon (OSM) fills that gap; this
// whitelist maps outdoor-relevant OSM tags to a kind id (i18n'd in the UI)
// and drops the noise (streets, buildings, shops).
const POI_KINDS: Record<string, string | undefined> = {
  'leisure/sports_centre': 'resort',
  'leisure/resort': 'resort',
  'leisure/beach_resort': 'beach',
  'leisure/golf_course': 'golf',
  'leisure/marina': 'marina',
  'leisure/park': 'park',
  'leisure/nature_reserve': 'park',
  'landuse/winter_sports': 'ski',
  'landuse/forest': 'forest',
  'landuse/recreation_ground': 'park',
  'natural/peak': 'peak',
  'natural/beach': 'beach',
  'natural/bay': 'bay',
  'natural/island': 'island',
  'natural/water': 'lake',
  'water/lake': 'lake',
  'water/reservoir': 'lake',
  'waterway/river': 'river',
  'waterway/waterfall': 'falls',
  'tourism/camp_site': 'camp',
  'tourism/alpine_hut': 'hut',
  'tourism/wilderness_hut': 'hut',
  'tourism/viewpoint': 'viewpoint',
  'mountain_pass/yes': 'pass',
};

interface PhotonFeature {
  properties: {
    name?: string;
    osm_key?: string;
    osm_value?: string;
    state?: string;
    county?: string;
    country?: string;
    countrycode?: string;
  };
  geometry?: { coordinates?: [number, number] };
}

async function fetchPhoton(name: string, lang: Lang): Promise<GeoResult[]> {
  try {
    const r = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(name)}&limit=12&lang=${lang}`,
    );
    if (!r.ok) return [];
    const j = (await r.json()) as { features?: PhotonFeature[] };
    const out: GeoResult[] = [];
    for (const f of j.features ?? []) {
      const p = f.properties;
      const [lon, lat] = f.geometry?.coordinates ?? [];
      if (!p.name || lat == null || lon == null) continue;
      const kind = POI_KINDS[`${p.osm_key}/${p.osm_value}`];
      if (!kind && p.osm_key !== 'place') continue;
      out.push({
        name: p.name,
        latitude: lat,
        longitude: lon,
        admin1: p.state,
        admin2: p.county,
        country: p.country,
        country_code: p.countrycode,
        kind,
      });
    }
    return out;
  } catch {
    return []; // POI search is an enhancement — city search still stands
  }
}

/** Cities and outdoor spots, merged: Open-Meteo (population-ranked
 * localities) plus Photon POIs, minus duplicates of the same place. */
export async function searchPlaces(name: string, lang: Lang): Promise<GeoResult[]> {
  const [cities, pois] = await Promise.all([searchCities(name, lang), fetchPhoton(name, lang)]);
  const out = [...cities];
  for (const p of pois) {
    const dup = out.some(
      (c) =>
        normTxt(c.name) === normTxt(p.name) &&
        distKm({ lat: c.latitude, lon: c.longitude }, { lat: p.latitude, lon: p.longitude }) < 5,
    );
    if (!dup) out.push(p);
  }
  return out;
}

/** Best-effort reverse geocode for naming a map-picked spot. */
export async function reverseGeocode(lat: number, lon: number, lang: Lang): Promise<string> {
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`,
    );
    const j = (await r.json()) as { locality?: string; city?: string; principalSubdivision?: string };
    return j.locality || j.city || j.principalSubdivision || '';
  } catch {
    return ''; // offline reverse geocode is optional
  }
}
