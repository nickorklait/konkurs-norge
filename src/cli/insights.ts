// npm run insights
// Reads Instagram statistics (followers, and reach and interactions per post) into insights.json next to
// the publish log, for the growth report. Needs the instagram_business_manage_insights permission on the
// token; without it this records "missing-permission" and exits normally, so the run never fails on it.

import fs from 'node:fs';
import path from 'node:path';
import { InstagramClient, InstagramError } from '../publish/instagram.ts';
import { readProfile, type Profile } from '../publish/profile.ts';
import { loadCredentials, readPublished } from '../publish/state.ts';
import { STATE_DIR } from '../publish/state.ts';

interface Insights {
  updatedAt?: string;
  error?: string;
  username?: string;
  /** Is the profile set up (picture, bio) and does it follow anyone: the growth report's checklist. */
  profile?: Profile;
  /** One point per Oslo day. */
  followers: { date: string; count: number }[];
  /** Per publication key. */
  media: Record<string, { mediaId: string; kind: 'feed' | 'story' | 'reel'; fetchedAt: string; publishedAt: string; permalink: string | null; reach?: number; likes?: number; comments?: number; saved?: number; shares?: number; replies?: number }>;
}

const FILE = path.join(STATE_DIR, 'insights.json');
const read = (): Insights => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { followers: [], media: {} });
const write = (i: Insights) => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(i, null, 2) + '\n');
};

let insights = read();
const creds = loadCredentials();
if (!creds?.token) {
  console.log('Insights: no Instagram token here; skipped.');
  process.exit(0);
}
try {
  const probe = new InstagramClient({ userId: 'me', token: creds.token, apiVersion: 'v26.0' });
  const me = await probe.whoAmI();
  const ig = new InstagramClient({ userId: me.userId, token: creds.token, apiVersion: 'v26.0' });
  const { followers } = await ig.accountStats();
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());
  insights.followers = [...insights.followers.filter((p) => p.date !== today), { date: today, count: followers }].sort((a, b) => a.date.localeCompare(b.date));
  insights.profile = (await readProfile(creds.token)) ?? insights.profile;

  // Feed posts for 30 days (numbers keep growing), stories for 24 hours (Instagram drops them after that).
  let readCount = 0;
  for (const [key, e] of Object.entries(readPublished())) {
    const age = Date.now() - Date.parse(e.publishedAt);
    // Each read counts against the Meta app's shared rate limit: posts for 14 days, each at most every 6 hours.
    if (age > (e.kind === 'story' ? 24 * 3.6e6 : 14 * 864e5) || !e.mediaIds[0]) continue;
    const seen = insights.media[key]?.fetchedAt;
    if (seen && Date.now() - Date.parse(seen) < 6 * 3.6e6) continue;
    try {
      const values = await ig.mediaInsights(e.mediaIds[0], e.kind);
      insights.media[key] = { mediaId: e.mediaIds[0], kind: e.kind, fetchedAt: new Date().toISOString(), publishedAt: e.publishedAt, permalink: e.permalink, ...values };
      readCount++;
    } catch (err) {
      // Too new (numbers lag) or too few views for a story: try again next run.
      if (err instanceof InstagramError && err.code === 10 && !/permission/i.test(err.message)) continue;
      throw err;
    }
  }
  insights = { ...insights, username: me.username, updatedAt: new Date().toISOString(), error: undefined };
  write(insights);
  console.log(`Insights: @${me.username}, ${followers} followers, statistics read for ${readCount} publications.`);
} catch (e) {
  const missing = e instanceof InstagramError && (/permission/i.test(e.message) || e.code === 10 || e.code === 200);
  write({ ...insights, updatedAt: new Date().toISOString(), error: missing ? 'missing-permission' : (e as Error).message.slice(0, 200) });
  console.warn(missing ? 'Insights: the token lacks instagram_business_manage_insights.' : `Insights failed: ${(e as Error).message}`);
}
