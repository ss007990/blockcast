// BlockCast push worker — stores Web Push subscriptions and re-checks
// subscribed sessions on a cron, pushing when a forecast band changes.

import { runChecks } from './check';
import type { Env } from './types';
import { endpointKey, parseSubscribeBody } from './validate';

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    if (url.pathname !== '/api/subscribe') return json(404, { error: 'not found' }, cors);

    if (req.method === 'POST') {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return json(400, { error: 'invalid JSON' }, cors);
      }
      const sub = parseSubscribeBody(raw);
      if (!sub) return json(400, { error: 'invalid subscription payload' }, cors);
      await env.SUBS.put(await endpointKey(sub.subscription.endpoint), JSON.stringify(sub), {
        // self-expire: sessions are at most 7 days out; 30 d covers re-subscribes
        expirationTtl: 30 * 24 * 3600,
      });
      return json(201, { ok: true }, cors);
    }

    if (req.method === 'DELETE') {
      let body: { endpoint?: unknown };
      try {
        body = (await req.json()) as { endpoint?: unknown };
      } catch {
        return json(400, { error: 'invalid JSON' }, cors);
      }
      if (typeof body.endpoint !== 'string') return json(400, { error: 'endpoint required' }, cors);
      await env.SUBS.delete(await endpointKey(body.endpoint));
      return json(200, { ok: true }, cors);
    }

    return json(405, { error: 'method not allowed' }, cors);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runChecks(env));
  },
} satisfies ExportedHandler<Env>;
