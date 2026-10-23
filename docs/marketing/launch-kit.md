# BlockCast launch kit: every post, pitch and listing

Written Oct 23, 2026 for the push to 1,000 users. Each item is final copy, in
Sandy's voice, and says plainly that Sandy built the app. Nothing here has
been posted or sent. Items are numbered to match the approval queue.

Every link carries a `ref` so GoatCounter shows which post brought each
visitor (Referrers panel). `?a=<sport>` opens the app on that sport;
`/<sport>-weather/` is the landing page.

House rules for every post: answer every comment the same day, never
cross-post the same text to two subreddits on the same day, and leave at
least a day between Reddit posts so the account does not look like a spammer.

---

## 1. Hacker News: Show HN

When: Tuesday Oct 27 or Wednesday Oct 28, 8 to 10 AM Eastern. Only after
item 0 (site deployed) and with the Cloudflare Workers plan confirmed (a front
page day can pass the free plan's 100,000 requests).

**Title** (79 max):

```
Show HN: BlockCast, which hours this week suit your sport
```

**URL:** `https://blockcast.ca/?ref=hn`

**Text** (posted as the first comment, which is the HN convention when a URL is given):

```
I built BlockCast to answer "which evening this week should I book the court?" rather than "will it rain at 6?". It splits each day into 2 to 6 hour blocks and scores every block of the next 7 or 14 days for one activity (16 presets from tennis and golf to snowmobiling, or your own), green, yellow or red.

Things that might interest HN:

- Scoring: each factor (rain, wind and gusts, cold, heat, UV, snow base, fresh snow, swell, tide) gets a 0 to 1 severity from a ramp, times a per-activity weight. A block's risk is the worst factor plus 18% of the others, so one bad factor can't be averaged away by four good ones. Comfort uses apparent temperature.

- Rain blend: Open-Meteo's best_match resolved to GFS for Québec and showed an 18% chance of rain on a day ECMWF had at 73%. Rain probability and amount are now the maximum of best_match, ECMWF IFS and Canada's GEM, so green means all three agree.

- Radar: Environment Canada's GeoMet WMS (the observed North American composite, then their official PySTEPS extrapolation layer for roughly the next 70 minutes, then the HRDPS model), drawn on MapLibre with OpenFreeMap tiles. Frames are snapped to a web-mercator cell grid and proxied through a Cloudflare Worker, so everyone looking at the same city shares one upstream request.

- No account, no cookies; settings and plans live in localStorage. Push alerts and a subscribable calendar feed are opt-in: a worker re-scores planned sessions every 3 hours and only notifies when a session changes band.

- React 19 + Vite PWA, a pure TypeScript core shared by the app and the worker, Capacitor for the iOS build.

The defaults are my guesses for each sport. Every weight and threshold is tunable in the app, and if a default is wrong for most people I'd rather fix the default, so tell me where yours differs.
```

---

## 2. Product Hunt

When: Tuesday Nov 3 (12:01 AM Pacific launch). Needs Sandy's Product Hunt
account. Reply to every comment through the day.

- **Name:** BlockCast
- **Tagline** (60): `Which hours this week suit your sport, green to red`
- **Link:** `https://blockcast.ca/?ref=producthunt`
- **Topics:** Weather, Sports, iOS, Outdoors
- **Pricing:** Free
- **Description** (260):

```
Pick your sport and BlockCast scores every 2 to 6 hour block of your week green, yellow or red: rain from three models, wind and gusts, feels-like, UV, snow base, waves. Plan a session, add it to your calendar, and get alerted if it turns. Free, no account.
```

- **Gallery** (in order): `app/public/img/og/en-home.jpg`, `en-golf.jpg`,
  `en-pickleball.jpg`, then `docs/appstore/captioned-6.9-en/1-week.png`,
  `2-detail.png`, `5-planner.png`
- **Maker comment:**

```
Hi Product Hunt! I'm Sandy, and I built BlockCast in Québec.

Weather apps answer "will it rain at 3?". When I'm planning a week of sport I want a different answer: which block of which day is best for this activity. So BlockCast takes one sport and scores every block of your week from live forecasts, with weights that differ per sport. Wind matters more for pickleball than for tennis, heat matters more for running than rain does, and skiing cares about the snow base first.

A few details: green only shows when three forecast models agree on dry, there's no account and nothing tracked, and you can now share any block as a link that opens the same forecast for your group.

It's free on iPhone (Canada and US) and works in any browser. I'd love to hear which sport you'd score and whether the defaults match your judgment.
```

---

## 3. Reddit

Reddit is blocked in the Claude browser pane, and the Claude in Chrome
extension is not installed, so these are copy-paste for Sandy (or for Claude
once the extension is connected). Before each one, open the subreddit's
sidebar rules: if it allows self-promotion only in a weekly thread, post
there instead. Attach the image listed (Reddit image post with the text as
the body, or a text post with the image inline).

### 3a. r/pickleball (Sat Oct 31, morning)

Image: `app/public/img/sports/en-pickleball.jpg`

**Title:** `I made a free app that scores outdoor pickleball sessions by wind, rain and heat`

```
Outdoor balls and wind don't mix, so I built a scoring mode for pickleball into my weather app. It splits each day into blocks and colors every block of your week green, yellow or red, with wind weighted heavier than for tennis (8/10 vs 6/10) and gusts scored separately.

Screenshot is Naples, FL this week. Tap any block for the hour-by-hour wind and rain, and you can now share a block as a link so the group sees the same forecast.

Free, no account, no ads: https://blockcast.ca/?a=pickleball&ref=r-pickleball (iPhone app too, Canada and US).

Wind starts costing points at 20 km/h (12 mph) by default. Where do you call it? Happy to change the default if I'm off.
```

### 3b. r/10s (Tue Nov 3)

Image: `app/public/img/sports/en-tennis.jpg`

**Title:** `Built a tool that tells you which evening this week is best for outdoor tennis`

```
Picking a court night means squinting at hourly forecasts, so I built an app that does it: pick tennis and every 2 to 6 hour block of your week gets a green, yellow or red score from rain (weighted 10/10, wet courts are a lost hour), wind and gusts, feels-like temperature and UV.

Green only shows when three forecast models agree it stays dry. You can tune every weight if your limits differ.

Free and no account: https://blockcast.ca/?a=tennis&ref=r-10s

Curious what temperature you stop playing at. The default comfort band is 10 to 30 °C (50 to 86 °F) feels-like.
```

### 3c. r/golf (only if the rules allow; otherwise its weekly thread)

Image: `app/public/img/og/en-golf.jpg`

**Title:** `Made a free app that colors your week by golf weather so you can pick the tee time`

```
Pick golf and BlockCast scores every block of your week from rain (9/10 weight), wind, gusts, feels-like and UV. Screenshot is Orlando this week: Saturday afternoon is the one to avoid.

Free, no account: https://blockcast.ca/?a=golf&ref=r-golf

Built it myself in Québec. If the scores don't match your judgment, every weight is adjustable, and I'd like to hear where the defaults are off.
```

### 3d. r/iosapps (Wed Oct 28)

Image: `docs/appstore/captioned-6.9-en/1-week.png`

**Title:** `[Dev] BlockCast: weather scored for your sport, block by block (free, no account)`

```
Hi r/iosapps, I'm the developer. BlockCast picks one sport (16 presets from tennis to snowmobiling, or your own) and scores every block of your week green, yellow or red from live forecasts. Tap a block for the hour-by-hour reason, plan it, and it lands in your calendar with an alert if the forecast turns.

- No account, no ads, nothing tracked
- Rain is the worst of three forecast models, so green means they all agree
- Radar with the official Environment Canada nowcast, webcams near your spot
- English and French, °C/°F

App Store (Canada and US): https://apps.apple.com/app/id6796484224
Web version: https://blockcast.ca/?ref=r-iosapps

Feedback welcome, especially on the first-run experience.
```

### 3e. r/Quebec, en français (Thu Nov 5)

Image: `app/public/img/og/fr-home.jpg`

**Titre :** `J'ai créé une app québécoise gratuite qui note chaque bloc de votre semaine pour votre sport`

```
Bonjour! J'ai bâti BlockCast ici au Québec. Vous choisissez votre sport (vélo, golf, ski, motoneige, pêche, tennis, pickleball, randonnée...) et l'app note chaque bloc de 2 à 6 heures de votre semaine en vert, jaune ou rouge selon la météo.

- Entièrement en français, en °C, sans compte, sans pub, sans pistage
- Radar d'Environnement Canada avec la prévision immédiate officielle
- Pour la pluie, l'app retient le pire de trois modèles (dont le GEM canadien) : vert veut dire que tout le monde s'entend
- Ski et motoneige : notés selon le fond de neige et la neige fraîche, prêts pour la saison

iPhone : https://apps.apple.com/ca/app/id6796484224
Web : https://blockcast.ca/?ref=r-quebec

Vos commentaires sont les bienvenus, surtout sur les critères par défaut pour votre sport.
```

### 3f. r/skiing (week of Nov 30, after Tremblant opens)

Recapture `fr-skiing`/`en-skiing` from a Québec or Vermont hill first.

**Title:** `I built a ski-day scorer: base, fresh snow, cold and wind holds, block by block`

```
Pick skiing and BlockCast scores every block of your week: snow base carries the most weight (under 20 cm counts as bare), fresh snow helps, rain on snow hurts, and wind ramps up toward the gust range where lifts go on hold. Pin the hill, not the town.

Free, no account: https://blockcast.ca/?a=skiing&ref=r-skiing

Defaults are tunable. What wind speed shuts your home hill's upper lifts?
```

### 3g. r/snowmobiling (week of Dec 14)

**Title:** `Made a free app that scores sled days by snow base, thaw risk and rain`

```
Base first, everything else second: BlockCast weighs snow cover 10/10 for snowmobiling, then warm spells that soften the trail, rain, wind and deep cold, and colors every block of your week green, yellow or red. It's not a trail report, so pair it with your club's map.

Free, no account: https://blockcast.ca/?a=snowmob&ref=r-snowmobiling
```

---

## 4. Facebook groups (Sandy's account, groups Sandy belongs to)

Search Facebook for: `pickleball Floride québécois`, `snowbirds Floride`,
`Québécois en Floride`, `pickleball Québec`, `golf Québec`, and in December
`motoneige Québec` and the club groups along Sandy's trails. Read each
group's rules; many ban promotion outside a weekly thread.

### 4a. Snowbird / Floride groups (from Nov 2)

Image: `app/public/img/og/fr-pickleball.jpg`

```
Pour ceux qui jouent au golf ou au pickleball en Floride cet hiver : j'ai bâti une app québécoise gratuite, BlockCast, qui note chaque bloc de votre semaine en vert, jaune ou rouge pour votre sport (pluie, vent, chaleur, UV).

Astuce : enregistrez votre ville au Québec ET votre coin de Floride, et passez de l'un à l'autre d'un geste. Tout est en français et en °C, sans compte ni pub.

iPhone : https://apps.apple.com/ca/app/id6796484224
Web : https://blockcast.ca/fr/meteo-pickleball/?ref=fb-snowbirds

Bon hiver au soleil!
```

### 4b. Pickleball / golf / tennis groups in Québec (now, then spring)

```
J'ai créé une app gratuite pour savoir quel bloc de la semaine est le meilleur pour jouer dehors : BlockCast note chaque bloc de 2 à 6 heures en vert, jaune ou rouge selon la pluie, le vent, la température ressentie et les UV, avec des critères propres à chaque sport (le vent compte plus au pickleball qu'au tennis). On peut maintenant partager un bloc avec son groupe par lien.

https://blockcast.ca/?ref=fb-qc-sport (iPhone et web, sans compte)
```

### 4c. Motoneige groups (from Dec 15)

```
Pour planifier vos sorties : BlockCast note chaque bloc de votre semaine pour la motoneige selon le fond de neige, les redoux, la pluie, le vent et le grand froid. Ce n'est pas l'état des sentiers (gardez iMotoneige pour ça), mais ça dit quel jour viser.

Gratuit, sans compte : https://blockcast.ca/fr/meteo-motoneige/?ref=fb-motoneige
```

---

## 5. Press pitches

### 5a. MobileSyrup (EN), via the News Tips form at mobilesyrup.com/contact

```
Hi MobileSyrup team,

BlockCast is a free, bilingual iPhone app built in Québec that scores every block of your week for your outdoor sport, from golf and pickleball to skiing and snowmobiling, green, yellow or red from live forecasts.

A few Canadian angles: radar and the official nowcast come from Environment and Climate Change Canada's open data, rain is blended with Canada's GEM model, the app is fully in French and English, and it needs no account and collects no data. The 1.2 update adds shareable forecast links so a group can plan around the same block.

App Store: https://apps.apple.com/ca/app/id6796484224
Web: https://blockcast.ca/?ref=mobilesyrup
Screenshots: https://blockcast.ca/img/og/en-home.jpg

Happy to answer questions or provide anything else.

Sandy Scullion
sandy.p.scullion@gmail.com
```

### 5b. Le Courrier des Amériques (FR) to redac.courrierdefloride@gmail.com

**Objet :** `Une app québécoise gratuite pour planifier golf et pickleball en Floride`

```
Bonjour,

Je m'appelle Sandy Scullion et j'ai développé au Québec BlockCast, une application gratuite, en français, qui note chaque bloc de la semaine en vert, jaune ou rouge pour un sport extérieur : golf, pickleball, tennis, vélo, pêche, voile, et bien d'autres.

Pour vos lecteurs snowbirds, l'intérêt est concret : on enregistre sa ville au Québec et son coin de Floride, et on voit d'un coup d'œil quelle matinée de la semaine sera calme et sèche pour le pickleball ou le golf. L'app est entièrement en français, en °C, sans compte et sans publicité. Elle fonctionne sur iPhone et dans n'importe quel navigateur.

App Store : https://apps.apple.com/ca/app/id6796484224
Web : https://blockcast.ca/fr/meteo-pickleball/?ref=courrier
Image : https://blockcast.ca/img/og/fr-pickleball.jpg

Ce sera un plaisir de répondre à vos questions ou de vous faire une démonstration.

Merci et bonne saison,
Sandy Scullion
sandy.p.scullion@gmail.com
```

### 5c. The Dink (EN) to thedinkteam@heydink.com

**Subject:** `A free app that tells you which outdoor pickleball session will be calm`

```
Hi Dink team,

I built BlockCast, a free app that scores every block of your week for outdoor pickleball: green, yellow or red from rain, wind and gusts, heat and UV. Wind is weighted heavier than for tennis because outdoor balls drift so easily, and you can share a block as a link so the whole group sees the same forecast before anyone drives to the courts.

It's free with no account or ads, on iPhone (US and Canada) and the web: https://blockcast.ca/pickleball-weather/?ref=thedink

If it's useful for a tools or tips mention, I'd be glad to send anything you need.

Sandy Scullion
sandy.p.scullion@gmail.com
```

### 5d. Local paper (FR), template

To Sandy's local daily and the regional Radio-Canada station once Sandy
confirms the town. Angle: local developer, free bilingual app, built on
Environment Canada open data, ski and snowmobile season.

```
Bonjour,

J'habite [ville] et j'ai lancé BlockCast, une application gratuite et bilingue qui note chaque bloc de la semaine en vert, jaune ou rouge pour un sport extérieur, du vélo au ski et à la motoneige. Elle s'appuie sur les données ouvertes d'Environnement Canada (radar et prévision immédiate) et combine trois modèles de prévision, dont le GEM canadien, pour la pluie.

Avec l'ouverture des pentes et des sentiers, je crois que l'outil peut intéresser vos lecteurs. Ce sera un plaisir d'en parler.

https://blockcast.ca/fr/meteo-ski/?ref=presse-locale
Sandy Scullion, [téléphone]
```

---

## 6. Directories

| Site | What to submit | Notes |
| --- | --- | --- |
| AlternativeTo | BlockCast as an alternative to Windy, Weather Underground, MyRadar | Free account. Tags: weather, sports, golf, pickleball, privacy |
| Indie Hackers | Product page + a short "how I got my first 1,000 users" post later | Free account |
| SaaSHub | Listing | Free |

AlternativeTo description:

```
BlockCast scores every 2 to 6 hour block of your week green, yellow or red for one outdoor sport (golf, tennis, pickleball, cycling, running, hiking, fishing, sailing, skiing, snowmobiling and more) from live forecasts. Rain is the worst of three models, radar comes from Environment Canada, and there is no account or tracking. Free on iPhone and the web.
```

---

## 7. Club outreach (from Nov 9)

Clubs are the best multiplier: one newsletter mention reaches hundreds of
players. The share link already does what a club needs, a forecast for their
own courts: `https://blockcast.ca/?a=pickleball&at=<lat>,<lon>&n=<Club name>&ref=club-<slug>`.
Targets, 10 to 15 per week, personalised: Florida and Arizona pickleball and
golf clubs with a large Québécois membership, then Québec snowmobile clubs in
December.

```
Hi [name],

I built a free app, BlockCast, that scores every block of the week green, yellow or red for outdoor pickleball (wind, rain, heat, UV). I made a link that opens the forecast for [Club]'s courts specifically:

[link]

If it's useful, feel free to put it in your newsletter or on the board; members don't need an account or the app, it opens in any browser. No strings attached.

Sandy
```
