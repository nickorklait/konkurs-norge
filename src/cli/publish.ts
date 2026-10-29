// npm run publish [-- --date 2026-10-25] [--dry-run] [--now] [--check] [--only 2026-10-25-feed]
// Publishes today's post about the bankruptcies (carousel + stories) when it is due. Run `npm run generate` first.
// Follows the dashboard (data/controls.json): pause, skipped posts, edited captions, stories on/off.
// --only publishes that one post now (the dashboard's "Publiser nå"), also while paused, but never twice.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { paths } from '../config.ts';
import { readControls } from '../controls.ts';
import { cloudflaredAvailable, tunnelHost } from '../publish/host.ts';
import { InstagramClient, InstagramError, refreshToken } from '../publish/instagram.ts';
import { pngSize, pngToJpeg } from '../publish/jpeg.ts';
import { makeReel } from '../publish/reel.ts';
import { isDue, unitsFor, type Unit } from '../publish/plan.ts';
import { loadCredentials, readPublished, recordPublished, saveCredentials } from '../publish/state.ts';
import { updateStatus } from '../status.ts';

const { values: args } = parseArgs({
  options: { date: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, now: { type: 'boolean', default: false }, check: { type: 'boolean', default: false }, only: { type: 'string' } },
});
const controls = readControls();
const API_VERSION = 'v26.0';
const osloNow = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).replace(' ', 'T');

async function connect() {
  const creds = loadCredentials();
  if (!creds?.token) throw new Error('Missing INSTAGRAM_ACCESS_TOKEN (GitHub secret in the cloud, .env locally).');
  if (Date.now() - Date.parse(creds.refreshedAt) > 7 * 864e5) {
    try {
      const r = await refreshToken(creds.token);
      Object.assign(creds, { token: r.token, refreshedAt: new Date().toISOString() });
      console.log(`Access token refreshed (valid ${Math.round(r.expiresInSeconds / 86400)} days).`);
    } catch (e) {
      console.warn(`Token refresh not done (${(e as Error).message}); using the current token.`);
    }
  }
  const me = await new InstagramClient({ userId: 'me', token: creds.token, apiVersion: API_VERSION }).whoAmI();
  creds.userId = me.userId;
  if (creds.refreshedAt !== new Date(0).toISOString()) saveCredentials(creds);
  return { me, ig: new InstagramClient({ userId: me.userId, token: creds.token, apiVersion: API_VERSION }) };
}

if (args.check) {
  const { me, ig } = await connect();
  console.log(`Token OK: @${me.username} (${me.accountType ?? 'unknown type'}). API posts last 24 h: ${await ig.quotaUsage()}. cloudflared: ${cloudflaredAvailable() ? 'found' : 'MISSING'}.`);
  process.exit(0);
}

const now = osloNow();
const only = args.only;
const date = args.date ?? only?.slice(0, 10) ?? now.slice(0, 10);
const postFile = path.join(paths.output, date, 'post.json');
if (!fs.existsSync(postFile)) {
  console.log(`No post for ${date} (run npm run generate; Sundays have none).`);
  process.exit(only ? 1 : 0);
}
const post = JSON.parse(fs.readFileSync(postFile, 'utf8')) as { caption: string; images: { feed: string[]; story: string[] } };
const units = unitsFor(date, post, controls.settings.stories ?? true);
for (const u of units) if (u.kind === 'feed' && controls.captions[u.key]) u.caption = controls.captions[u.key];

const published = readPublished();
let due: Unit[];
if (only) {
  due = units.filter((u) => u.key === only && !published[u.key]);
  if (!due.length) console.log(published[only] ? `${only} is already published; never twice.` : `${only} not found.`);
} else if (controls.paused) {
  console.log('Paused from the dashboard: nothing is published automatically.');
  due = [];
} else {
  due = units.filter((u) => isDue(u, published, now, args.now) && !controls.skip.includes(u.key));
}
if (due.length === 0) {
  if (!only) console.log(`Nothing due (now ${now.replace('T', ' ')}; the post for ${date} goes out ${units[0].publishAt.replace('T', ' ')}).`);
  process.exit();
}
console.log(`Due: ${due.map((u) => u.key).join(', ')}`);

const runDir = path.join(paths.output, '_publish');
fs.rmSync(runDir, { recursive: true, force: true });
fs.mkdirSync(runDir, { recursive: true });
for (const u of due) {
  for (const img of u.images) {
    const png = fs.readFileSync(path.join(paths.output, date, img));
    const { width, height } = pngSize(png);
    fs.writeFileSync(path.join(runDir, img.replace(/\.png$/, '.jpg')), pngToJpeg(png, width, height));
  }
}
if (args['dry-run']) {
  console.log(`Dry run: nothing was sent. JPEGs in ${path.relative(process.cwd(), runDir)}.`);
  process.exit(0);
}

// A new account before its Instagram token is added: build everything, publish nothing.
if (!loadCredentials()?.token) {
  console.log(`Instagram is not connected yet (no INSTAGRAM_ACCESS_TOKEN): ${due.map((u) => u.key).join(', ')} built, not published.`);
  process.exit(0);
}

const { me, ig } = await connect();
console.log(`Publishing to @${me.username}.`);
const host = await tunnelHost(runDir);
const done: string[] = [];
const failures: { key: string; error: string }[] = [];
const describe = (e: unknown) => (e instanceof InstagramError ? `${e.message} (status ${e.status})` : (e as Error).message);
try {
  for (const u of due) {
    const urls = u.images.map((img) => host.url(img.replace(/\.png$/, '.jpg')));
    try {
      const ids = u.kind === 'feed' ? [await ig.publishFeed(urls, u.caption ?? '', `Konkurser i Norge etter fylke og bransje, uten navn (${date})`)] : await ig.publishStories(urls);
      const permalink = u.kind === 'feed' ? await ig.permalink(ids[0]).catch(() => null) : null;
      recordPublished(u.key, { publishedAt: new Date().toISOString(), kind: u.kind, mediaIds: ids, permalink });
      done.push(u.key);
      console.log(`  ✓ ${u.key}${permalink ? `  ${permalink}` : ''}`);
      if (u.kind === 'story') await reel(u, date, units);
    } catch (e) {
      failures.push({ key: u.key, error: describe(e) });
      console.error(`  ✗ ${u.key}: ${describe(e)}`);
    }
  }
} finally {
  await host.close();
  updateStatus('publish', { paused: controls.paused, published: done, failed: failures });
}
if (failures.length) process.exitCode = 1;

/** The story images as a Reel too (publish/reel.ts): Reels reach people who do not follow yet. Never fails the run. */
async function reel(u: Unit, folder: string, all: Unit[]): Promise<void> {
  const base = u.key.replace(/-story$/, '');
  const key = `${base}-reel`;
  if (readPublished()[key]) return;
  const caption = all.find((x) => x.key === `${base}-feed`)?.caption;
  if (!caption) return;
  try {
    const file = `${base.replace(/[^\w-]/g, '_')}.mp4`;
    // The last seconds ask people to follow: the Reel is shown to people who do not follow yet.
    makeReel(u.images.map((img) => path.join(paths.output, folder, img)), path.join(runDir, file), { endText: `Følg @${me.username} for mer`, fontDir: paths.fonts });
    const id = await ig.publishReel(host.url(file), caption);
    const permalink = await ig.permalink(id).catch(() => null);
    recordPublished(key, { publishedAt: new Date().toISOString(), kind: 'reel', mediaIds: [id], permalink });
    done.push(key);
    console.log(`  ✓ ${key}${permalink ? `  ${permalink}` : ''}`);
  } catch (e) {
    console.warn(`  ! ${key} not published (the story is): ${(e as Error).message}`);
  }
}
