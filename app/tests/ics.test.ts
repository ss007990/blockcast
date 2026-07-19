import { describe, expect, it } from 'vitest';
import { buildCalendar, foldIcs, icsEsc } from '../src/core/ics';

describe('icsEsc', () => {
  it('escapes RFC 5545 special characters', () => {
    expect(icsEsc('Québec, QC; line1\nline2\\x')).toBe('Québec\\, QC\\; line1\\nline2\\\\x');
  });
});

describe('foldIcs', () => {
  const byteLen = (s: string) => new TextEncoder().encode(s).length;
  it('keeps physical lines under 75 octets and unfolds losslessly', () => {
    const long = 'DESCRIPTION:' + 'word '.repeat(40) + 'été '.repeat(30);
    const folded = foldIcs(long);
    expect(folded.split('\r\n').every((l) => byteLen(l) <= 75)).toBe(true);
    expect(folded.replaceAll('\r\n ', '')).toBe(long);
  });
  it('leaves short lines untouched', () => {
    expect(foldIcs('BEGIN:VEVENT')).toBe('BEGIN:VEVENT');
  });
});

describe('buildCalendar', () => {
  it('assembles a valid VCALENDAR with escaped fields', () => {
    const ics = buildCalendar(
      [
        {
          uid: '1-20260720@blockcast',
          day: '2026-07-20',
          h: 6,
          len: 4,
          summary: 'Tennis — BlockCast',
          location: 'Québec, QC',
          description: 'Risk 8/100',
        },
      ],
      '2026-07-19T12:00:00.000Z',
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20260720T060000');
    expect(ics).toContain('DTEND:20260720T100000');
    expect(ics).toContain('LOCATION:Québec\\, QC');
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
  });
  it('clamps events running past midnight to 23:59:59', () => {
    const ics = buildCalendar(
      [
        {
          uid: 'x',
          day: '2026-07-20',
          h: 22,
          len: 4,
          summary: 's',
          location: '',
          description: '',
        },
      ],
      '2026-07-19T12:00:00.000Z',
    );
    expect(ics).toContain('DTEND:20260720T235959');
  });
});
