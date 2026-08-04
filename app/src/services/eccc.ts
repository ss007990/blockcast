// Active ECCC weather alerts for a point, from the GeoMet OGC API
// (api.weather.gc.ca — CORS-open, bilingual fields built in).

export interface EcccAlert {
  nameEn: string;
  nameFr: string;
  textEn: string;
  textFr: string;
  /** warning | watch | statement | advisory (lowercase). */
  type: string;
  /** Region the alert covers, e.g. "Québec". */
  areaEn: string;
  areaFr: string;
  /** Event end, ISO — null when open-ended. */
  ends: string | null;
}

interface AlertFeature {
  properties: {
    alert_name_en?: string;
    alert_name_fr?: string;
    alert_text_en?: string;
    alert_text_fr?: string;
    alert_type?: string;
    feature_name_en?: string;
    feature_name_fr?: string;
    event_end_datetime?: string | null;
    status_en?: string;
  };
}

const BOX = 0.15; // ± degrees around the point

export async function fetchEcccAlerts(lat: number, lon: number): Promise<EcccAlert[]> {
  const u = new URL('https://api.weather.gc.ca/collections/weather-alerts/items');
  u.search = new URLSearchParams({
    f: 'json',
    limit: '10',
    bbox: [lon - BOX, lat - BOX, lon + BOX, lat + BOX].map((v) => v.toFixed(3)).join(','),
  }).toString();
  try {
    const res = await fetch(u);
    if (!res.ok) return [];
    const j = (await res.json()) as { features?: AlertFeature[] };
    return (j.features ?? [])
      .map((f) => f.properties)
      .filter((p) => p.alert_name_en && p.status_en?.toLowerCase() !== 'ended')
      .map((p) => ({
        nameEn: p.alert_name_en ?? '',
        nameFr: p.alert_name_fr ?? p.alert_name_en ?? '',
        textEn: p.alert_text_en ?? '',
        textFr: p.alert_text_fr ?? p.alert_text_en ?? '',
        type: (p.alert_type ?? 'statement').toLowerCase(),
        areaEn: p.feature_name_en ?? '',
        areaFr: p.feature_name_fr ?? p.feature_name_en ?? '',
        ends: p.event_end_datetime ?? null,
      }));
  } catch {
    return [];
  }
}
