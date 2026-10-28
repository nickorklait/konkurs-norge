// npm run generate [-- --date 2026-10-28] [--refresh]
// Today's post: Monday–Friday the bankruptcies of the previous working day (Monday: Friday and the weekend),
// Saturday the week. Reads the register (saved in data/konkurs/<date>.json without names; --refresh reads
// again), checks it, and renders the images (feed + story) and the caption to output/<date>/. Sunday: nothing.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { ReactNode } from 'react';
import { caption, factCheck } from '../caption.ts';
import { loadConfig, paths } from '../config.ts';
import { DAYS, osloToday, weekday } from '../dates.ts';
import { loadDay, loadPopulation } from '../data/brreg.ts';
import { renderPng, SIZES, type Format } from '../render/render.ts';
import { Balance, Cover, PerCapita, Where } from '../render/slides.tsx';
import { updateStatus } from '../status.ts';
import { sinceFor, spanFor, summarize, type Summary } from '../summary.ts';

const { values: args } = parseArgs({ options: { date: { type: 'string' }, refresh: { type: 'boolean', default: false } } });
const config = loadConfig();
const date = args.date ?? osloToday();
const plan = spanFor(date);
if (!plan) {
  console.log(`${date} is a Sunday: no post.`);
  process.exit(0);
}

const population = plan.kind === 'week' ? await loadPopulation(config) : null;
const build = async (refresh: boolean) => {
  const day = await loadDay(date, sinceFor(date), plan.kind === 'week' ? plan.span : null, config, { refresh });
  return summarize(day, config, population, day.setSize);
};
let s = await build(args.refresh);
// A saved day from an early run may be incomplete: read the register once more.
if (s.validation.errors.length && !args.refresh) s = await build(true);
const v = s.validation;
updateStatus('generate', { date, total: s.count, diff: s.vsNormal, passed: v.passed.length, errors: v.errors, warnings: v.warnings });
console.log(`${date} (${s.kind}, ${s.span.from}–${s.span.to}): ${s.count} bankruptcies, normal ${s.normal}; ${v.passed.length} checks passed`);
for (const w of v.warnings) console.warn(`  ! ${w}`);
if (v.errors.length) throw new Error(`Data failed the checks: ${v.errors.join('; ')}`);

const text = caption(s, config, DAYS[weekday(s.span.to)]);
const problems = factCheck(text, s);
if (problems.length) throw new Error(`Caption failed the fact-check: ${problems.join('; ')}`);

const outDir = path.join(paths.output, date);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const images = { feed: [] as string[], story: [] as string[] };
type Slide = (p: { s: Summary; config: typeof config; format: Format }) => ReactNode;
const slides: [string, Slide][] = s.kind === 'week' ? [['uka', Cover], ['per-innbygger', PerCapita], ['konkurs-mot-nye', Balance]] : [['konkurser', Cover], ['hvor-og-hva', Where]];
for (const [i, [name, Slide]] of slides.entries()) {
  for (const format of ['feed', 'story'] as const) {
    const file = `konkurs_${date}_${i + 1}_${name}${format === 'story' ? '_story' : ''}.png`;
    fs.writeFileSync(path.join(outDir, file), await renderPng(<Slide s={s} config={config} format={format} />, SIZES[format]));
    images[format].push(file);
  }
}
// Rows for the dashboard: the counties with bankruptcies.
const rows = s.byFylke.map((f) => ({ name: f.name, yesterday: f.n, normal: 0, diff: 0 }));
fs.writeFileSync(path.join(outDir, 'post.json'), JSON.stringify({ date, kind: s.kind, images, caption: text, count: s.count, normal: s.normal, rows, validation: v }, null, 2));
fs.writeFileSync(path.join(outDir, 'caption.txt'), text);
console.log(`  ✓ ${images.feed.join(', ')}\n\n${text}\n\n(${text.length} characters)`);
