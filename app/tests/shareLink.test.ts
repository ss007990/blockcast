import { describe, expect, it } from 'vitest';
import { buildShareUrl, parseShareParams } from '../src/core/shareLink';

const quebec = { name: 'Québec', lat: 46.813123, lon: -71.207456 };

describe('buildShareUrl', () => {
  it('encodes sport, place and block', () => {
    const url = buildShareUrl({ activity: 'golf', place: quebec, day: '2026-10-25', h: 9 });
    expect(url).toBe(
      'https://blockcast.ca/?a=golf&at=46.8131%2C-71.2075&n=Qu%C3%A9bec&d=2026-10-25&h=9',
    );
  });

  it('round-trips through parseShareParams', () => {
    const url = buildShareUrl({ activity: 'pickleball', place: quebec, day: '2026-11-02', h: 14 });
    expect(parseShareParams(new URL(url).search)).toEqual({
      activity: 'pickleball',
      place: { name: 'Québec', lat: 46.8131, lon: -71.2075 },
      day: '2026-11-02',
      h: 14,
    });
  });

  it('carries the sport alone', () => {
    expect(buildShareUrl({ activity: 'skiing' })).toBe('https://blockcast.ca/?a=skiing');
  });

  it('drops half a block', () => {
    expect(buildShareUrl({ activity: 'golf', day: '2026-10-25' })).toBe(
      'https://blockcast.ca/?a=golf',
    );
  });

  it('caps long place names', () => {
    const url = buildShareUrl({ place: { name: 'x'.repeat(200), lat: 1, lon: 2 } });
    expect(new URL(url).searchParams.get('n')).toHaveLength(60);
  });
});

describe('parseShareParams', () => {
  it('ignores analytics-only links', () => {
    expect(parseShareParams('?ref=reddit-golf&utm_source=x')).toBeNull();
    expect(parseShareParams('')).toBeNull();
  });

  it('rejects custom and unknown activities', () => {
    expect(parseShareParams('?a=c-abc123')).toBeNull();
    expect(parseShareParams('?a=quidditch')).toBeNull();
  });

  it('keeps the sport when the place is malformed', () => {
    expect(parseShareParams('?a=tennis&at=999,5&n=Nowhere')).toEqual({ activity: 'tennis' });
    expect(parseShareParams('?a=tennis&at=,5')).toEqual({ activity: 'tennis' });
    expect(parseShareParams('?a=tennis&at=abc')).toEqual({ activity: 'tennis' });
  });

  it('names an unnamed place by its coordinates', () => {
    expect(parseShareParams('?at=45.5,-73.6')?.place).toEqual({
      name: '45.5, -73.6',
      lat: 45.5,
      lon: -73.6,
    });
  });

  it('validates the block', () => {
    expect(parseShareParams('?a=golf&d=2026-10-25&h=24')).toEqual({ activity: 'golf' });
    expect(parseShareParams('?a=golf&d=Oct 25&h=9')).toEqual({ activity: 'golf' });
    expect(parseShareParams('?a=golf&d=2026-10-25')).toEqual({ activity: 'golf' });
    expect(parseShareParams('?a=golf&d=2026-10-25&h=0')).toEqual({
      activity: 'golf',
      day: '2026-10-25',
      h: 0,
    });
  });
});
