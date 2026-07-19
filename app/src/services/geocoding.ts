import type { GeoResult } from '../core/geo';
import type { Lang } from '../i18n';

export async function searchCities(name: string, lang: Lang): Promise<GeoResult[]> {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=20&language=${lang}`,
  );
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: GeoResult[] };
  return j.results ?? [];
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
