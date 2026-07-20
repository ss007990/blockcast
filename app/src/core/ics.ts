// RFC 5545 calendar output — text escaping, 75-octet line folding, and
// document assembly. Pure string work; downloading lives in the UI layer.

export const icsEsc = (s: string): string =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

export function foldIcs(line: string): string {
  const bytes = (ch: string) => unescape(encodeURIComponent(ch)).length;
  const parts: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const b = bytes(ch);
    if (len + b > 73) {
      parts.push(cur);
      cur = ch;
      len = b;
    } else {
      cur += ch;
      len += b;
    }
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

export interface IcsEvent {
  uid: string;
  /** ISO day "2026-07-20". */
  day: string;
  /** Start hour 0–23. */
  h: number;
  /** Length in hours. */
  len: number;
  summary: string;
  location: string;
  description: string;
}

export function buildCalendar(events: IcsEvent[], nowIso: string, calName?: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = nowIso.replace(/[-:]/g, '').slice(0, 15) + 'Z';
  // subscription feeds get a display name and a refresh hint for polling clients
  const head = calName
    ? [`X-WR-CALNAME:${icsEsc(calName)}`, 'X-PUBLISHED-TTL:PT3H', 'REFRESH-INTERVAL;VALUE=DURATION:PT3H']
    : [];
  const lines = events.flatMap((e) => {
    const d = e.day.replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${d}T${pad(e.h)}0000`,
      `DTEND:${d}T${e.h + e.len >= 24 ? '235959' : pad(e.h + e.len) + '0000'}`,
      `SUMMARY:${icsEsc(e.summary)}`,
      `LOCATION:${icsEsc(e.location)}`,
      `DESCRIPTION:${icsEsc(e.description)}`,
      'END:VEVENT',
    ];
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BlockCast//EN', ...head, ...lines, 'END:VCALENDAR']
    .map(foldIcs)
    .join('\r\n');
}
