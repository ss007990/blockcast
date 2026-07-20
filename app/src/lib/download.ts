import type { ActivityId } from '../core/activities';
import type { PlannedSession } from '../core/alerts';
import { buildCalendar, type IcsEvent } from '../core/ics';
import type { BlockResult } from '../core/forecast';
import type { Dict } from '../i18n';

export function sessionToIcsEvent(
  p: PlannedSession,
  b: BlockResult | null,
  t: Dict,
  nameOf: (id: ActivityId) => string,
): IcsEvent {
  const forecast = b
    ? `Forecast: risk ${b.score}/100 (${t.risk[b.band]}). Rain ${b.f.rainProb}%/${b.f.rainSum}mm, wind ${b.f.wind}km/h (gusts ${b.f.gust}), feels ${b.f.temp}C, UV ${b.f.uv}. — BlockCast`
    : 'Planned with BlockCast';
  return {
    uid: `${p.id}-${p.day.replace(/-/g, '')}${String(p.h).padStart(2, '0')}@blockcast`,
    day: p.day,
    h: p.h,
    len: p.len,
    summary: p.purpose
      ? `${nameOf(p.activityId)} — ${t.planner.purposes[p.purpose]}`
      : `${nameOf(p.activityId)} — BlockCast`,
    location: p.locName,
    description: p.note ? `${p.note}\n${forecast}` : forecast,
  };
}

export function sessionsToIcs(
  sessions: PlannedSession[],
  checkOf: (s: PlannedSession) => BlockResult | null,
  t: Dict,
  nameOf: (id: ActivityId) => string,
): string {
  return buildCalendar(
    sessions.map((p) => sessionToIcsEvent(p, checkOf(p), t, nameOf)),
    new Date().toISOString(),
  );
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
