# Launch status and calendar

The working calendar for the push to 1,000 users (plan page:
https://claude.ai/artifact/Pa52tbirjL3a55kb9Xo2Vz). The scheduled tasks
`blockcast-launch-daily` and `blockcast-weekly-checkin` read and update this
file. Copy for every item is in `launch-kit.md` (section shown) or
`appstore-1.2.md`.

**Approval:** Sandy approved setup S1 to S4 and items 1 to 10 of the plan, with
the texts exactly as written in the launch kit, in chat on Oct 23, 2026.
Anything not listed here, or any change to the approved text beyond fixing a
date or a broken link, needs a new yes from Sandy.

## Setup

| ID | What | Status |
| --- | --- | --- |
| S1 | Xcode license accepted | done Oct 23 |
| S2 | App Store Connect API key (App Manager) in `~/.appstoreconnect/private_keys/`, Key ID and Issuer ID in `~/.appstoreconnect/blockcast.json`; client: `app/scripts/asc.mjs` | done Oct 23 |
| S3a | Hacker News signed in, Claude browser pane | done Oct 23 (user sandypscullion, new account, karma 1) |
| S3b | Product Hunt signed in, Claude browser pane | done Oct 23 (@sandy_scullion) |
| S4a | `wrangler login` | done Oct 23 |
| S4b | Cloudflare Workers Paid confirmed by Sandy | done Oct 23 |
| S5 | Apple Developer Program License Agreement update accepted | done Oct 23 |
| S6 | GoatCounter API token (read statistics) in `~/.goatcounter-token` | done Oct 23; baseline 18 visits Sept 1 to Oct 23, all direct |
| S8 | Sales-role API key KLQY9X522S (read-only) + vendor number 94624929, for download counts | done Oct 23 |
| S7 | Sandy's town, for the local press pitch (launch kit 5d) | not yet asked |

## Calendar

Owner "Claude" means Claude does it in the built-in browser pane, in a
session, once its setup item is done and Sandy says go that day (the daily
8:30 task prepares the item and tells Sandy what to say; unattended public
posting was refused by the scheduler's safety check, which is fine). Owner "Sandy" means Claude sends
Sandy the exact text, image path and link that morning. Reddit is blocked in
the browser pane, so Reddit is Sandy's unless the Claude in Chrome extension
is connected.

| Date | Item | Owner | Copy | Needs | Status |
| --- | --- | --- | --- | --- | --- |
| Oct 23 | Website: share links, landing pages, previews | Claude | | | done, live |
| Oct 23 | iOS 1.2 (14) archived and uploaded to App Store Connect | Claude | | | done, processing |
| Oct 23 | 1.2 (15) with blockcast:// deep links: new subtitles, keywords, descriptions, promo text, en-US + es-MX localizations, captioned screenshots (EN 5, FR 4), submitted for review; featuring nomination filed | Claude | appstore-1.2.md | | done, Waiting for Review |
| Oct 27 9:00 ET | Show HN | Claude | kit 1 | S3a, S4b | pending |
| Oct 28 | r/iosapps | Sandy | kit 3d | | pending |
| Oct 31 | r/pickleball | Sandy | kit 3a | | pending |
| Oct 23 | In-App Event "Snowbird" (id 6826335361, Nov 2 to Dec 2, deep link blockcast://open?a=pickleball) submitted with 1.2 | Claude | appstore-1.2.md | | done, Waiting for Review |
| Nov 2 | Facebook snowbird groups | Sandy | kit 4a | | pending |
| Nov 2 | Email Le Courrier des Amériques | Claude via Sandy's Gmail in the pane, else Sandy | kit 5b | Gmail signed in | pending |
| Oct 23 | Product Hunt launch scheduled for Nov 3, 12:01 AM PT (name, tagline, description, App Store link, 6 gallery images, Free, tags Sports/Weather/Outdoors, categories Weather apps/Outdoors platforms/Fitness, maker comment) | Claude | kit 2 | | done, scheduled |
| Nov 3 | Product Hunt launch day: draft replies to comments for Sandy | Claude | | S3b | pending |
| Nov 4 | r/10s | Sandy | kit 3b | | pending |
| Nov 5 | r/Quebec | Sandy | kit 3e | | pending |
| Nov 9 | Email The Dink | Claude via Gmail, else Sandy | kit 5c | | pending |
| Nov 9 | Clubs batch 1: research 10 to 15 clubs, write each email, send the batch to Sandy for approval | Claude | kit 7 | | pending |
| Nov 10 | r/golf (only if its rules allow; else its weekly thread) | Sandy | kit 3c | | pending |
| Nov 10 | MobileSyrup tips form (only once 1.2 is live, the pitch mentions it) | Claude | kit 5a | 1.2 live | pending |
| by Nov 13 | Create In-App Event "Ski Season Opener" (starts Nov 27; deep link blockcast://open?a=skiing; recapture art on a Québec base first) | Claude | appstore-1.2.md | | pending |
| Nov 16 | Clubs batch 2; local press pitch | Claude drafts | kit 5d, 7 | S7 | pending |
| Nov 23 | Clubs batch 3; recapture ski and snowmobile shots if a Québec hill has a base | Claude | | | pending |
| Nov 30 | r/skiing | Sandy | kit 3f | | pending |
| by Dec 1 | Create In-App Event "Sled Season" (starts Dec 15; deep link blockcast://open?a=snowmob) | Claude | appstore-1.2.md | | pending |
| Dec 14 | r/snowmobiling | Sandy | kit 3g | | pending |
| Dec 15 | Facebook motoneige groups; snowmobile clubs batch | Sandy / Claude drafts | kit 4c, 7 | | pending |
| Dec 20 | Final count against the 1,000 target | Claude | | | pending |

## Log

- Oct 23: site deployed and verified (share links open the right block on
  blockcast.ca); Share button verified in the native app on the simulator;
  1.2 (14) archived, upload refused with "PLA Update available"; Sandy
  accepted the agreement and the upload succeeded at 13:13.
- Oct 23 (afternoon): ASC API key installed. Added blockcast:// deep links (In-App
  Events require one), uploaded 1.2 (15), set all 1.2 metadata through the API,
  submitted 1.2 + Snowbird event for review, filed the featuring nomination.
- Oct 23 (late afternoon): HN and Product Hunt signed in; Product Hunt launch
  scheduled for Nov 3 (my/products shows it). PH's own buttons needed their React
  onClick called directly while the pane was covered.
- Oct 23: download baseline from sales reports: 15 first-time downloads since
  launch (11 CA, 4 US; 12 in Sept 17 to 23, 3 in October), 2 redownloads, 11 updates.
