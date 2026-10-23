# App Store 1.2: search and conversion changes

Written Oct 23, 2026. Everything here is copy-paste-ready for App Store
Connect, and every field has been checked against Apple's character limits.

## Why

On Oct 23, 2026 BlockCast ranked #1 for "blockcast" and #3 (Canada) / #8 (US)
for "sport weather", and **nowhere in the top 150** for "golf weather",
"pickleball weather", "fishing weather", "ski weather", "snowmobile",
"météo golf", "météo vélo" or "motoneige", in either store. Apps with 0 to 2
ratings hold the top spots for those searches only because the sport is in
their name or subtitle. Apple gives the title and subtitle the most weight and
combines words across title, subtitle and keyword field, so "Sport Weather" in
the title plus a sport in the subtitle reads as "golf weather" and so on.

The current subtitle ("Plan your sport around the sky") and keyword field
waste that space: the keyword field repeats "weather" and "sport", which are
already in the title.

## Changes that need a new version (ship with 1.2)

Subtitle, keywords, description and screenshots only change with a new app
version. 1.2 carries the share-link feature plus the Sept 27 forecast fixes.

| Field | English (Canada) | French (Canada) |
| --- | --- | --- |
| Subtitle (30) | `Golf, Tennis, Pickleball, Ski` (29) | `Golf, vélo, ski et motoneige` (28) |
| Keywords (100) | `cycling,bike,fishing,hiking,running,sailing,snowmobile,skiing,forecast,radar,wind,rain,outdoor,boat` (99) | `pickleball,tennis,pêche,randonnée,course,voile,prévisions,radar,vent,pluie,plein air,planificateur` (98) |

The French subtitle leads with motoneige and vélo on purpose: those are the
Québec searches, and the Canadian store reads both localizations.

### Two new localizations for the US store

The US store indexes **English (U.S.)** and **Spanish (Mexico)** metadata
(per App Store optimization vendors; Apple does not publish the table). The
app has neither today, so US searchers only see the English (Canada) fallback.
Adding both doubles the US keyword space.

- **English (U.S.)**: copy English (Canada) in full (name, subtitle,
  description, screenshots), keywords
  `cycling,bike,fishing,hiking,running,sailing,snowmobile,skiing,forecast,radar,wind,rain,outdoor,boat`.
- **Spanish (Mexico)**: name and description may stay English, keywords
  `motorcycle,atv,utv,pontoon,waterski,beach,picnic,boat,lake,tee time,court,kayak,snowboard,golfing`
  (97). These cover the app's other presets (motorcycle, UTV, water-ski,
  pontoon, beach, picnic) without spending the main field on them.

### What's New (1.2)

EN:

```
Share any block: tap Share in the block detail and send your crew a link that opens the same sport, place and time. Forecasts also retry on a bad connection and refresh when you come back to the app.
```

FR:

```
Partagez un bloc : touchez Partager dans le détail et envoyez à votre groupe un lien qui ouvre le même sport, le même lieu et la même heure. Les prévisions réessaient aussi après une coupure et se rafraîchissent au retour dans l’app.
```

### Description: first lines

Only the first two or three lines show before "more". Replace the opening
paragraph of each description with:

EN:

```
Which day this week should you golf, play pickleball, ride, ski or take the boat out? Pick your sport and BlockCast scores every block of your week green, yellow or red from live weather. Green means go.
```

FR:

```
Quel jour cette semaine pour le golf, le pickleball, le vélo, le ski ou la motoneige? Choisissez votre sport : BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge selon la météo en direct. Vert, on y va.
```

Add one line before PRIVATE BY DESIGN:

EN: `SHARE THE PLAN` / `Tap Share on any block and your foursome, doubles partner or riding group opens the same forecast, no app required.`

FR: `PARTAGEZ LE PLAN` / `Touchez Partager sur un bloc et votre groupe ouvre la même prévision, même sans l’app.`

### Screenshots

New captioned 6.9" sets (1320 x 2868), upload in file order:

- `docs/appstore/captioned-6.9-en/` (5): week, detail, today, radar, planner
- `docs/appstore/captioned-6.9-fr/` (4): same without radar (no rain anywhere
  in Québec the day they were captured; add one on the next rainy day)

The first screenshot is the one search results show, so it carries the
promise in six words. Keep the existing iPad set.

## Changes that work today (no new version)

**Promotional text** (170) sits above the description and can change any time
without review:

- EN (154): `New: share any block with your foursome or doubles partner in one tap. Ski and snowmobile scores read the snow base and fresh snow, ready for opening day.`
- FR (160): `Nouveau : partagez un bloc avec votre groupe en un geste. Les notes de ski et de motoneige lisent le fond de neige et la neige fraîche, prêtes pour l’ouverture.`

Until 1.2 is live, drop the "New: share" clause.

## In-App Events

Events show up in App Store search results and on the Today and Games tabs,
which is free visibility a 2-rating app does not otherwise get. Each runs up
to 31 days and can be announced 14 days ahead. Badge: **New Season**.
Images are in `docs/appstore/events/` (`*-card.jpg` 1920 x 1080 event card,
`*-details.jpg` 1080 x 1920 details page). No deep link needed.

| | Snowbird | Ski | Sled |
| --- | --- | --- | --- |
| Dates | Nov 2 to Dec 2 | Nov 27 to Dec 27 (Tremblant opens Nov 27) | Dec 15 to Jan 14 |
| Name EN (30) | Snowbird Golf & Pickleball | Ski Season Opener | Sled Season Is Open |
| Short EN (50) | Find the calm, dry days down south this winter. | Score every day of the week for skiing. | Plan your rides around base, cold and rain. |
| Long EN (120) | Save your winter spot next to home and BlockCast scores every block of the week for golf, pickleball or tennis there. | Base depth, fresh snow, cold and wind holds in one heat map. Pin your hill and know which day to take off. | BlockCast weighs snow cover first, then thaws, rain and deep cold, so the long ride goes on the right day. |
| Name FR (30) | Golf et pickleball au soleil | Ouverture de la saison de ski | La saison de motoneige |
| Short FR (50) | Trouvez les journées calmes et sèches en Floride. | Chaque journée de la semaine notée pour le ski. | Planifiez vos sorties selon la neige et le froid. |
| Long FR (120) | Enregistrez votre coin de Floride près de chez vous : BlockCast note chaque bloc de la semaine pour golf ou pickleball. | Fond de neige, neige fraîche, froid et vent dans une seule carte. Épinglez votre montagne et choisissez votre journée. | BlockCast pèse d’abord le fond de neige, puis les redoux, la pluie et le grand froid, pour rouler le bon jour. |
| Images | `snowbird-*` | `ski-*` | `sled-*` |

The ski and sled images use a Valle Nevado (Chile) forecast because no North
American hill had a base on Oct 23; recapture from a Québec hill before the
ski event goes live.

## Custom product pages (after 1.2)

Since July 2025 a custom product page can rank in organic search for keywords
assigned to it from the keyword field. Plan: one page per sport cluster, each
with its own first screenshot from `app/public/img/sports/` (re-captured at
1320 x 2868), and the matching landing page linking to it.

| Page | Assigned keywords |
| --- | --- |
| Golf & pickleball | golf, pickleball, tennis |
| Snow | skiing, snowmobile |
| Water | fishing, sailing, boat |
| Ride & run | cycling, bike, running, hiking |

## Featuring nomination

App Store Connect, BlockCast, **Featuring Nominations**, new nomination,
type "App Enhancements", for the 1.2 release:

> BlockCast is an independent Canadian app, built in Québec and fully
> bilingual, that answers one question for outdoor athletes: which day this
> week should I play? Version 1.2 adds shareable forecast links so a
> foursome, a doubles team or a riding group can plan around the same block.
> It needs no account and collects no data, and it combines three forecast
> models for rain so a green block means every credible model agrees.
> Relevant for winter sports stories (skiing and snowmobiling are scored on
> snow base and fresh snow) and for snowbird golf and pickleball season.
