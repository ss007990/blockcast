// Air quality from the Open-Meteo air-quality API, on the index the user's
// country actually publishes:
//
// Canada: AQHI, computed here from ECCC's formula over 3-hour means of O3
// and NO2 (ppb) and PM2.5 (µg/m³):
//   AQHI = 10/10.4 × 100 × [(e^(0.000537·O3) − 1) + (e^(0.000871·NO2) − 1)
//                            + (e^(0.000487·PM2.5) − 1)]
// Open-Meteo reports gases in µg/m³, so O3 and NO2 are converted to ppb first.
//
// United States: the EPA AQI, which Open-Meteo already computes (us_aqi).

import { inUsa } from '../core/region';

export interface AirQuality {
  /** Which index `value` is on. */
  scale: 'aqhi' | 'aqi';
  /** AQHI 1–11 (11 shown as "11+"), or AQI 0–500. */
  value: number;
  /** Advice band shared by both scales:
   * 0 fine · 1 sensitive groups ease off · 2 reduce effort · 3 avoid effort. */
  risk: 0 | 1 | 2 | 3;
  /** EPA category, AQI only: 0 good · 1 moderate · 2 unhealthy for sensitive
   * groups · 3 unhealthy · 4 very unhealthy · 5 hazardous. */
  category?: 0 | 1 | 2 | 3 | 4 | 5;
}

interface AqResponse {
  current?: { us_aqi?: number | null };
  hourly?: {
    time: string[];
    pm2_5: (number | null)[];
    nitrogen_dioxide: (number | null)[];
    ozone: (number | null)[];
  };
}

const UG_PER_PPB_O3 = 2.0;
const UG_PER_PPB_NO2 = 1.88;

/** ECCC's AQHI from ppb O3, ppb NO2 and µg/m³ PM2.5, clamped to 1–11. */
export function aqhiFrom(o3ppb: number, no2ppb: number, pm25: number): number {
  const raw =
    (10 / 10.4) *
    100 *
    (Math.exp(0.000537 * o3ppb) - 1 + (Math.exp(0.000871 * no2ppb) - 1) + (Math.exp(0.000487 * pm25) - 1));
  return Math.min(11, Math.max(1, Math.round(raw)));
}

export function aqhiRisk(aqhi: number): AirQuality['risk'] {
  return aqhi <= 3 ? 0 : aqhi <= 6 ? 1 : aqhi <= 10 ? 2 : 3;
}

/** EPA breakpoints: 50 good · 100 moderate · 150 USG · 200 unhealthy · 300 very unhealthy. */
export function aqiCategory(aqi: number): NonNullable<AirQuality['category']> {
  return aqi <= 50 ? 0 : aqi <= 100 ? 1 : aqi <= 150 ? 2 : aqi <= 200 ? 3 : aqi <= 300 ? 4 : 5;
}

/** "Unhealthy for sensitive groups" carries the same advice as AQHI 4–6. */
export function aqiRisk(aqi: number): AirQuality['risk'] {
  return aqi <= 50 ? 0 : aqi <= 150 ? 1 : aqi <= 200 ? 2 : 3;
}

export function aqhiFromHourly(H: NonNullable<AqResponse['hourly']>): AirQuality | null {
  if (!H?.time?.length) return null;
  // mean of the last 3 hours with data (the series includes future hours,
  // but trailing future values are null-safe: we scan from the end of
  // whatever has numbers)
  let last = -1;
  for (let i = H.time.length - 1; i >= 0; i--) {
    if (H.pm2_5[i] != null || H.ozone[i] != null) {
      last = i;
      break;
    }
  }
  if (last < 0) return null;
  const mean = (a: (number | null)[]) => {
    let sum = 0;
    let n = 0;
    for (let i = Math.max(0, last - 2); i <= last; i++) {
      const v = a[i];
      if (v != null) {
        sum += v;
        n++;
      }
    }
    return n ? sum / n : 0;
  };
  const value = aqhiFrom(
    mean(H.ozone) / UG_PER_PPB_O3,
    mean(H.nitrogen_dioxide) / UG_PER_PPB_NO2,
    mean(H.pm2_5),
  );
  return { scale: 'aqhi', value, risk: aqhiRisk(value) };
}

export function aqiFromCurrent(aqi: number | null | undefined): AirQuality | null {
  if (aqi == null || !Number.isFinite(aqi)) return null;
  const value = Math.max(0, Math.round(aqi));
  return { scale: 'aqi', value, risk: aqiRisk(value), category: aqiCategory(value) };
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQuality | null> {
  const usa = inUsa(lat, lon);
  const u = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  u.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    ...(usa
      ? { current: 'us_aqi' }
      : { past_days: '1', forecast_days: '1', hourly: 'pm2_5,nitrogen_dioxide,ozone' }),
  }).toString();
  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    const j = (await res.json()) as AqResponse;
    return usa ? aqiFromCurrent(j.current?.us_aqi) : j.hourly ? aqhiFromHourly(j.hourly) : null;
  } catch {
    return null;
  }
}
