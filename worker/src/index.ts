// BlockCast push worker — stores Web Push subscriptions and re-checks
// subscribed sessions on a cron, pushing when a forecast band changes.

import { runChecks } from './check';
import { feedKey, feedToIcs, isFeedToken, parseFeedBody } from './feed';
import type { Env, StoredFeed } from './types';
import { endpointKey, parseSubscribeBody } from './validate';

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  // any localhost port counts as dev — vite's autoPort makes the port unpredictable
  const ok = allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // /api/calendar/<token>[.ics] — the subscribable feed. GET serves the
    // calendar (polled by Apple/Google/Outlook, no Origin header), PUT syncs
    // the app's planner into KV, DELETE turns the feed off.
    const cal = url.pathname.match(/^\/api\/calendar\/([a-f0-9]+)(\.ics)?$/);
    if (cal) {
      const token = cal[1]!;
      if (!isFeedToken(token)) return json(404, { error: 'not found' }, cors);

      if (req.method === 'GET') {
        const feed = await env.SUBS.get<StoredFeed>(feedKey(token), 'json');
        if (!feed) return json(404, { error: 'not found' }, cors);
        return new Response(feedToIcs(feed), {
          headers: {
            'content-type': 'text/calendar; charset=utf-8',
            'cache-control': 'no-store',
            ...cors,
          },
        });
      }

      if (req.method === 'PUT') {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          return json(400, { error: 'invalid JSON' }, cors);
        }
        const feed = parseFeedBody(raw);
        if (!feed) return json(400, { error: 'invalid feed payload' }, cors);
        await env.SUBS.put(feedKey(token), JSON.stringify(feed), {
          // sessions live at most 14 days out; 90 d survives quiet spells,
          // and every sync renews the clock
          expirationTtl: 90 * 24 * 3600,
        });
        return json(200, { ok: true }, cors);
      }

      if (req.method === 'DELETE') {
        await env.SUBS.delete(feedKey(token));
        return json(200, { ok: true }, cors);
      }

      return json(405, { error: 'method not allowed' }, cors);
    }

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
