# BlockCast

**Plan your sport around the sky.**

BlockCast splits your day into blocks (2/3/4/6 h) and scores each block of the coming week for your activity — tennis, cycling, jogging, fishing, golf, hiking, sailing, picnic, skiing, snowmobiling — as a simple green / yellow / red heat map. Live at [blockcast.ca](https://blockcast.ca).

## Features

- **Today dashboard** — current felt conditions plus a "Go out & play" rail: the best windows of your week, ranked by the scoring engine
- **Season-aware** — winter sports float to the top of the activity list in winter, and a forecasted snowfall pops a ski/snowmobile suggestion
- **Week heat map** — every block scored 0–100 from live [Open-Meteo](https://open-meteo.com) data (felt temperature, rain, wind & gusts, UV, snow base, fresh snow)
- **Block detail** — factor breakdown plus hour-by-hour charts, sunrise/sunset
- **Planner** — sessions re-checked on every fresh forecast, calendar export (.ics), in-app alerts when a planned session's risk band changes
- **Push alerts** *(optional)* — a Cloudflare Worker re-checks subscribed sessions on a cron and sends Web Push notifications
- **Nearby cams** *(optional)* — the closest [Windy](https://www.windy.com/webcams) webcams around the spot, pinned on a mini map: the ground truth the forecast can't give
- **Per-activity tuning** — every factor weight and the comfort band are adjustable and persisted
- **Global-ready** — English/Français, °C/°F, km/h/mph, 12/24-hour clock, light/dark/auto theme
- **PWA** — installable, offline shell, no account, no tracking; settings and plans stay on the device

## Architecture

npm workspaces monorepo:

- **`app/`** — the PWA. Vite + React + TypeScript (strict). `src/core` is pure, framework-free domain logic (scoring, suggestions, season, alerts, units, ics, geo) — the same modules run in the browser and in the worker. State in zustand stores with versioned localStorage persistence (v1 data is migrated automatically). Capacitor-ready for a future iOS build.
- **`worker/`** — Cloudflare Worker: `POST/DELETE /api/subscribe` + a 3-hourly cron that re-scores subscribed sessions with the shared core and sends Web Push (VAPID) on band changes. Also `GET /api/webcams` — a cached proxy over the Windy Webcams API that keeps the key server-side.

## Development

```sh
npm install
npm run dev        # app on http://localhost:5173
npm test           # vitest (app core + worker)
npm run typecheck
npm run lint
npm run build      # app/dist
```

## Deploying

- **App** — GitHub Actions builds and deploys `app/dist` to GitHub Pages on every push to `main` (repo Pages source must be set to "GitHub Actions"). The custom domain comes from `app/public/CNAME`.
- **Worker** *(optional, enables push)* —
  1. `npx wrangler kv namespace create SUBS` and paste the id into `worker/wrangler.toml`
  2. `npx web-push generate-vapid-keys`, then `npx wrangler secret put VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT`
  3. `npm run deploy -w worker`
  4. Set `VITE_PUSH_API` and `VITE_VAPID_PUBLIC_KEY` for the app build (see `app/.env.example`)
  5. *(nearby cams)* grab a free key at [api.windy.com/keys](https://api.windy.com/keys) (Webcams API), then `npx wrangler secret put WINDY_API_KEY` — until it is set the route answers 503 and the app hides the cams UI states gracefully
  6. *(radar outside North America)* `npx wrangler secret put RAINBOW_KEY` for a [rainbow.ai](https://rainbow.ai) key — without it `/api/rain/status` reports `enabled: false` and the app shows a no-coverage message instead of animating blank frames. Every cache miss is a billed tile, so `RAIN_TILE_BUDGET` in `wrangler.toml` (default 5000/day) caps the spend and the route answers 429 past it; `/api/rain/status` reports the day's count

## Credits

Weather data by [Open-Meteo](https://open-meteo.com) · Maps by [Leaflet](https://leafletjs.com) & [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
