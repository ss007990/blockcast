// Builds the static per-sport landing pages into app/public, where Vite copies
// them verbatim: /golf-weather/, /fr/meteo-golf/ and so on, plus landing.css,
// sitemap.xml and robots.txt. Run after editing sports.mjs:
//
//   node app/scripts/landing/build.mjs
//
// The pages are plain HTML on purpose: search engines and link previews read
// them without running the app, and they cost app users nothing (the service
// worker neither precaches nor intercepts them, see vite.config.ts).

/* global console */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTIVITIES, WIND_HI_DEFAULT } from '../../src/core/activities.ts';
import { SPORTS } from './sports.mjs';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '../../public');
const ORIGIN = 'https://blockcast.ca';
const APP_STORE = 'https://apps.apple.com/app/id6796484224';
const UPDATED = '2026-10-23';

const UI = {
  en: {
    open: 'Open BlockCast',
    cta: (s) => `See this week’s ${s.toLowerCase()} forecast`,
    store: 'Free on the App Store',
    fine: 'Free. No account, no ads, no tracking. iPhone, iPad and any web browser.',
    caption: (place) => `Live forecast for ${place}, captured ${UPDATED}.`,
    alt: (s, place) =>
      `BlockCast week heat map for ${s.toLowerCase()} in ${place}: each block of the day scored green, yellow or red`,
    weightsH: (s) => `What BlockCast checks for ${s.toLowerCase()}`,
    weightsP:
      'Every block gets a risk score from 0 to 100: green under 25, yellow under 55, red above. The worst factor drives the score and the others add to it. These are the default weights; you can change any of them in the app under Adjust.',
    comfort: (c, f) => `Comfortable feels-like temperature: ${c} (${f}).`,
    windBand: (kmh, kn) => `Ideal wind: ${kmh} (${kn}). Less is a risk too.`,
    windNote: `Wind adds risk from ${WIND_HI_DEFAULT} km/h (12 mph) sustained or 38 km/h (24 mph) in gusts.`,
    factors: {
      rain: 'Rain',
      wind: 'Wind & gusts',
      cold: 'Cold',
      heat: 'Heat',
      uv: 'UV',
      snow: 'Snow base',
      fresh: 'Fresh snow',
      swell: 'Swell',
      tide: 'Tide',
    },
    howH: 'How it works',
    how: (s) => [
      [
        `Pick ${s.toLowerCase()} and your spot.`,
        'Use your location or search any place in the world, and save up to three.',
      ],
      [
        'Read your week at a glance.',
        'Choose 2, 3, 4 or 6 hour blocks and the hours you actually play. Tap any block for the hour-by-hour detail and the reason behind its colour.',
      ],
      [
        'Plan it and stop checking.',
        'Add the session to your planner and your calendar. BlockCast re-checks every forecast and tells you if a planned session turns bad.',
      ],
    ],
    faqH: (s) => `${s} weather questions`,
    dataH: 'Where the data comes from',
    data: 'Forecasts come from Open-Meteo. Rain is the wettest of three models (the local best match, ECMWF and Canada’s GEM), so a green block means they all agree. Radar is the North American composite from Environment and Climate Change Canada; official alerts come from Environment Canada and the US National Weather Service.',
    bottomH: (s) => `Your next ${s.toLowerCase()} day is already in the forecast.`,
    others: 'Other sports',
    privacy: 'Privacy',
    other: 'Français',
  },
  fr: {
    open: 'Ouvrir BlockCast',
    cta: (s) =>
      `Voir la météo ${s.toLowerCase() === 'vélo' ? 'vélo' : s.toLowerCase()} de la semaine`,
    store: 'Gratuit sur l’App Store',
    fine: 'Gratuit. Pas de compte, pas de pub, pas de pistage. iPhone, iPad et tout navigateur web.',
    caption: (place) => `Prévisions en direct pour ${place}, captées le ${UPDATED}.`,
    alt: (s, place) =>
      `Carte de la semaine BlockCast pour ${s.toLowerCase()} à ${place} : chaque bloc noté vert, jaune ou rouge`,
    weightsH: (s) =>
      `Ce que BlockCast vérifie pour ${s === 'Course à pied' ? 'la course à pied' : s === 'Motoneige' ? 'la motoneige' : s === 'Randonnée' ? 'la randonnée' : s === 'Pêche' ? 'la pêche' : s === 'Voile' ? 'la voile' : 'le ' + s.toLowerCase()}`,
    weightsP:
      'Chaque bloc reçoit une note de risque de 0 à 100 : vert sous 25, jaune sous 55, rouge au-delà. Le pire facteur mène la note et les autres s’y ajoutent. Voici les poids par défaut; vous pouvez tous les changer dans l’app, sous Ajuster.',
    comfort: (c) => `Température ressentie confortable : ${c}.`,
    windBand: (kmh, kn) => `Vent idéal : ${kmh} (${kn}). Moins, c’est aussi un risque.`,
    windNote: `Le vent ajoute du risque dès ${WIND_HI_DEFAULT} km/h soutenus ou 38 km/h en rafales.`,
    factors: {
      rain: 'Pluie',
      wind: 'Vent et rafales',
      cold: 'Froid',
      heat: 'Chaleur',
      uv: 'UV',
      snow: 'Fond de neige',
      fresh: 'Neige fraîche',
      swell: 'Houle',
      tide: 'Marée',
    },
    howH: 'Comment ça marche',
    how: () => [
      [
        'Choisissez votre sport et votre lieu.',
        'Utilisez votre position ou cherchez n’importe quel endroit au monde, et enregistrez-en jusqu’à trois.',
      ],
      [
        'Lisez votre semaine d’un coup d’œil.',
        'Choisissez des blocs de 2, 3, 4 ou 6 heures et les heures où vous jouez vraiment. Touchez un bloc pour voir le détail heure par heure et la raison de sa couleur.',
      ],
      [
        'Planifiez et arrêtez de vérifier.',
        'Ajoutez la séance à votre planificateur et à votre calendrier. BlockCast revérifie chaque prévision et vous avertit si une séance planifiée tourne mal.',
      ],
    ],
    faqH: () => 'Questions fréquentes',
    dataH: 'D’où viennent les données',
    data: 'Les prévisions viennent d’Open-Meteo. La pluie retenue est la plus forte de trois modèles (le meilleur modèle local, le CEPMMT et le GEM canadien) : un bloc vert veut dire qu’ils sont tous d’accord. Le radar est la mosaïque nord-américaine d’Environnement et Changement climatique Canada; les alertes officielles viennent d’Environnement Canada et du National Weather Service américain.',
    bottomH: () => 'Votre prochaine bonne journée est déjà dans les prévisions.',
    others: 'Autres sports',
    privacy: 'Confidentialité',
    other: 'English',
  },
};

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const toF = (c) => Math.round((c * 9) / 5 + 32);
const kn = (kmh) => Math.round(kmh / 1.852);
const pathOf = (lang, slug) => (lang === 'en' ? `/${slug}/` : `/fr/${slug}/`);

const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="13" fill="#131417"/><g fill="#f4f4f0"><rect x="22" y="18" width="6" height="6" rx="1.4"/><rect x="29" y="18" width="6" height="6" rx="1.4"/><rect x="15" y="25" width="6" height="6" rx="1.4"/><rect x="22" y="25" width="6" height="6" rx="1.4"/><rect x="29" y="25" width="6" height="6" rx="1.4"/><rect x="36" y="25" width="6" height="6" rx="1.4"/><rect x="43" y="25" width="6" height="6" rx="1.4"/><rect x="8" y="32" width="6" height="6" rx="1.4"/><rect x="15" y="32" width="6" height="6" rx="1.4"/><rect x="22" y="32" width="6" height="6" rx="1.4"/><rect x="29" y="32" width="6" height="6" rx="1.4"/><rect x="36" y="32" width="6" height="6" rx="1.4"/><rect x="43" y="32" width="6" height="6" rx="1.4"/><rect x="50" y="32" width="6" height="6" rx="1.4"/><rect x="8" y="39" width="6" height="6" rx="1.4"/><rect x="15" y="39" width="6" height="6" rx="1.4"/><rect x="22" y="39" width="6" height="6" rx="1.4"/><rect x="29" y="39" width="6" height="6" rx="1.4"/></g><rect x="36" y="39" width="6" height="6" rx="1.4" fill="#1fab58"/><rect x="43" y="39" width="6" height="6" rx="1.4" fill="#e0b419"/><rect x="50" y="39" width="6" height="6" rx="1.4" fill="#e23636"/></svg>`;

// GoatCounter, same rules as the app's index.html: website only, #skipgc opts
// a device out, and nothing is set or stored about the visitor.
const ANALYTICS = `<script>
if (location.hash === '#skipgc') localStorage.setItem('skipgc', 't');
window.goatcounter = { no_onload: localStorage.getItem('skipgc') === 't' };
</script>
<script data-goatcounter="https://blockcast.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;

function page(sport, lang) {
  const c = sport[lang];
  const other = sport[lang === 'en' ? 'fr' : 'en'];
  const t = UI[lang];
  const act = ACTIVITIES[sport.id];
  const url = ORIGIN + pathOf(lang, c.slug);
  const altUrl = ORIGIN + pathOf(lang === 'en' ? 'fr' : 'en', other.slug);
  const enUrl = lang === 'en' ? url : altUrl;
  const frUrl = lang === 'en' ? altUrl : url;
  const appLink = `/?a=${sport.id}&ref=lp-${lang}-${sport.id}`;
  const img = `/img/sports/${lang}-${sport.id}.jpg`;
  const og = `${ORIGIN}/img/og/${lang}-${sport.id}.jpg`;

  const bars = Object.entries(act.w)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([k, v]) =>
        `<li><span class="f">${esc(t.factors[k])}</span><span class="bar" aria-hidden="true"><i style="width:${v * 10}%"></i></span><b>${v}<small>/10</small></b></li>`,
    )
    .join('\n          ');

  const comfortC = `${act.tMin} ${lang === 'en' ? 'to' : 'à'} ${act.tMax} °C`;
  const comfortF = `${toF(act.tMin)} to ${toF(act.tMax)} °F`;
  const wind = act.windIdeal
    ? t.windBand(
        `${act.windIdeal[0]} ${lang === 'en' ? 'to' : 'à'} ${act.windIdeal[1]} km/h`,
        `${kn(act.windIdeal[0])} ${lang === 'en' ? 'to' : 'à'} ${kn(act.windIdeal[1])} ${lang === 'en' ? 'knots' : 'nœuds'}`,
      )
    : t.windNote;

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'BlockCast: Sport Weather',
      operatingSystem: 'iOS, Web',
      applicationCategory: 'WeatherApplication',
      url: ORIGIN + '/',
      downloadUrl: APP_STORE,
      inLanguage: ['en', 'fr'],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
      description: c.meta,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];

  const others = SPORTS.filter((s) => s.id !== sport.id)
    .map((s) => `<a href="${pathOf(lang, s[lang].slug)}">${esc(s[lang].name)}</a>`)
    .join('\n        ');

  return `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'fr-CA'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(c.title)} · BlockCast</title>
  <meta name="description" content="${esc(c.meta)}" />
  <link rel="canonical" href="${url}" />
  <link rel="alternate" hreflang="en" href="${enUrl}" />
  <link rel="alternate" hreflang="fr" href="${frUrl}" />
  <link rel="alternate" hreflang="x-default" href="${enUrl}" />
  <meta name="theme-color" content="#f1f1ec" />
  <meta name="apple-itunes-app" content="app-id=6796484224" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="BlockCast" />
  <meta property="og:title" content="${esc(c.title)}" />
  <meta property="og:description" content="${esc(c.meta)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${og}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'fr_CA'}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="preload" href="/fonts/archivo-wdth-italic.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/landing.css" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  ${ANALYTICS}
</head>
<body>
  <header class="top">
    <a class="brand" href="/" aria-label="BlockCast">${LOGO}<span>BlockCast</span></a>
    <nav>
      <a class="lang" href="${pathOf(lang === 'en' ? 'fr' : 'en', other.slug)}" hreflang="${lang === 'en' ? 'fr' : 'en'}">${t.other}</a>
      <a class="btn small" href="${appLink}">${t.open}</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <div class="copy">
        <p class="kicker">${act.emoji} ${esc(c.name)}</p>
        <h1>${esc(c.h1)}</h1>
        <p class="lede">${esc(c.lede)}</p>
        <div class="ctas">
          <a class="btn" href="${appLink}">${esc(t.cta(c.name))}</a>
          <a class="btn ghost" href="${APP_STORE}">${t.store}</a>
        </div>
        <p class="fine">${t.fine}</p>
      </div>
      <figure class="phone">
        <img src="${img}" width="600" height="897" alt="${esc(t.alt(c.name, c.shot))}" />
        <figcaption>${esc(t.caption(c.shot))}</figcaption>
      </figure>
    </section>

    <section class="block">
      <h2>${esc(t.weightsH(c.name))}</h2>
      <p>${t.weightsP}</p>
      <ul class="bars">
          ${bars}
      </ul>
      <p class="note"><b>${esc(lang === 'en' ? t.comfort(comfortC, comfortF) : t.comfort(comfortC))}</b> ${esc(wind)}${act.snowBase ? (lang === 'en' ? ` Under ${Math.round(act.snowBase * 100)} cm of snow the ground counts as bare.` : ` Sous ${Math.round(act.snowBase * 100)} cm de neige, le sol est considéré comme nu.`) : ''}</p>
      <div class="legend" aria-hidden="true"><span class="g">0–24</span><span class="y">25–54</span><span class="r">55–100</span></div>
    </section>

    <section class="block">
      <h2>${t.howH}</h2>
      <ol class="how">
        ${t
          .how(c.name)
          .map(([h, p]) => `<li><b>${esc(h)}</b> ${esc(p)}</li>`)
          .join('\n        ')}
      </ol>
    </section>

    <section class="block faq">
      <h2>${esc(t.faqH(c.name))}</h2>
      ${c.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n      ')}
    </section>

    <section class="block">
      <h2>${t.dataH}</h2>
      <p>${t.data}</p>
    </section>

    <section class="bottom">
      <h2>${esc(t.bottomH(c.name))}</h2>
      <div class="ctas">
        <a class="btn" href="${appLink}">${esc(t.cta(c.name))}</a>
        <a class="btn ghost" href="${APP_STORE}">${t.store}</a>
      </div>
    </section>

    <nav class="others" aria-label="${t.others}">
      <h2>${t.others}</h2>
      <div>
        ${others}
      </div>
    </nav>
  </main>
  <footer>
    <span>© 2026 BlockCast</span>
    <a href="/privacy.html">${t.privacy}</a>
    <a href="${pathOf(lang === 'en' ? 'fr' : 'en', other.slug)}" hreflang="${lang === 'en' ? 'fr' : 'en'}">${t.other}</a>
  </footer>
</body>
</html>
`;
}

const CSS = `/* Landing pages for blockcast.ca (generated by app/scripts/landing/build.mjs).
   Same "Race Day" tokens as the app: chalk and carbon, one ember accent,
   condensed italic display type, mono for numbers. */
@font-face { font-family: 'Archivo'; src: url('/fonts/archivo-wdth-italic.woff2') format('woff2'); font-style: italic; font-weight: 100 900; font-stretch: 62% 125%; font-display: swap; }
@font-face { font-family: 'Plex Mono'; src: url('/fonts/ibm-plex-mono-500.woff2') format('woff2'); font-weight: 500; font-display: swap; }
:root {
  --bg: #f1f1ec; --surface: #fcfcfa; --surface-2: #e7e7e0; --ink: #131417; --ink-2: #55575c;
  --line: #dfdfd7; --accent: #e8440a; --accent-ink: #942905;
  --green: #157f40; --green-bg: #d9efdd; --amber: #96700a; --amber-bg: #f6ecc3; --red: #c01f1f; --red-bg: #f8dcd6;
  --font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Inter, sans-serif;
  --display: 'Archivo', 'Arial Narrow', sans-serif; --mono: 'Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0c0d0f; --surface: #15171a; --surface-2: #1d2024; --ink: #f1f1ec; --ink-2: #a9acb2; --line: #2a2d32;
    --accent: #ff6d3b; --accent-ink: #ff9a73; --green: #4cc47e; --green-bg: #12301f; --amber: #e0b419; --amber-bg: #33290a; --red: #ff6b6b; --red-bg: #3a1515; color-scheme: dark; }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 var(--font); }
a { color: inherit; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: 1080px; margin: 0 auto;
  padding: calc(14px + env(safe-area-inset-top)) 16px 14px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.brand svg { width: 34px; height: 34px; }
.brand span { font: italic 880 21px/1 var(--display); font-variation-settings: 'wdth' 76; text-transform: uppercase; letter-spacing: 0.01em; }
.top nav { display: flex; align-items: center; gap: 14px; font-size: 14px; }
.lang { color: var(--ink-2); }
main { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
.hero { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 48px; align-items: center; padding: 32px 0 56px; }
.kicker { font: 500 13px/1 var(--mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-ink); margin: 0 0 14px; }
h1, h2 { font-family: var(--display); font-style: italic; font-variation-settings: 'wdth' 76; text-transform: uppercase; letter-spacing: 0.005em; line-height: 0.98; margin: 0; }
h1 { font-size: clamp(38px, 6.2vw, 66px); font-weight: 880; }
h2 { font-size: clamp(24px, 3.4vw, 32px); font-weight: 820; margin-bottom: 14px; }
.lede { font-size: 18.5px; color: var(--ink-2); margin: 20px 0 26px; max-width: 34em; }
.ctas { display: flex; flex-wrap: wrap; gap: 10px; }
.btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 20px; border-radius: 999px; background: var(--ink); color: var(--bg);
  font-weight: 650; text-decoration: none; border: 1.5px solid var(--ink); }
.btn:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.ghost { background: transparent; color: var(--ink); }
.btn.ghost:hover { border-color: var(--accent); color: var(--accent); background: transparent; }
.btn.small { min-height: 38px; padding: 0 15px; font-size: 14px; }
.fine { font-size: 13.5px; color: var(--ink-2); margin-top: 14px; }
.phone { margin: 0; justify-self: center; max-width: 340px; }
.phone img { display: block; width: 100%; height: auto; border-radius: 28px; border: 1px solid var(--line);
  box-shadow: 0 8px 18px rgba(10, 11, 12, 0.13), 0 28px 70px rgba(10, 11, 12, 0.2); }
.phone figcaption { font: 500 11.5px/1.4 var(--mono); color: var(--ink-2); margin-top: 12px; text-align: center; }
.block { border-top: 1.5px solid var(--ink); padding: 34px 0 40px; display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 8px 48px; }
.block > h2 { grid-column: 1; grid-row: 1 / span 6; }
.block > :not(h2) { grid-column: 2; margin-top: 0; }
.block p { color: var(--ink-2); max-width: 40em; }
.bars { list-style: none; padding: 0; margin: 8px 0 18px; display: grid; gap: 9px; }
.bars li { display: grid; grid-template-columns: 9.5em 1fr 3.5em; align-items: center; gap: 12px; font-size: 15px; }
.bar { height: 12px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--accent); border-radius: 3px; }
.bars b { font: 500 15px/1 var(--mono); text-align: right; }
.bars small { color: var(--ink-2); font-size: 11px; }
.note { font-size: 15px; }
.note b { color: var(--ink); font-weight: 600; }
.legend { display: flex; gap: 6px; margin-top: 6px; }
.legend span { font: 500 12.5px/1 var(--mono); padding: 9px 12px; border-radius: 6px; }
.legend .g { background: var(--green-bg); color: var(--green); }
.legend .y { background: var(--amber-bg); color: var(--amber); }
.legend .r { background: var(--red-bg); color: var(--red); }
.how { margin: 0; padding-left: 1.3em; display: grid; gap: 12px; color: var(--ink-2); }
.how b { color: var(--ink); }
.faq details { border-bottom: 1px solid var(--line); padding: 14px 0; }
.faq details:first-of-type { padding-top: 0; }
.faq summary { cursor: pointer; font-weight: 650; list-style-position: outside; }
.faq details p { margin: 10px 0 0; }
.bottom { background: var(--ink); color: var(--bg); border-radius: 16px; padding: 40px 32px; margin: 16px 0 48px; }
.bottom h2 { font-size: clamp(28px, 4vw, 42px); margin-bottom: 22px; max-width: 18em; }
.bottom .btn { background: var(--bg); color: var(--ink); border-color: var(--bg); }
.bottom .btn.ghost { background: transparent; color: var(--bg); }
.bottom .btn:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
.others { padding-bottom: 32px; }
.others h2 { font-size: 20px; }
.others div { display: flex; flex-wrap: wrap; gap: 8px; }
.others a { text-decoration: none; padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; font-size: 14.5px; background: var(--surface); }
.others a:hover { border-color: var(--accent); }
footer { max-width: 1080px; margin: 0 auto; padding: 22px 16px calc(28px + env(safe-area-inset-bottom)); display: flex; gap: 18px; flex-wrap: wrap;
  font-size: 13px; color: var(--ink-2); border-top: 1px solid var(--line); }
@media (max-width: 760px) {
  .hero { grid-template-columns: 1fr; gap: 32px; padding-top: 12px; }
  .phone { max-width: 290px; }
  .block { grid-template-columns: 1fr; }
  .block > h2, .block > :not(h2) { grid-column: 1; grid-row: auto; }
  .bars li { grid-template-columns: 7.8em 1fr 3.2em; }
  .lang { display: none; }
  .bottom { padding: 32px 20px; }
}
`;

const write = (rel, content) => {
  const p = join(PUBLIC, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
};

write('landing.css', CSS);
const urls = [`${ORIGIN}/`];
for (const sport of SPORTS) {
  for (const lang of ['en', 'fr']) {
    const rel = pathOf(lang, sport[lang].slug);
    write(join(rel, 'index.html'), page(sport, lang));
    urls.push(ORIGIN + rel);
  }
}
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}
</urlset>
`,
);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
write('favicon.svg', LOGO.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
console.log(`wrote ${urls.length - 1} pages, landing.css, sitemap.xml, robots.txt, favicon.svg`);
