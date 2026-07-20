// "Add to calendar" deep links — pre-filled event compose pages for Google
// Calendar and Outlook. Times are floating local (no timezone designator),
// matching the .ics output: the event lands at the session's wall-clock time.

import type { IcsEvent } from './ics';

const pad = (n: number) => String(n).padStart(2, '0');
// events running past midnight clamp to end-of-day, same as buildCalendar
const endH = (e: IcsEvent) => (e.h + e.len >= 24 ? null : e.h + e.len);

export function googleCalUrl(e: IcsEvent): string {
  const d = e.day.replace(/-/g, '');
  const end = endH(e);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.summary,
    dates: `${d}T${pad(e.h)}0000/${d}T${end == null ? '235959' : pad(end) + '0000'}`,
    details: e.description,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function outlookCalUrl(e: IcsEvent, host: 'live' | 'office' = 'live'): string {
  const end = endH(e);
  const q = new URLSearchParams({
    rru: 'addevent',
    subject: e.summary,
    startdt: `${e.day}T${pad(e.h)}:00:00`,
    enddt: `${e.day}T${end == null ? '23:59:59' : pad(end) + ':00:00'}`,
    body: e.description,
    location: e.location,
  });
  const base =
    host === 'live'
      ? 'https://outlook.live.com/calendar/0/action/compose'
      : 'https://outlook.office.com/calendar/action/compose';
  return `${base}?${q}`;
}
