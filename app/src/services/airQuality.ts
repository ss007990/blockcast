// Canadian AQHI computed from the Open-Meteo air-quality API.
// ECCC's formula combines 3-hour means of O3 and NO2 (ppb) and PM2.5 (µg/m³):
//   AQHI = 10/10.4 × 100 × [(e^(0.000537·O3) − 1) + (e^(0.000871·NO2) − 1)
//                            + (e^(0.000487·PM2.5) − 1)]
// Open-Meteo reports gases in µg/m³, so O3 and NO2 are converted to ppb first.

export interface AirQuality {
  /** AQHI, 1–11+ (11 shown as "11+"). */
  aqhi: number;
  /** 0 low (1–3) · 1 moderate (4–6) · 2 high (7–10) · 3 very high (11+). */
  risk: 0 | 1 | 2 | 3;
}

interface AqResponse {
  hourly: {
    time: string[];
    pm2_5: (number | null)[];
    nitrogen_dioxide: (number | null)[];
    ozone: (number | null)[];
  };
}

const UG_PER_PPB_O3 = 2.0;
const UG_PER_PPB_NO2 = 1.88;

export async function fetchAqhi(lat: number, lon: number): Promise<AirQuality | null> {
  const u = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  u.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    past_days: '1',
    forecast_days: '1',
    hourly: 'pm2_5,nitrogen_dioxide,ozone',
  }).toString();
  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    const j = (await res.json()) as AqResponse;
    const H = j.hourly;
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
    const o3 = mean(H.ozone) / UG_PER_PPB_O3;
    const no2 = mean(H.nitrogen_dioxide) / UG_PER_PPB_NO2;
    const pm25 = mean(H.pm2_5);

    const raw =
      (10 / 10.4) *
      100 *
      (Math.exp(0.000537 * o3) - 1 + (Math.exp(0.000871 * no2) - 1) + (Math.exp(0.000487 * pm25) - 1));
    const aqhi = Math.min(11, Math.max(1, Math.round(raw)));
    const risk: AirQuality['risk'] = aqhi <= 3 ? 0 : aqhi <= 6 ? 1 : aqhi <= 10 ? 2 : 3;
    return { aqhi, risk };
  } catch {
    return null;
  }
}
