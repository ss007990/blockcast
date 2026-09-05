# App Store Connect — listing draft

Everything below is copy-paste-ready for App Store Connect. Character limits noted where they apply.

## Basics

| Field | Value |
| --- | --- |
| App name (30 chars max) | BlockCast: Sport Weather |
| Subtitle (30 chars max) | Plan your sport around the sky |
| Bundle ID | ca.blockcast.app |
| SKU | blockcast-ios |
| Primary category | Weather |
| Secondary category | Sports |
| Price | Free |
| Privacy policy URL | https://blockcast.ca/privacy.html |
| Support URL | https://blockcast.ca |
| Primary language | English (Canada) |
| Localization | French (Canada) |

## Description (EN)

BlockCast answers one question: when this week should you go out and play?

Pick your sport (tennis, golf, cycling, skiing, sailing, or one you create yourself) and BlockCast scores every block of your week from live weather data. Green means go. Tap a block to see exactly why: rain odds, wind, feels-like temperature, UV, hour by hour.

THE WEEK AT A GLANCE
A heat map of your next 7–14 days, scored for your sport. Choose 2, 3, 4, or 6-hour blocks, set the hours you actually play, and dial your risk tolerance from cautious to tolerant.

TODAY, BLOCK BY BLOCK
Right-now conditions, your best remaining window, sunrise and sunset, air quality and UV, plus an animated radar that plays the past hour and the next six hours of rain, with wind and wave maps a tap away.

PLAN IT, THEN FORGET IT
Add sessions to your planner and subscribe once to your private calendar feed, and every session you plan appears in Apple Calendar automatically. BlockCast re-checks the forecast and alerts you if a planned session turns bad.

TUNED TO YOU
Every sport has its own criteria. What counts as too windy for tennis isn't too windy for sailing. Adjust the thresholds until the scores match your judgment.

PRIVATE BY DESIGN
No account. No ads. No tracking. Your settings and plans stay on your device. Weather by Open-Meteo, radar by Environment and Climate Change Canada, maps by OpenFreeMap and OpenStreetMap contributors.

## Description (FR)

BlockCast répond à une seule question : quand, cette semaine, devriez-vous sortir jouer?

Choisissez votre sport (tennis, golf, vélo, ski, voile, ou créez le vôtre) et BlockCast note chaque bloc de votre semaine à partir de données météo en direct. Vert = allez-y. Touchez un bloc pour voir exactement pourquoi : probabilité de pluie, vent, température ressentie, UV, heure par heure.

LA SEMAINE D'UN COUP D'ŒIL
Une carte thermique de vos 7 à 14 prochains jours, notée pour votre sport. Blocs de 2, 3, 4 ou 6 heures, plage horaire personnalisée, tolérance au risque réglable.

AUJOURD'HUI, BLOC PAR BLOC
Conditions actuelles, votre meilleure fenêtre restante, lever et coucher du soleil, qualité de l'air et UV, plus un radar animé qui joue la dernière heure et les six prochaines heures de pluie, avec les cartes de vent et de vagues à un doigt.

PLANIFIEZ, PUIS OUBLIEZ
Ajoutez des séances à votre planificateur et abonnez-vous une fois à votre flux calendrier privé. Chaque séance apparaît automatiquement dans Calendrier. BlockCast revérifie les prévisions et vous alerte si une séance planifiée tourne mal.

RÉGLÉ POUR VOUS
Chaque sport a ses propres critères. Trop de vent pour le tennis n'est pas trop de vent pour la voile. Ajustez les seuils jusqu'à ce que les notes correspondent à votre jugement.

PRIVÉ PAR CONCEPTION
Pas de compte. Pas de publicité. Pas de pistage. Vos réglages et vos plans restent sur votre appareil. Météo par Open-Meteo, radar par Environnement et Changement climatique Canada, cartes par OpenFreeMap et les contributeurs OpenStreetMap.

## Keywords (100 chars max, comma-separated, no spaces)

EN: `weather,sport,tennis,golf,planner,forecast,outdoor,wind,rain,radar,cycling,ski,sailing`
FR: `météo,sport,tennis,golf,planificateur,prévisions,plein air,vent,pluie,radar,vélo,ski`

## App Privacy (nutrition label) answers

- **Location → Coarse/Precise location**: collected, *not linked to identity*, used for **App Functionality** only. (Sent to Open-Meteo/geocoders to answer each request; not stored server-side.)
- **Identifiers/Usage Data**: GoatCounter runs only on the website, not in the shipped app binary — if it stays out of the native build, answer **"Data Not Collected"** for analytics. If it ships in the native app, declare **Product Interaction → not linked, App Functionality/Analytics**.
- **User Content**: planned sessions are stored on the push/calendar server only when the user enables notifications or the calendar feed — declare **User Content → not linked to identity → App Functionality**.
- No tracking (ATT not required — nothing is shared for cross-app advertising).

## Age rating questionnaire

All "None" — expect a **4+** rating. (Weather/radar content, no user-generated content, no web browsing UI.)

## Review notes (for the App Review team)

> BlockCast needs no account. To see the core flow: allow (or skip) location, choose an activity from the picker at the top, and tap any green block in the Week heat map to see its detail and add it to the planner. Push notifications and the calendar feed are optional and clearly labeled. Weather data comes from Open-Meteo. The radar sheet draws Environment Canada's public radar composite (MSC GeoMet, attributed in-app) on an OpenFreeMap base map; its Rain, Wind and Waves tabs and the nearby-webcams sheet embed Windy.com with attribution.

## Screenshots (captured Sept 5, 2026, in `docs/appstore/`)

Native-resolution simulator captures with the 9:41 status bar, Tennis, Québec City, build 8 code. Upload in this order.

`iphone-6.9/` (iPhone 17 Pro Max, 1320 x 2868, the 6.9" slot; ASC scales it for the smaller iPhone slots):

1. `01-today.png` Today: hero, best window, onboarding banner
2. `02-week.png` Week heat map, mixed week
3. `03-detail.png` Block detail with the hour-by-hour chart
4. `04-radar.png` Radar sheet, ECCC echoes over the OpenFreeMap base
5. `05-planner.png` Planner with two sessions, calendar sync, alerts
6. `06-week-dark.png` Week in dark mode (pins mark planned sessions)

`ipad-13/` (iPad Pro 13-inch, 2064 x 2752, the 13" slot; required because the binary targets iPad too):

1. `01-today.png` 2. `02-week.png` 3. `03-detail.png` 4. `04-week-dark.png`

Recipe if they ever need redoing: `xcodebuild -sdk iphonesimulator -configuration Release`, `simctl install/launch`, `simctl status_bar <udid> override --time 9:41 --batteryLevel 100 --batteryState charged --wifiBars 3 --cellularBars 4`, `simctl ui <udid> appearance dark` for the dark shot, `simctl io <udid> screenshot`. Pick "Quebec" from the location search rather than "My location" so the label reads "Quebec" (a GPS fix was reverse-geocoded to a neighbourhood name before the Sept 5 fix). Relaunch the app between shots to clear the last-opened block ring.

## Decisions (Sept 5, 2026)

- Price: **Free**, no in-app purchases for 1.0 (Pro tier revisited at 1.1; pre-paywall installers grandfathered).
- Availability: **Canada and United States** only (Aug 17 decision; keeps the app inside the free ECCC radar box).
- Devices: **iPhone and iPad** (the archive already targets both, `TARGETED_DEVICE_FAMILY = "1,2"`; the 13" iPad layout was checked in the simulator Sept 5 and holds up, so no re-archive needed for that).
- Marketing URL: https://blockcast.ca
- Copyright line: "© 2026 Sandy Scullion"
