// resyncPush mirrors the planner on the transport registered at opt-in. The
// native path is the one that matters on the App Store: the APNs token lives
// in localStorage, and the worker is told about every change without a prompt.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criteriaFrom } from '../src/core/activities';
import type { PlannedSession } from '../src/core/alerts';

const platform = vi.hoisted(() => ({ native: true }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native },
}));

const API = 'https://push.test';
vi.stubEnv('VITE_PUSH_API', API);

const session = (over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: 1,
  activityId: 'tennis',
  day: '2026-09-07',
  h: 10,
  len: 4,
  locName: 'Québec',
  lat: 46.81,
  lon: -71.21,
  baseScore: 0,
  baseBand: 'g',
  ...over,
});

const ctx = (sessions: PlannedSession[]) => ({
  sessions,
  critFor: (id: string) => criteriaFrom(id as never, undefined, []),
  customs: [],
  tolMult: 1,
  lang: 'en' as const,
  units: 'metric' as const,
});

let storage: Map<string, string>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  platform.native = true;
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  });
  fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resyncPush (native)', () => {
  it('re-POSTs the planner with the stored APNs token, no prompt', async () => {
    storage.set('blockcast.v2.apnsToken', 'abcdef0123456789');
    const { resyncPush } = await import('../src/services/push');

    const r = await resyncPush(ctx([session(), session({ id: 2, day: '2026-09-08' })]));

    expect(r).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/api/subscribe`);
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    const body = JSON.parse(init.body as string) as { apns: { token: string }; sessions: unknown[]; criteria: Record<string, unknown> };
    expect(body.apns.token).toBe('abcdef0123456789');
    expect(body.sessions).toHaveLength(2);
    expect(body.criteria.tennis).toBeDefined();
  });

  it('deletes the subscription when the planner is empty', async () => {
    storage.set('blockcast.v2.apnsToken', 'abcdef0123456789');
    const { resyncPush } = await import('../src/services/push');

    expect(await resyncPush(ctx([]))).toBe('ok');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ apnsToken: 'abcdef0123456789' });
  });

  it('reports no transport after a reinstall wiped the token', async () => {
    const { resyncPush } = await import('../src/services/push');
    expect(await resyncPush(ctx([session()]))).toBe('no-transport');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports failure on a worker error without throwing', async () => {
    storage.set('blockcast.v2.apnsToken', 'abcdef0123456789');
    fetchMock.mockResolvedValueOnce(new Response('bad', { status: 400 }));
    const { resyncPush } = await import('../src/services/push');
    expect(await resyncPush(ctx([session()]))).toBe('failed');
  });
});

describe('resyncPush (web)', () => {
  it('reports no transport when there is no service worker to hold a subscription', async () => {
    platform.native = false;
    vi.stubGlobal('navigator', {});
    const { resyncPush } = await import('../src/services/push');
    expect(await resyncPush(ctx([session()]))).toBe('no-transport');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
