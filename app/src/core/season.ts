// Season awareness — decides how "winter" the week looks so the UI can put
// winter sports first when snow is on the ground (and last in July).
// Never hides activities; ordering only.

import { ACTIVITY_IDS, isWinterActivity, type ActivityId } from './activities';
import type { ForecastData } from './forecast';
import { forecastDayKeys } from './forecast';

export interface SeasonSignals {
  /** Latitude of the forecast location (hemisphere). */
  lat: number;
  /** Month at the location, 0–11. */
  month: number;
  /** Highest felt temperature over the coming week, °C (null = unknown). */
  weekMaxTemp: number | null;
  /** Deepest snow cover over the coming week, cm (null = unknown). */
  weekMaxSnowCm: number | null;
}

/** 0 = deep summer, 1 = deep winter. */
export function winterScore(s: SeasonSignals): number {
  // calendar prior: Dec–Feb are winter in the north, Jun–Aug in the south
  const CAL = [1, 1, 0.7, 0.3, 0, 0, 0, 0, 0, 0.3, 0.7, 1] as const;
  const month = s.lat >= 0 ? s.month : (s.month + 6) % 12;
  const calendar = CAL[month] ?? 0;
  // live signals beat the calendar: snow on the ground is winter, full stop
  const snow = s.weekMaxSnowCm == null ? calendar : s.weekMaxSnowCm >= 10 ? 1 : s.weekMaxSnowCm / 10;
  const cold =
    s.weekMaxTemp == null ? calendar : s.weekMaxTemp <= 0 ? 1 : s.weekMaxTemp >= 12 ? 0 : (12 - s.weekMaxTemp) / 12;
  return Math.min(1, 0.3 * calendar + 0.45 * snow + 0.25 * cold + (snow >= 1 ? 0.25 : 0));
}

export const isWinter = (s: SeasonSignals): boolean => winterScore(s) >= 0.5;

/** Read the season signals out of a loaded forecast. */
export function seasonSignals(data: ForecastData, lat: number, todayISO: string): SeasonSignals {
  const days = forecastDayKeys(data);
  let weekMaxTemp: number | null = null;
  let weekMaxSnowCm: number | null = null;
  for (const d of days) {
    for (const h of data.days[d] ?? []) {
      if (!h) continue;
      weekMaxTemp = Math.max(weekMaxTemp ?? -Infinity, h.temp);
      weekMaxSnowCm = Math.max(weekMaxSnowCm ?? 0, h.sdep * 100);
    }
  }
  return { lat, month: +todayISO.slice(5, 7) - 1, weekMaxTemp, weekMaxSnowCm };
}

/** Activity picker order: winter sports first in winter, last otherwise. */
export function orderActivities(winter: boolean): ActivityId[] {
  const snow = ACTIVITY_IDS.filter(isWinterActivity);
  const rest = ACTIVITY_IDS.filter((id) => !isWinterActivity(id));
  return winter ? [...snow, ...rest] : [...rest, ...snow];
}
