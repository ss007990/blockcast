import { describe, expect, it } from 'vitest';
import { feedToIcs, isFeedToken, parseFeedBody } from '../src/feed';

const body = () => ({
  sessions: [
    {
      id: 7,
      activityId: 'tennis',
      day: '2026-07-25',
      h: 18,
      len: 2,
      lat: 46.8,
      lon: -71.2,
      locName: 'Québec',
      purpose: 'match',
      note: 'Playing with John from 6-8',
    },
  ],
  lang: 'en',
});

describe('isFeedToken', () => {
  it('accepts 32 hex chars and rejects everything else', () => {
    expect(isFeedToken('a'.repeat(32))).toBe(true);
    expect(isFeedToken('A'.repeat(32))).toBe(false);
    expect(isFeedToken('a'.repeat(31))).toBe(false);
    expect(isFeedToken('../../etc/passwd')).toBe(false);
  });
});

describe('parseFeedBody', () => {
  it('accepts a valid payload with purpose and note', () => {
    const feed = parseFeedBody(body());
    expect(feed).not.toBeNull();
    expect(feed!.sessions[0]!.purpose).toBe('match');
    expect(feed!.sessions[0]!.note).toBe('Playing with John from 6-8');
    expect(feed!.lang).toBe('en');
  });
  it('accepts an empty session list (clears the calendar)', () => {
    expect(parseFeedBody({ sessions: [], lang: 'fr' })!.sessions).toHaveLength(0);
  });
  it('drops malformed sessions and rejects non-objects', () => {
    const b = body();
    b.sessions.push({ ...b.sessions[0]!, day: 'not-a-day' } as never);
    expect(parseFeedBody(b)!.sessions).toHaveLength(1);
    expect(parseFeedBody('nope')).toBeNull();
    expect(parseFeedBody({ sessions: 'nope' })).toBeNull();
  });
});

describe('feedToIcs', () => {
  it('serves a named calendar with purpose in the summary and note in the description', () => {
    const ics = feedToIcs(parseFeedBody(body())!);
    expect(ics).toContain('X-WR-CALNAME:BlockCast');
    expect(ics).toContain('SUMMARY:Tennis — Match / game');
    expect(ics).toContain('DTSTART:20260725T180000');
    expect(ics).toContain('DESCRIPTION:Playing with John from 6-8\\nPlanned with BlockCast');
  });
  it('localizes labels for French feeds', () => {
    const ics = feedToIcs(parseFeedBody({ ...body(), lang: 'fr' })!);
    expect(ics).toContain('SUMMARY:Tennis — Match');
  });
});
