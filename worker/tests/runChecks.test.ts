// The cron pass end to end, minus the network: a fake KV, a scripted
// Open-Meteo response and a spied APNs sender. This is the only place the
// "planned session turned bad → push" promise is actually exercised.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenMeteoResponse } from '../../app/src/core/forecast';
import type { Env, StoredSub } from '../src/types';

vi.mock('../src/apns', () => ({
  sendApns: vi.fn(async () => 'sent' as const),
}));

import { sendApns } from '../src/apns';
import { runChecks } from '../src/check';

const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const IN_TWO_DAYS = isoDay(2);
const YESTERDAY = isoDay(-2);

/** One full day of hourly data, fair by default; `rain` turns every hour into a washout. */
function forecast(day: string, rain: boolean): OpenMeteoResponse {
  const hours = Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, '0')}:00`);
  const fill = (v: number) => hours.map(() => v);
  return {
    timezone: 'America/Toronto',
    utc_offset_seconds: -4 * 3600,
    hourly: {
      time: hours,
      temperature_2m: fill(20),
      apparent_temperature: fill(20),
      precipitation_probability: fill(rain ? 95 : 0),
      precipitation: fill(rain ? 4 : 0),
      wind_speed_10m: fill(5),
      wind_gusts_10m: fill(10),
      cloud_cover: fill(rain ? 100 : 10),
      uv_index: fill(3),
      snowfall: fill(0),
      snow_depth: fill(0),
    },
    daily: {
      time: [day],
      weather_code: [rain ? 80 : 0],
      apparent_temperature_max: [22],
      apparent_temperature_min: [15],
      sunrise: [`${day}T05:40`],
      sunset: [`${day}T20:10`],
    },
  };
}

function fakeKv(initial: Record<string, StoredSub>) {
  const store = new Map<string, string>(
    Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]),
  );
  const kv = {
    list: async () => ({ keys: [...store.keys()].map((name) => ({ name })), list_complete: true as const }),
    get: async (k: string) => (store.has(k) ? JSON.parse(store.get(k)!) : null),
    put: async (k: string, v: string) => void store.set(k, v),
    delete: async (k: string) => void store.delete(k),
  };
  return { kv: kv as unknown as KVNamespace, store };
}

function env(kv: KVNamespace): Env {
  return {
    SUBS: kv,
    ALLOWED_ORIGINS: '',
    VAPID_PUBLIC_KEY: 'pub',
    VAPID_PRIVATE_KEY: 'priv',
    VAPID_SUBJECT: 'mailto:test@example.com',
    APNS_PRIVATE_KEY: 'k',
    APNS_KEY_ID: 'id',
    APNS_TEAM_ID: 'team',
    APNS_ENV: 'production',
  };
}

const apnsSub = (over: Partial<StoredSub['sessions'][number]> = {}): StoredSub => ({
  apns: { token: 'abcdef0123456789' },
  sessions: [
    {
      id: 7,
      activityId: 'tennis',
      day: IN_TWO_DAYS,
      h: 10,
      len: 4,
      lat: 46.81,
      lon: -71.21,
      locName: 'Québec',
      baseBand: 'g',
      baseScore: 3,
      ...over,
    },
  ],
  criteria: {},
  tolMult: 1,
  lang: 'en',
  units: 'metric',
  createdAt: 0,
});

function scriptOpenMeteo(rain: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      // the rain-blend request: no extra models, main forecast stands alone
      if (url.includes('models=')) return Response.json({ hourly: { time: [] } });
      return Response.json(forecast(IN_TWO_DAYS, rain));
    }),
  );
}

beforeEach(() => {
  vi.mocked(sendApns).mockClear();
  vi.unstubAllGlobals();
});

describe('runChecks', () => {
  it('pushes once when a planned session goes from green to red, and re-bases it', async () => {
    scriptOpenMeteo(true);
    const { kv, store } = fakeKv({ sub1: apnsSub() });

    await runChecks(env(kv));

    expect(sendApns).toHaveBeenCalledTimes(1);
    const [, token, alert, collapse] = vi.mocked(sendApns).mock.calls[0]!;
    expect(token).toBe('abcdef0123456789');
    expect(alert.title).toBe('Tennis: forecast changed');
    expect(alert.body).toMatch(new RegExp(`^${IN_TWO_DAYS} 10:00 · now high risk \\(risk \\d+/100\\)$`));
    expect(collapse).toBe('bc-7');

    const saved = JSON.parse(store.get('sub1')!) as StoredSub;
    expect(saved.sessions[0]!.baseBand).toBe('r');

    // a second pass with the same forecast is silent: one alert per change
    await runChecks(env(kv));
    expect(sendApns).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while the band is unchanged', async () => {
    scriptOpenMeteo(false);
    const { kv } = fakeKv({ sub1: apnsSub() });
    await runChecks(env(kv));
    expect(sendApns).not.toHaveBeenCalled();
  });

  it('speaks French when the subscriber does', async () => {
    scriptOpenMeteo(true);
    const { kv } = fakeKv({ sub1: { ...apnsSub(), lang: 'fr' } });
    await runChecks(env(kv));
    const [, , alert] = vi.mocked(sendApns).mock.calls[0]!;
    expect(alert.title).toBe('Tennis : prévisions mises à jour');
    expect(alert.body).toContain('risque élevé');
  });

  it('baselines a session that arrived without a band instead of alerting', async () => {
    scriptOpenMeteo(true);
    const { kv, store } = fakeKv({ sub1: apnsSub({ baseBand: null, baseScore: null }) });
    await runChecks(env(kv));
    expect(sendApns).not.toHaveBeenCalled();
    const saved = JSON.parse(store.get('sub1')!) as StoredSub;
    expect(saved.sessions[0]!.baseBand).toBe('r');
  });

  it('drops past sessions and deletes a subscription with nothing left to watch', async () => {
    scriptOpenMeteo(true);
    const { kv, store } = fakeKv({ sub1: apnsSub({ day: YESTERDAY }) });
    await runChecks(env(kv));
    expect(sendApns).not.toHaveBeenCalled();
    expect(store.has('sub1')).toBe(false);
  });

  it('deletes the subscription when APNs reports the device token dead', async () => {
    scriptOpenMeteo(true);
    vi.mocked(sendApns).mockResolvedValueOnce('gone');
    const { kv, store } = fakeKv({ sub1: apnsSub() });
    await runChecks(env(kv));
    expect(store.has('sub1')).toBe(false);
  });

  it('skips calendar feeds and shares one forecast fetch across a neighbourhood', async () => {
    scriptOpenMeteo(true);
    const { kv } = fakeKv({
      'cal:feed': { sessions: [] } as unknown as StoredSub,
      a: apnsSub(),
      b: { ...apnsSub(), apns: { token: 'fedcba9876543210' } },
    });
    await runChecks(env(kv));
    expect(sendApns).toHaveBeenCalledTimes(2);
    // main + blend request, once, for two subscribers ~0 km apart
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});
