// npm run dashboard: builds output/index.html from today's post in output/ and the state in data/ (counts only).
// In the cloud it runs after every workflow run and is deployed to Cloudflare Pages with the images.

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, paths } from '../config.ts';
import { readControls } from '../controls.ts';
import { dashboardPage, type TrafficRow } from '../dashboard.ts';
import { unitsFor, type Unit } from '../publish/plan.ts';
import { loadCredentials, readPublished } from '../publish/state.ts';
import { readStatus } from '../status.ts';

const config = loadConfig();
const controls = readControls();
const now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).replace(' ', 'T');
const date = now.slice(0, 10);

let units: Unit[] = [];
let rows: TrafficRow[] = [];
const postFile = path.join(paths.output, date, 'post.json');
if (fs.existsSync(postFile)) {
  const post = JSON.parse(fs.readFileSync(postFile, 'utf8')) as {
    caption: string;
    images: { feed: string[]; story: string[] };
    rows: TrafficRow[];
  };
  units = unitsFor(date, post, controls.settings.stories ?? true);
  rows = post.rows;
}

let tokenRefreshedAt: string | null = null;
try {
  tokenRefreshedAt = loadCredentials()?.refreshedAt ?? null;
} catch {
  // Unknown is shown as such.
}

const html = dashboardPage({ config, controls, status: readStatus(), published: readPublished(), units, rows, tokenRefreshedAt, now, builtAt: new Date().toISOString(), repo: process.env.GITHUB_REPOSITORY ?? null });
fs.mkdirSync(paths.output, { recursive: true });
fs.writeFileSync(path.join(paths.output, 'index.html'), html);
console.log(`Dashboard: ${path.relative(process.cwd(), path.join(paths.output, 'index.html'))}`);
