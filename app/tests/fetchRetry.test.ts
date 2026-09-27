// The main forecast request retries brief upstream outages (5xx, network
// errors) but gives up straight away on a 4xx, which would only fail again.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRetrying } from '../src/services/openMeteo';

const URL_ = new URL('https://api.open-meteo.com/v1/forecast');
const NO_WAIT = [0, 0];
const reply = (status: number) => new Response('{}', { status });

afterEach(() => vi.unstubAllGlobals());

describe('fetchRetrying', () => {
  it('recovers from a 503 on the next attempt', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(503)).mockResolvedValueOnce(reply(200));
    vi.stubGlobal('fetch', f);
    const res = await fetchRetrying(URL_, NO_WAIT);
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('recovers from a network error', async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(reply(200));
    vi.stubGlobal('fetch', f);
    expect((await fetchRetrying(URL_, NO_WAIT)).status).toBe(200);
  });

  it('returns the last 5xx once retries run out', async () => {
    const f = vi.fn().mockResolvedValue(reply(503));
    vi.stubGlobal('fetch', f);
    expect((await fetchRetrying(URL_, NO_WAIT)).status).toBe(503);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('rethrows the last network error once retries run out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(fetchRetrying(URL_, NO_WAIT)).rejects.toThrow('offline');
  });

  it('does not retry a 4xx', async () => {
    const f = vi.fn().mockResolvedValue(reply(400));
    vi.stubGlobal('fetch', f);
    expect((await fetchRetrying(URL_, NO_WAIT)).status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
