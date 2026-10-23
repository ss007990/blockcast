/* global console, fetch, setTimeout */
// Where BlockCast ranks in App Store search, Canada and US, for the terms its
// users type. Uses Apple's public iTunes Search API (no key). Results track
// the real App Store closely but not exactly.
//
//   node app/scripts/aso-rank.mjs

const APP_ID = 6796484224;
const TERMS = [
  'blockcast',
  'sport weather',
  'golf weather',
  'tennis weather',
  'pickleball weather',
  'cycling weather',
  'fishing weather',
  'ski weather',
  'snowmobile weather',
  'hiking weather',
  'sailing weather',
  'météo sport',
  'météo golf',
  'météo vélo',
  'météo ski',
  'motoneige',
];

for (const country of ['ca', 'us']) {
  for (const term of TERMS) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=200`;
    try {
      const d = await (await fetch(url)).json();
      const i = d.results.findIndex((x) => x.trackId === APP_ID);
      console.log(`${country}\t${i < 0 ? `>${d.resultCount}` : `#${i + 1}`}\t${term}`);
    } catch (e) {
      console.log(`${country}\terror\t${term}\t${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}
