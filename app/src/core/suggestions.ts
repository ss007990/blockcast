// The "go out & play" engine: scan every remaining block of the week for a
// set of activities and surface the best windows, plus event triggers like a
// forecasted snowfall that makes skiing/snowmobiling worth a nudge.

import type { ActivityId, Criteria, CustomActivity } from './activities';
import { isWinterActivity } from './activities';
import type { ForecastData } from './forecast';
import { forecastDayKeys, getBlock } from './forecast';
import type { Band } from './scoring';
import { riskBand } from './scoring';

export interface SuggestionWindow {
  activityId: ActivityId;
  day: string;
  h: number;
  len: number;
  score: number;
  band: Band;
  isWeekend: boolean;
}

export interface SuggestOptions {
  activities: ActivityId[];
  critFor: (id: ActivityId) => Criteria;
  tolMult: number;
  blockLen: number;
  hFrom: number;
  hTo: number;
  /** Location-local "now". */
  todayISO: string;
  nowHour: number;
  /** Only windows at or below this score qualify (default: green band). */
  maxScore?: number;
  /** Cap on returned windows (default 6). */
  limit?: number;
}

const dayOfWeek = (dayISO: string): number => new Date(dayISO + 'T12:00').getDay();

/**
 * Best windows of the week, one per activity per day, chronological.
 * Only genuinely good blocks qualify — an empty list is honest, not a bug.
 */
export function bestWindows(data: ForecastData, o: SuggestOptions): SuggestionWindow[] {
  const maxScore = o.maxScore ?? 24;
  const limit = o.limit ?? 6;
  const out: SuggestionWindow[] = [];
  const days = forecastDayKeys(data);

  for (const id of o.activities) {
    const crit = o.critFor(id);
    for (const day of days) {
      if (day < o.todayISO) continue;
      let bestOfDay: SuggestionWindow | null = null;
      for (let h = o.hFrom; h < o.hTo; h += o.blockLen) {
        const len = Math.min(o.blockLen, o.hTo - h);
        if (day === o.todayISO && h + len <= o.nowHour) continue; // already over
        const b = getBlock(data, day, h, len, crit, o.tolMult);
        if (!b || b.score > maxScore) continue;
        if (!bestOfDay || b.score < bestOfDay.score) {
          const dow = dayOfWeek(day);
          bestOfDay = {
            activityId: id,
            day,
            h,
            len,
            score: b.score,
            band: riskBand(b.score),
            isWeekend: dow === 0 || dow === 6,
          };
        }
      }
      if (bestOfDay) out.push(bestOfDay);
    }
  }
  // best first, ties chronological — then cap
  return out
    .sort((a, b) => a.score - b.score || a.day.localeCompare(b.day) || a.h - b.h)
    .slice(0, limit)
    .sort((a, b) => a.day.localeCompare(b.day) || a.h - b.h || a.score - b.score);
}

export interface SnowfallEvent {
  /** Total snowfall forecast over the next 48 h, cm. */
  totalCm: number;
  /** Winter activities worth suggesting. */
  activities: ActivityId[];
}

/** ≥ thresholdCm of snow falling in the next 48 h → time to wax the skis. */
export function snowfallEvent(
  data: ForecastData,
  todayISO: string,
  nowHour: number,
  candidates: ActivityId[],
  thresholdCm = 5,
  customs?: readonly CustomActivity[],
): SnowfallEvent | null {
  const startKey = `${todayISO}T${String(nowHour).padStart(2, '0')}:00`;
  // timeIndex is insertion-ordered (chronological); find "now" or the first future hour
  let start: number | undefined = data.timeIndex.get(startKey);
  if (start === undefined) {
    for (const [t, i] of data.timeIndex) {
      if (t >= startKey) {
        start = i;
        break;
      }
    }
  }
  if (start === undefined) return null;
  let total = 0;
  for (let i = start; i < Math.min(start + 48, data.snowfall.length); i++)
    total += data.snowfall[i] ?? 0;
  if (total < thresholdCm) return null;
  const activities = candidates.filter((id) => isWinterActivity(id, customs));
  if (!activities.length) return null;
  return { totalCm: +total.toFixed(1), activities };
}
