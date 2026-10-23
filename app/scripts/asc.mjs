/* global console, process, fetch, Buffer */
// Minimal App Store Connect API client. Reads ~/.appstoreconnect/blockcast.json
// ({ keyId, issuerId }) and the matching AuthKey_<keyId>.p8 from
// ~/.appstoreconnect/private_keys/. The key never leaves this machine; only a
// short-lived signed token goes to Apple.
//
//   node app/scripts/asc.mjs GET '/v1/apps?filter[bundleId]=ca.blockcast.app'
//   node app/scripts/asc.mjs PATCH /v1/appStoreVersionLocalizations/<id> body.json
//
// Also importable: `import { asc } from './asc.mjs'`.

import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = join(homedir(), '.appstoreconnect');
const cfg = JSON.parse(readFileSync(join(dir, 'blockcast.json'), 'utf8'));
const key = createPrivateKey(
  readFileSync(join(dir, 'private_keys', `AuthKey_${cfg.keyId}.p8`), 'utf8'),
);

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

let cached = { token: '', exp: 0 };
function token() {
  const now = Math.floor(Date.now() / 1000);
  if (cached.exp - 60 > now) return cached.token;
  const head = b64({ alg: 'ES256', kid: cfg.keyId, typ: 'JWT' });
  const body = b64({ iss: cfg.issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' });
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  cached = { token: `${head}.${body}.${sig.toString('base64url')}`, exp: now + 1200 };
  return cached.token;
}

export async function asc(method, path, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 600)}`);
    err.status = res.status;
    err.json = json;
    throw err;
  }
  return json;
}

export const config = cfg;

if (import.meta.url === `file://${process.argv[1]}`) {
  const [method, path, file] = process.argv.slice(2);
  const body = file ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
  asc(method, path, body)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
