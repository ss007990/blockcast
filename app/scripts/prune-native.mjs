/* global console */
// The landing pages, their images and fonts (scripts/landing) are for the
// website only. `cap sync` copies all of dist into the iOS bundle, so remove
// them afterwards: they would add ~4 MB to the app for nothing.

import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPORTS } from './landing/sports.mjs';

const web = join(dirname(fileURLToPath(import.meta.url)), '../ios/App/App/public');
const paths = [
  ...SPORTS.map((s) => s.en.slug),
  'fr',
  'img',
  'fonts',
  'landing.css',
  'sitemap.xml',
  'robots.txt',
  'favicon.svg',
];
for (const p of paths) rmSync(join(web, p), { recursive: true, force: true });
console.log(`pruned ${paths.length} web-only paths from the iOS bundle`);
