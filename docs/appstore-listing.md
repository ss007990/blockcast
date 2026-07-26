# App Store Connect — listing draft

Everything below is copy-paste-ready for App Store Connect. Character limits noted where they apply.

## Basics

| Field | Value |
| --- | --- |
| App name (30 chars max) | BlockCast — Sport Weather |
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

Pick your sport — tennis, golf, cycling, skiing, sailing, or one you create yourself — and BlockCast scores every block of your week from live weather data. Green means go. Tap a block to see exactly why: rain odds, wind, feels-like temperature, UV, hour by hour.

THE WEEK AT A GLANCE
A heat map of your next 7–14 days, scored for your sport. Choose 2, 3, 4, or 6-hour blocks, set the hours you actually play, and dial your risk tolerance from cautious to tolerant.

TODAY, BLOCK BY BLOCK
Right-now conditions, your best remaining window, sunrise and sunset, and a live radar with rain, wind, and wave overlays.

PLAN IT, THEN FORGET IT
Add sessions to your planner and subscribe once to your private calendar feed — every session you plan appears in Apple Calendar automatically. BlockCast re-checks the forecast and alerts you if a planned session turns bad.

TUNED TO YOU
Every sport has its own criteria — what counts as too windy for tennis isn't too windy for sailing. Adjust the thresholds until the scores match your judgment.

PRIVATE BY DESIGN
No account. No ads. No tracking. Your settings and plans stay on your device. Live weather by Open-Meteo; maps by OpenStreetMap contributors.

## Description (FR)

BlockCast répond à une seule question : quand, cette semaine, devriez-vous sortir jouer?

Choisissez votre sport — tennis, golf, vélo, ski, voile, ou créez le vôtre — et BlockCast note chaque bloc de votre semaine à partir de données météo en direct. Vert = allez-y. Touchez un bloc pour voir exactement pourquoi : probabilité de pluie, vent, température ressentie, UV, heure par heure.

LA SEMAINE D'UN COUP D'ŒIL
Une carte thermique de vos 7 à 14 prochains jours, notée pour votre sport. Blocs de 2, 3, 4 ou 6 heures, plage horaire personnalisée, tolérance au risque réglable.

AUJOURD'HUI, BLOC PAR BLOC
Conditions actuelles, votre meilleure fenêtre restante, lever et coucher du soleil, et un radar en direct avec pluie, vent et vagues.

PLANIFIEZ, PUIS OUBLIEZ
Ajoutez des séances à votre planificateur et abonnez-vous une fois à votre flux calendrier privé — chaque séance apparaît automatiquement dans Calendrier. BlockCast revérifie les prévisions et vous alerte si une séance planifiée tourne mal.

RÉGLÉ POUR VOUS
Chaque sport a ses propres critères — trop de vent pour le tennis n'est pas trop de vent pour la voile. Ajustez les seuils jusqu'à ce que les notes correspondent à votre jugement.

PRIVÉ PAR CONCEPTION
Pas de compte. Pas de publicité. Pas de pistage. Vos réglages et vos plans restent sur votre appareil. Météo en direct par Open-Meteo; cartes par les contributeurs OpenStreetMap.

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

> BlockCast needs no account. To see the core flow: allow (or skip) location, pick an activity from the top-left chip, and tap any green block in the Week heat map to see its detail and add it to the planner. Push notifications and the calendar feed are optional and clearly labeled. Weather data comes from Open-Meteo; the radar sheet embeds Windy.com with attribution.

## Screenshots needed (6.9" iPhone Pro Max sim + 6.5"; iPad if we enable iPad)

1. Week heat map, a mixed week with green/amber/red blocks (hero shot)
2. Block detail sheet with hour-by-hour chart
3. Today view, sunny day
4. Radar sheet with rain overlay
5. Planner with two sessions + calendar feed panel
6. Dark mode Week view

## Still to decide before submitting

- iPhone-only or iPhone + iPad for v1 (the layout is responsive; iPad multitasking sizes need a quick pass)
- Marketing URL (optional — blockcast.ca)
- Copyright line: "© 2026 Sandy Scullion"
