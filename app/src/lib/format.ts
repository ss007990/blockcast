// Locale-aware date helpers. A day key like "2026-07-20" is interpreted at
// noon so timezone offsets can never shift it to the wrong calendar day.

export const dateOf = (dayISO: string): Date => new Date(dayISO + 'T12:00');

export const fmtWeekdayShort = (dayISO: string, locale: string): string =>
  dateOf(dayISO).toLocaleDateString(locale, { weekday: 'short' });

export const fmtWeekdayLong = (dayISO: string, locale: string): string =>
  dateOf(dayISO).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });

export const fmtDayMonth = (dayISO: string, locale: string): string =>
  dateOf(dayISO).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

export const fmtFull = (dayISO: string, locale: string): string =>
  dateOf(dayISO).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

export const fmtClock = (date: Date, locale: string): string =>
  date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

/** "05:42" from an Open-Meteo local ISO stamp like "2026-07-20T05:42". */
export const fmtIsoTime = (iso: string, locale: string, clock: '12h' | '24h'): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, {
    hour: clock === '12h' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: clock === '12h',
  });
};
