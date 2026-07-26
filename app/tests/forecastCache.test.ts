// Offline fallback: a failed fetch serves the last cached forecast for the
// same place (status 'stale'), but never a cache that is too old or belongs
// to somewhere else — a wrong forecast is worse than none.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForecastData } from '../src/core/forecast';
import { useForecast } from '../src/state/forecast';
import { fetchForecast } from '../src/services/openMeteo';

vi.mock('../src/services/openMeteo', () => ({ fetchForecast: vi.fn() }));

const CACHE_KEY = 'blockcast.v2.forecastCache';
const QUEBEC = { name: 'Québec', lat: 46.8131, lon: -71.2075 };
const HALIFAX = { name: 'Halifax', lat: 44.6488, lon: -63.5752 };
const FAKE_DATA = { daily: { time: [] }, days: {} } as unknown as ForecastData;

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  useForecast.setState({ data: null, dataFor: null, updatedAt: null, status: 'idle', error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(fetchForecast).mockReset();
});

const seedCache = (dataFor: typeof QUEBEC, ageMs: number) =>
  store.set(
    CACHE_KEY,
    JSON.stringify({ data: FAKE_DATA, dataFor, updatedAt: Date.now() - ageMs }),
  );

describe('forecast cache fallback', () => {
  it('writes the cache on a successful load', async () => {
    vi.mocked(fetchForecast).mockResolvedValue(FAKE_DATA);
    await useForecast.getState().load(QUEBEC);
    expect(useForecast.getState().status).toBe('ready');
    const cached = JSON.parse(store.get(CACHE_KEY)!);
    expect(cached.dataFor).toEqual(QUEBEC);
  });

  it('serves a recent same-place cache as stale on failure', async () => {
    seedCache(QUEBEC, 60 * 60 * 1000); // 1 h old
    vi.mocked(fetchForecast).mockRejectedValue(new Error('offline'));
    await useForecast.getState().load(QUEBEC);
    const st = useForecast.getState();
    expect(st.status).toBe('stale');
    expect(st.data).toEqual(FAKE_DATA);
    expect(st.error).toBe('offline');
  });

  it('errors when the cache is older than 24 h', async () => {
    seedCache(QUEBEC, 25 * 60 * 60 * 1000);
    vi.mocked(fetchForecast).mockRejectedValue(new Error('offline'));
    await useForecast.getState().load(QUEBEC);
    expect(useForecast.getState().status).toBe('error');
    expect(useForecast.getState().data).toBeNull();
  });

  it('errors when the cache belongs to another place', async () => {
    seedCache(HALIFAX, 60 * 60 * 1000);
    vi.mocked(fetchForecast).mockRejectedValue(new Error('offline'));
    await useForecast.getState().load(QUEBEC);
    expect(useForecast.getState().status).toBe('error');
  });

  it('still errors cleanly when localStorage is unavailable', async () => {
    vi.stubGlobal('localStorage', undefined);
    vi.mocked(fetchForecast).mockRejectedValue(new Error('offline'));
    await useForecast.getState().load(QUEBEC);
    expect(useForecast.getState().status).toBe('error');
  });
});
