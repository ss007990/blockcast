import { describe, expect, it } from 'vitest';
import { apnsJwt } from '../src/apns';
import { parseSubscribeBody, subKey } from '../src/validate';
import type { Env } from '../src/types';

const TOKEN = 'ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12';

const apnsBody = () => ({
  apns: { token: TOKEN.toUpperCase() },
  sessions: [
    {
      id: 1,
      activityId: 'tennis',
      day: '2026-07-28',
      h: 10,
      len: 4,
      lat: 46.8,
      lon: -71.2,
      locName: 'Québec',
      baseBand: 'g',
      baseScore: 0,
    },
  ],
  criteria: {},
  tolMult: 1,
  lang: 'en',
  units: 'metric',
});

describe('APNs subscribe payloads', () => {
  it('accepts a device token instead of a Web Push subscription', () => {
    const sub = parseSubscribeBody(apnsBody());
    expect(sub).not.toBeNull();
    expect(sub!.apns).toEqual({ token: TOKEN }); // normalized to lowercase
    expect(sub!.subscription).toBeUndefined();
  });

  it('rejects a body with neither transport', () => {
    const body = apnsBody() as Record<string, unknown>;
    delete body.apns;
    expect(parseSubscribeBody(body)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(parseSubscribeBody({ ...apnsBody(), apns: { token: 'not-hex!' } })).toBeNull();
  });

  it('keys APNs subs separately from endpoint hashes', async () => {
    const apnsKey = await subKey({ apns: { token: TOKEN } });
    const webKey = await subKey({
      subscription: { endpoint: 'https://push.example.com/abc', expirationTime: null, keys: { p256dh: 'a', auth: 'b' } },
    });
    expect(apnsKey).toMatch(/^[0-9a-f]{64}$/);
    expect(apnsKey).not.toEqual(webKey);
  });
});

describe('APNs JWT', () => {
  it('signs an ES256 JWT with the key id and team id', async () => {
    // real P-256 key so WebCrypto sign/verify round-trips
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const pkcs8 = (await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer;
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...Array.from(new Uint8Array(pkcs8))))}\n-----END PRIVATE KEY-----`;
    const env = { APNS_PRIVATE_KEY: pem, APNS_KEY_ID: 'KEY1234567', APNS_TEAM_ID: 'TEAM123456' } as Env;

    const jwt = await apnsJwt(env, 1_800_000_000_000);
    const [h, c, sig] = jwt.split('.');
    const dec = (s: string) =>
      JSON.parse(atob(s!.replace(/-/g, '+').replace(/_/g, '/')));
    expect(dec(h!)).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
    expect(dec(c!)).toEqual({ iss: 'TEAM123456', iat: 1_800_000_000 });

    const sigBytes = Uint8Array.from(atob(sig!.replace(/-/g, '+').replace(/_/g, '/')), (ch) =>
      ch.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      sigBytes,
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(valid).toBe(true);
  });

  it('reuses the cached JWT within the hour', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
    ])) as CryptoKeyPair;
    const pkcs8 = (await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer;
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...Array.from(new Uint8Array(pkcs8))))}\n-----END PRIVATE KEY-----`;
    const env = { APNS_PRIVATE_KEY: pem, APNS_KEY_ID: 'KEYCACHED1', APNS_TEAM_ID: 'TEAM123456' } as Env;

    const first = await apnsJwt(env, 1_800_000_000_000);
    const second = await apnsJwt(env, 1_800_000_000_000 + 10 * 60 * 1000);
    const third = await apnsJwt(env, 1_800_000_000_000 + 55 * 60 * 1000);
    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });
});
