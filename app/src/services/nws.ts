// Active US National Weather Service alerts for a point (api.weather.gov:
// free, keyless, CORS-open). Mapped onto the same shape as the ECCC feed so
// the Today banner does not care which country it is standing in. The NWS
// publishes in English only; the French fields carry the English text.

import type { WeatherAlert } from './eccc';

interface NwsFeature {
  properties: {
    event?: string;
    headline?: string;
    description?: string;
    instruction?: string | null;
    areaDesc?: string;
    status?: string; // Actual | Exercise | System | Test | Draft
    messageType?: string; // Alert | Update | Cancel
    ends?: string | null;
    expires?: string | null;
  };
}

/** "Winter Storm Warning" → warning, "Flood Watch" → watch, "Wind Advisory"
 * → advisory, everything else (statements, outlooks) → statement, matching
 * the ECCC vocabulary the banner already ranks and colours. */
export function nwsAlertType(event: string): string {
  const e = event.toLowerCase();
  if (e.includes('warning')) return 'warning';
  if (e.includes('watch')) return 'watch';
  if (e.includes('advisory')) return 'advisory';
  return 'statement';
}

export function mapNwsFeatures(features: NwsFeature[]): WeatherAlert[] {
  return features
    .map((f) => f.properties)
    .filter(
      (p) =>
        p.event &&
        (p.status ?? 'Actual') === 'Actual' &&
        (p.messageType ?? 'Alert') !== 'Cancel',
    )
    .map((p) => {
      const name = p.event ?? '';
      const text = [p.description, p.instruction].filter(Boolean).join('\n\n').trim();
      const area = p.areaDesc ?? '';
      return {
        nameEn: name,
        nameFr: name,
        textEn: text,
        textFr: text,
        type: nwsAlertType(name),
        areaEn: area,
        areaFr: area,
        ends: p.ends ?? p.expires ?? null,
      };
    });
}

export async function fetchNwsAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  const u = new URL('https://api.weather.gov/alerts/active');
  // the API rejects points given to more than four decimals
  u.search = new URLSearchParams({ point: `${lat.toFixed(4)},${lon.toFixed(4)}` }).toString();
  try {
    const res = await fetch(u, { headers: { Accept: 'application/geo+json' } });
    if (!res.ok) return [];
    const j = (await res.json()) as { features?: NwsFeature[] };
    return mapNwsFeatures(j.features ?? []);
  } catch {
    return [];
  }
}
