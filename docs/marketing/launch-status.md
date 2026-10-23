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
| S2 | App Store Connect API key (App Manager) in `~/.appstoreconnect/private_keys/`, Key ID and Issuer ID in `~/.appstoreconnect/blockcast.json` | waiting on Sandy |
| S3a | Hacker News signed in, Claude browser pane | waiting on Sandy |
| S3b | Product Hunt signed in, Claude browser pane | waiting on Sandy |
| S4a | `wrangler login` | waiting on Sandy (OAuth page opened Oct 23) |
| S4b | Cloudflare Workers Paid plan confirmed | waiting on Sandy |
| S5 | Apple Developer Program License Agreement update accepted (blocks the 1.2 upload) | waiting on Sandy |
| S6 | GoatCounter API token (read statistics) in `~/.goatcounter-token`, for the weekly numbers | not yet asked |
| S7 | Sandy's town, for the local press pitch (launch kit 5d) | not yet asked |

## Calendar

Owner "Claude" means Claude does it in the built-in browser pane once its
setup item is done; if the precondition is missing on the day, Claude notifies
Sandy instead and retries the next day. Owner "Sandy" means Claude sends
Sandy the exact text, image path and link that morning. Reddit is blocked in
the browser pane, so Reddit is Sandy's unless the Claude in Chrome extension
is connected.

| Date | Item | Owner | Copy | Needs | Status |
| --- | --- | --- | --- | --- | --- |
| Oct 23 | Website: share links, landing pages, previews | Claude | | | done, live |
| Oct 23 | iOS 1.2 (14) archived | Claude | | | archived; upload blocked on S5 |
| asap | 1.2 upload, metadata, screenshots, en-US + es-MX localizations, promo text, submit for review, featuring nomination | Claude | appstore-1.2.md | S2, S5 | pending |
| Oct 27 9:00 ET | Show HN | Claude | kit 1 | S3a, S4b | pending |
| Oct 28 | r/iosapps | Sandy | kit 3d | | pending |
| Oct 31 | r/pickleball | Sandy | kit 3a | | pending |
| by Oct 30 | Create In-App Event "Snowbird" (starts Nov 2) | Claude | appstore-1.2.md | S2 | pending |
| Nov 2 | Facebook snowbird groups | Sandy | kit 4a | | pending |
| Nov 2 | Email Le Courrier des Amériques | Claude via Sandy's Gmail in the pane, else Sandy | kit 5b | Gmail signed in | pending |
| by Nov 1 | Schedule Product Hunt launch for Nov 3 | Claude | kit 2 | S3b | pending |
| Nov 3 | Product Hunt launch day: draft replies to comments for Sandy | Claude | | S3b | pending |
| Nov 4 | r/10s | Sandy | kit 3b | | pending |
| Nov 5 | r/Quebec | Sandy | kit 3e | | pending |
| Nov 9 | Email The Dink | Claude via Gmail, else Sandy | kit 5c | | pending |
| Nov 9 | Clubs batch 1: research 10 to 15 clubs, write each email, send the batch to Sandy for approval | Claude | kit 7 | | pending |
| Nov 10 | r/golf (only if its rules allow; else its weekly thread) | Sandy | kit 3c | | pending |
| Nov 10 | MobileSyrup tips form (only once 1.2 is live, the pitch mentions it) | Claude | kit 5a | 1.2 live | pending |
| by Nov 13 | Create In-App Event "Ski Season Opener" (starts Nov 27) | Claude | appstore-1.2.md | S2 | pending |
| Nov 16 | Clubs batch 2; local press pitch | Claude drafts | kit 5d, 7 | S7 | pending |
| Nov 23 | Clubs batch 3; recapture ski and snowmobile shots if a Québec hill has a base | Claude | | | pending |
| Nov 30 | r/skiing | Sandy | kit 3f | | pending |
| by Dec 1 | Create In-App Event "Sled Season" (starts Dec 15) | Claude | appstore-1.2.md | S2 | pending |
| Dec 14 | r/snowmobiling | Sandy | kit 3g | | pending |
| Dec 15 | Facebook motoneige groups; snowmobile clubs batch | Sandy / Claude drafts | kit 4c, 7 | | pending |
| Dec 20 | Final count against the 1,000 target | Claude | | | pending |

## Log

- Oct 23: site deployed and verified (share links open the right block on
  blockcast.ca); Share button verified in the native app on the simulator;
  1.2 (14) archived, upload refused with "PLA Update available".
