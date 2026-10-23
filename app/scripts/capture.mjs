/* global console, process, fetch, WebSocket, Buffer, setTimeout */
// Headless Chrome screenshot driver for marketing captures (landing-page
// shots, link previews, App Store frames). Uses a throwaway profile, never the
// user's Chrome. Each job opens a fresh tab in the same browser:
//
//   node app/scripts/capture.mjs jobs.json
//
// job: { url | html, out, width=390, height=844, dpr=3, mobile=true, locale
// (e.g. "fr-CA" gives the French UI), tz, seed (JS run before the page, once;
// set "blockcast.introSeen" and blockcast.v2.settings here), waitFor (JS
// expression polled until truthy), settle ms, eval (JS run before the shot),
// format "png"|"jpeg", quality }
//
// Open the app on a place without the location prompt with a share link:
// http://localhost:3000/?a=pickleball&at=26.142,-81.7948&n=Naples#week
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const port = 9333;
const profile = mkdtempSync(join(process.env.SCRATCH || tmpdir(), 'chrome-'));
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--disable-extensions',
    '--allow-file-access-from-files',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json())
      .webSocketDebuggerUrl;
  } catch {
    await sleep(200);
  }
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, (m) =>
      m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result),
    );
    ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

for (const job of jobs) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable');
  await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', {
    width: job.width ?? 390,
    height: job.height ?? 844,
    deviceScaleFactor: job.dpr ?? 3,
    mobile: job.mobile ?? true,
  });
  if (job.locale) await S('Emulation.setLocaleOverride', { locale: job.locale });
  if (job.tz) await S('Emulation.setTimezoneOverride', { timezoneId: job.tz });
  if (job.locale)
    await S('Network.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      acceptLanguage: job.locale,
      platform: 'iPhone',
    });
  if (job.seed)
    await S('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{if(!sessionStorage.getItem('seeded')){${job.seed};sessionStorage.setItem('seeded','1')}}catch(e){}`,
    });
  if (job.html) {
    await S('Page.navigate', { url: 'about:blank' });
    const { frameTree } = await S('Page.getFrameTree');
    await S('Page.setDocumentContent', {
      frameId: frameTree.frame.id,
      html: readFileSync(job.html, 'utf8'),
    });
  } else await S('Page.navigate', { url: job.url });
  const t0 = Date.now();
  let ok = !job.waitFor;
  while (!ok && Date.now() - t0 < (job.timeout ?? 20000)) {
    const r = await S('Runtime.evaluate', { expression: job.waitFor, returnByValue: true });
    ok = !!r.result.value;
    if (!ok) await sleep(400);
  }
  await sleep(job.settle ?? 1500);
  if (job.eval) {
    const r = await S('Runtime.evaluate', {
      expression: job.eval,
      returnByValue: true,
      awaitPromise: true,
    });
    if (job.log) console.log(job.out, JSON.stringify(r.result.value));
    await sleep(job.settle2 ?? 800);
  }
  const shot = await S('Page.captureScreenshot', {
    format: job.format ?? 'png',
    ...(job.quality ? { quality: job.quality } : {}),
    captureBeyondViewport: false,
  });
  writeFileSync(job.out, Buffer.from(shot.data, 'base64'));
  console.log(ok ? 'ok  ' : 'TIMEOUT', job.out);
  await send('Target.closeTarget', { targetId });
}
ws.close();
chrome.kill();
