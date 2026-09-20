// NWS alert features land in the ECCC banner shape: event → type keyword,
// description + instruction → text, cancelled and test messages dropped.

import { describe, expect, it, vi } from 'vitest';
import { fetchNwsAlerts, mapNwsFeatures, nwsAlertType } from '../src/services/nws';

const feature = (over: Record<string, unknown>) => ({
  properties: {
    event: 'Wind Advisory',
    description: 'Gusts to 45 mph expected.',
    instruction: 'Secure loose objects.',
    areaDesc: 'Cook County',
    status: 'Actual',
    messageType: 'Alert',
    ends: '2026-09-21T02:00:00-05:00',
    expires: '2026-09-21T03:00:00-05:00',
    ...over,
  },
});

describe('nwsAlertType', () => {
  it('keys off the event name', () => {
    expect(nwsAlertType('Winter Storm Warning')).toBe('warning');
    expect(nwsAlertType('Flood Watch')).toBe('watch');
    expect(nwsAlertType('Heat Advisory')).toBe('advisory');
    expect(nwsAlertType('Special Weather Statement')).toBe('statement');
    expect(nwsAlertType('Hazardous Weather Outlook')).toBe('statement');
  });
});

describe('mapNwsFeatures', () => {
  it('maps one feature onto the shared alert shape', () => {
    const [a] = mapNwsFeatures([feature({})]);
    expect(a).toEqual({
      nameEn: 'Wind Advisory',
      nameFr: 'Wind Advisory',
      textEn: 'Gusts to 45 mph expected.\n\nSecure loose objects.',
      textFr: 'Gusts to 45 mph expected.\n\nSecure loose objects.',
      type: 'advisory',
      areaEn: 'Cook County',
      areaFr: 'Cook County',
      ends: '2026-09-21T02:00:00-05:00',
    });
  });

  it('falls back to expires when ends is open, and drops cancels and tests', () => {
    const [a] = mapNwsFeatures([feature({ ends: null, instruction: null })]);
    expect(a?.ends).toBe('2026-09-21T03:00:00-05:00');
    expect(a?.textEn).toBe('Gusts to 45 mph expected.');
    expect(mapNwsFeatures([feature({ messageType: 'Cancel' })])).toEqual([]);
    expect(mapNwsFeatures([feature({ status: 'Test' })])).toEqual([]);
    expect(mapNwsFeatures([feature({ event: undefined })])).toEqual([]);
  });
});

describe('fetchNwsAlerts', () => {
  it('queries the point to four decimals and swallows failures', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return calls.length === 1
          ? Response.json({ features: [feature({})] })
          : new Response('nope', { status: 503 });
      }),
    );
    try {
      const ok = await fetchNwsAlerts(41.878113, -87.629799);
      expect(ok).toHaveLength(1);
      expect(new URL(calls[0]!).searchParams.get('point')).toBe('41.8781,-87.6298');
      expect(await fetchNwsAlerts(41.878113, -87.629799)).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
