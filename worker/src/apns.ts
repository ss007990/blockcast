// APNs sender for the native iOS app. Auth is a token-based ES256 JWT signed
// with the .p8 key (Cloudflare secret); Apple allows reusing a JWT for up to
// an hour, so it is cached per isolate and refreshed at 50 minutes.

import type { Env } from './types';

interface ApnsAlert {
  title: string;
  body: string;
}

const b64url = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(body);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0)).buffer;
}

let cached: { jwt: string; mintedAt: number; keyId: string } | null = null;
const JWT_TTL_MS = 50 * 60 * 1000;

export async function apnsJwt(env: Env, now = Date.now()): Promise<string> {
  if (cached && cached.keyId === env.APNS_KEY_ID && now - cached.mintedAt < JWT_TTL_MS)
    return cached.jwt;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(env.APNS_PRIVATE_KEY!),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: env.APNS_KEY_ID })));
  const claims = b64url(
    new TextEncoder().encode(JSON.stringify({ iss: env.APNS_TEAM_ID, iat: Math.floor(now / 1000) })),
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${b64url(signature)}`;
  cached = { jwt, mintedAt: now, keyId: env.APNS_KEY_ID! };
  return jwt;
}

export function apnsConfigured(env: Env): boolean {
  return Boolean(env.APNS_PRIVATE_KEY && env.APNS_KEY_ID && env.APNS_TEAM_ID);
}

export type ApnsResult = 'sent' | 'gone' | 'failed';

/** Send one alert. 'gone' means the device token is dead and the
 * subscription should be deleted (matches Web Push 404/410 handling). */
export async function sendApns(
  env: Env,
  deviceToken: string,
  alert: ApnsAlert,
  collapseId: string,
): Promise<ApnsResult> {
  if (!apnsConfigured(env)) return 'failed';
  const host =
    env.APNS_ENV === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  const res = await fetch(`${host}/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${await apnsJwt(env)}`,
      'apns-topic': env.APNS_TOPIC ?? 'ca.blockcast.app',
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-collapse-id': collapseId,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: { alert, sound: 'default' },
      url: 'https://blockcast.ca/#planner',
    }),
  });
  if (res.ok) return 'sent';
  // 410 Unregistered, or 400 with BadDeviceToken — either way this token is dead
  if (res.status === 410) return 'gone';
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { reason?: string } | null;
    if (body?.reason === 'BadDeviceToken' || body?.reason === 'DeviceTokenNotForTopic') return 'gone';
  }
  return 'failed';
}
