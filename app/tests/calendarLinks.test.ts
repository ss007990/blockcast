import { describe, expect, it } from 'vitest';
import { googleCalUrl, outlookCalUrl } from '../src/core/calendarLinks';
import type { IcsEvent } from '../src/core/ics';
import { sessionToIcsEvent } from '../src/lib/download';
import type { PlannedSession } from '../src/core/alerts';
import { en } from '../src/i18n/en';

const event: IcsEvent = {
  uid: 'x',
  day: '2026-07-20',
  h: 6,
  len: 4,
  summary: 'Tennis — Match / game',
  location: 'Québec, QC',
  description: 'With John\nForecast: risk 8/100',
};

describe('googleCalUrl', () => {
  it('builds a prefilled compose link with floating local times', () => {
    const u = new URL(googleCalUrl(event));
    expect(u.hostname).toBe('calendar.google.com');
    expect(u.searchParams.get('action')).toBe('TEMPLATE');
    expect(u.searchParams.get('dates')).toBe('20260720T060000/20260720T100000');
    expect(u.searchParams.get('text')).toBe('Tennis — Match / game');
    expect(u.searchParams.get('location')).toBe('Québec, QC');
  });
  it('clamps events running past midnight to 23:59:59', () => {
    const u = new URL(googleCalUrl({ ...event, h: 22, len: 4 }));
    expect(u.searchParams.get('dates')).toBe('20260720T220000/20260720T235959');
  });
});

describe('outlookCalUrl', () => {
  it('builds live and office compose links', () => {
    const live = new URL(outlookCalUrl(event, 'live'));
    expect(live.hostname).toBe('outlook.live.com');
    expect(live.searchParams.get('startdt')).toBe('2026-07-20T06:00:00');
    expect(live.searchParams.get('enddt')).toBe('2026-07-20T10:00:00');
    expect(live.searchParams.get('subject')).toBe('Tennis — Match / game');

    const office = new URL(outlookCalUrl(event, 'office'));
    expect(office.hostname).toBe('outlook.office.com');
  });
});

describe('sessionToIcsEvent', () => {
  const session: PlannedSession = {
    id: 7,
    activityId: 'tennis',
    day: '2026-07-20',
    h: 9,
    len: 2,
    locName: 'Québec',
    lat: 46.8,
    lon: -71.2,
    baseScore: 8,
    baseBand: 'g',
  };
  const nameOf = () => 'Tennis';

  it('labels the summary with the purpose and prepends the note', () => {
    const e = sessionToIcsEvent(
      { ...session, purpose: 'match', note: 'Playing with John from 9-10' },
      null,
      en,
      nameOf,
    );
    expect(e.summary).toBe('Tennis — Match / game');
    expect(e.description.startsWith('Playing with John from 9-10\n')).toBe(true);
  });

  it('falls back to app branding without purpose or note', () => {
    const e = sessionToIcsEvent(session, null, en, nameOf);
    expect(e.summary).toBe('Tennis — BlockCast');
    expect(e.description).toBe('Planned with BlockCast');
  });
});
