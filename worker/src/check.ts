// The cron pass: re-score every subscribed session against a fresh forecast
// and push a notification when a session's risk band changed. Runs the same
// core scoring the app uses — one source of truth.

import { buildPushPayload } from '@block65/webcrypto-web-push';
import { criteriaFrom, TOL_MULT, type CustomActivity } from '../../app/src/core/activities';
import { planKey } from '../../app/src/core/alerts';
import { getBlock, reshapeForecast, type ForecastData, type OpenMeteoResponse } from '../../app/src/core/forecast';
import type { Band } from '../../app/src/core/scoring';
import type { Env, StoredSub, StoredSession } from './types';

const BAND_WORD: Record<'en' | 'fr', Record<Band, string>> = {
  en: { g: 'good to go', y: 'some risk', r: 'high risk' },
  fr: { g: 'c’est bon', y: 'un peu risqué', r: 'risque élevé' },
};

const ACTIVITY_NAME: Record<'en' | 'fr', Record<string, string>> = {
  en: {
    tennis: 'Tennis', cycling: 'Cycling', jogging: 'Jogging', fishing: 'Fishing', golf: 'Golf',
    hiking: 'Hiking', sailing: 'Sailing', picnic: 'Picnic', skiing: 'Skiing', snowmob: 'Snowmobiling',
    beach: 'Hitting the Beach',
  },
  fr: {
    tennis: 'Tennis', cycling: 'Vélo', jogging: 'Course', fishing: 'Pêche', golf: 'Golf',
    hiking: 'Randonnée', sailing: 'Voile', picnic: 'Pique-nique', skiing: 'Ski', snowmob: 'Motoneige',
    beach: 'À la plage',
  },
};

export function alertText(
  s: StoredSession,
  band: Band,
  score: number,
  lang: 'en' | 'fr',
): { title: string; body: string } {
  const name = ACTIVITY_NAME[lang][s.activityId] ?? s.name ?? s.activityId;
  const when = `${s.day} ${String(s.h).padStart(2, '0')}:00`;
  const word = BAND_WORD[lang][band];
  if (lang === 'fr')
    return {
      title: `${name} — prévisions mises à jour`,
      body: `${when} · maintenant ${word} (risque ${score}/100)`,
    };
  return {
    title: `${name} — forecast changed`,
    body: `${when} · now ${word} (risk ${score}/100)`,
  };
}

async function fetchForecast(lat: number, lon: number): Promise<ForecastData> {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '7',
    past_days: '2',
    hourly:
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,cloud_cover,uv_index,snowfall,snow_depth',
    daily: 'weather_code,apparent_temperature_max,apparent_temperature_min,sunrise,sunset',
  }).toString();
  const res = await fetch(u);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  return reshapeForecast((await res.json()) as OpenMeteoResponse, 2);
}

const locKey = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

export async function runChecks(env: Env): Promise<void> {
  const vapid = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
  const todayKey = new Date().toISOString().slice(0, 10) + 'T00';
  const forecasts = new Map<string, ForecastData>();

  let cursor: string | undefined;
  do {
    const page = await env.SUBS.list({ cursor });
    cursor = page.list_complete ? undefined : page.cursor;

    for (const entry of page.keys) {
      const sub = await env.SUBS.get<StoredSub>(entry.name, 'json');
      if (!sub) continue;

      // drop sessions already in the past; drop the whole sub when empty
      sub.sessions = sub.sessions.filter((s) => planKey(s) >= todayKey);
      if (!sub.sessions.length) {
        await env.SUBS.delete(entry.name);
        continue;
      }

      let dirty = false;
      for (const s of sub.sessions) {
        try {
          const key = locKey(s.lat, s.lon);
          let data = forecasts.get(key);
          if (!data) {
            data = await fetchForecast(s.lat, s.lon);
            forecasts.set(key, data);
          }
          // custom activities aren't in ACTIVITIES — rebuild one from the
          // stored criteria so snowBase-style behaviour survives the trip
          const stored = sub.criteria[s.activityId];
          const customs: CustomActivity[] =
            stored?.snowBase != null
              ? [
                  {
                    id: s.activityId,
                    name: s.name ?? s.activityId,
                    emoji: '🏅',
                    cat: 'custom',
                    season: 'all',
                    w: stored.w,
                    tMin: stored.tMin,
                    tMax: stored.tMax,
                    snowBase: stored.snowBase,
                  },
                ]
              : [];
          const crit = criteriaFrom(s.activityId, stored, customs);
          const b = getBlock(data, s.day, s.h, s.len, crit, sub.tolMult || TOL_MULT.balanced);
          if (!b) continue;
          if (s.baseBand == null) {
            s.baseBand = b.band;
            s.baseScore = b.score;
            dirty = true;
            continue;
          }
          if (b.band === s.baseBand) continue;

          const { title, body } = alertText(s, b.band, b.score, sub.lang);
          const payload = await buildPushPayload(
            { data: JSON.stringify({ title, body, url: 'https://blockcast.ca/#planner', tag: `bc-${s.id}` }) },
            sub.subscription,
            vapid,
          );
          const res = await fetch(sub.subscription.endpoint, payload);
          if (res.status === 404 || res.status === 410) {
            await env.SUBS.delete(entry.name); // subscription expired
            dirty = false;
            break;
          }
          s.baseBand = b.band;
          s.baseScore = b.score;
          dirty = true;
        } catch {
          // one bad session/fetch must not sink the whole run
        }
      }
      if (dirty) await env.SUBS.put(entry.name, JSON.stringify(sub));
    }
  } while (cursor);
}
