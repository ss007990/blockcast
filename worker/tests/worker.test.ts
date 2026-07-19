import { describe, expect, it } from 'vitest';
import { alertText } from '../src/check';
import { endpointKey, parseSubscribeBody } from '../src/validate';
import type { StoredSession } from '../src/types';

const goodBody = () => ({
  subscription: {
    endpoint: 'https://push.example.com/abc',
    keys: { p256dh: 'k1', auth: 'k2' },
  },
  sessions: [
    {
      id: 1,
      activityId: 'tennis',
      day: '2026-07-21',
      h: 10,
      len: 4,
      lat: 46.8,
      lon: -71.2,
      locName: 'Québec',
      baseBand: 'g',
      baseScore: 0,
    },
  ],
  criteria: { tennis: { w: { rain: 10, wind: 6, cold: 4, heat: 5, uv: 3, snow: 0, fresh: 0 }, tMin: 10, tMax: 30 } },
  tolMult: 1,
  lang: 'fr',
  units: 'metric',
});

describe('parseSubscribeBody', () => {
  it('accepts a valid payload', () => {
    const sub = parseSubscribeBody(goodBody());
    expect(sub).not.toBeNull();
    expect(sub!.sessions).toHaveLength(1);
    expect(sub!.lang).toBe('fr');
    expect(sub!.criteria.tennis?.tMin).toBe(10);
  });
  it('rejects a missing subscription', () => {
    expect(parseSubscribeBody({ ...goodBody(), subscription: undefined })).toBeNull();
  });
  it('rejects a non-https endpoint', () => {
    const b = goodBody();
    b.subscription.endpoint = 'http://evil.example.com';
    expect(parseSubscribeBody(b)).toBeNull();
  });
  it('rejects empty or bogus sessions', () => {
    expect(parseSubscribeBody({ ...goodBody(), sessions: [] })).toBeNull();
    const b = goodBody();
    b.sessions = [{ ...b.sessions[0]!, activityId: 'quidditch' } as never];
    expect(parseSubscribeBody(b)).toBeNull();
  });
  it('drops malformed sessions but keeps valid ones', () => {
    const b = goodBody();
    b.sessions = [b.sessions[0]!, { ...b.sessions[0]!, h: 99 } as never];
    expect(parseSubscribeBody(b)!.sessions).toHaveLength(1);
  });
});

describe('endpointKey', () => {
  it('is a stable hex sha-256 of the endpoint', async () => {
    const a = await endpointKey('https://push.example.com/abc');
    const b = await endpointKey('https://push.example.com/abc');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('alertText', () => {
  const session: StoredSession = {
    id: 1,
    activityId: 'tennis',
    day: '2026-07-21',
    h: 10,
    len: 4,
    lat: 46.8,
    lon: -71.2,
    locName: 'Québec',
    baseBand: 'g',
    baseScore: 0,
  };
  it('formats an English alert', () => {
    const { title, body } = alertText(session, 'r', 82, 'en');
    expect(title).toContain('Tennis');
    expect(body).toContain('high risk');
    expect(body).toContain('82/100');
  });
  it('formats a French alert', () => {
    const { body } = alertText(session, 'y', 40, 'fr');
    expect(body).toContain('un peu risqué');
  });
});
