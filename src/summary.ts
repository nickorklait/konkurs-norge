// Everything a post says, computed once from the saved day. Images and caption only use this, and the
// fact-check checks the caption against it. Counts only: no bankrupt company is ever named.
//
// Weekday posts (Monday–Friday) are about the previous working day; Monday's covers Friday and the weekend.
// "Normal" is the same span 1–4 weeks earlier (spans touching a public holiday skipped). Saturday's post is
// the working week, per county per 100,000 inhabitants, and new businesses against bankruptcies per industry.

import type { Config } from './config.ts';
import { addDays, holidayName, isoWeek, weekday } from './dates.ts';
import type { Bankruptcy, Day, Registrations } from './data/brreg.ts';

export const NORMAL_WEEKS = 4;
/** The register always has thousands of units under bankruptcy; fewer means a broken answer. */
const MIN_SET = 500;
const YEAR_MS = 365.25 * 864e5;

export type Kind = 'day' | 'week';

export interface Span {
  from: string;
  to: string;
}

export interface Count {
  name: string;
  n: number;
}

export interface FylkeRate extends Count {
  nummer: string;
  population: number;
  /** Per 100,000 inhabitants, one decimal. */
  per100k: number;
}

export interface IndustryBalance {
  name: string;
  bankrupt: number;
  started: number;
}

export interface Summary {
  kind: Kind;
  date: string;
  span: Span;
  count: number;
  /** Average for the same span in the weeks before, one decimal. */
  normal: number;
  /** Count minus normal, rounded. */
  vsNormal: number;
  byFylke: Count[];
  byIndustry: Count[];
  employees: number;
  /** Years, one decimal; null without founding dates. */
  medianAge: number | null;
  under2: number;
  /** Share of limited companies (AS/ASA), whole per cent. */
  asShare: number;
  /** Bankruptcies so far this month (up to the span's end). */
  monthToDate: number;
  /** Saturday: per county per 100,000, highest first. */
  rates: FylkeRate[] | null;
  populationYear: string | null;
  /** Saturday: industries with the most bankruptcies, against new businesses the same week. */
  balance: IndustryBalance[] | null;
  registered: number | null;
  /** Bankruptcies per working day (weekday posts, last 20) or per working week (Saturday, last 5), oldest first; the last is this one. */
  trend: { label: string; n: number }[];
  validation: { passed: string[]; warnings: string[]; errors: string[] };
}

/** The span a post is about: the previous working day (Monday: Friday–Sunday), or Saturday's working week. */
export function spanFor(date: string): { kind: Kind; span: Span } | null {
  const wd = weekday(date);
  if (wd === 0) return null;
  if (wd === 6) return { kind: 'week', span: { from: addDays(date, -5), to: addDays(date, -1) } };
  if (wd === 1) return { kind: 'day', span: { from: addDays(date, -3), to: addDays(date, -1) } };
  return { kind: 'day', span: { from: addDays(date, -1), to: addDays(date, -1) } };
}

const inSpan = (b: Bankruptcy, s: Span) => b.date >= s.from && b.date <= s.to;
const shift = (s: Span, weeks: number): Span => ({ from: addDays(s.from, -7 * weeks), to: addDays(s.to, -7 * weeks) });
const touchesHoliday = (s: Span) => {
  for (let d = s.from; d <= s.to; d = addDays(d, 1)) if (holidayName(d)) return true;
  return false;
};
const tally = (xs: string[]): Count[] =>
  Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {}))
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'nb'));

/** The earliest date the saved day must reach back to (normal weeks and the month so far). */
export function sinceFor(date: string): string {
  const back = addDays(date, -7 * (NORMAL_WEEKS + 1) - 3);
  const monthStart = `${addDays(date, -1).slice(0, 7)}-01`;
  return back < monthStart ? back : monthStart;
}

export function summarize(day: Day, config: Config, population: { year: string; byFylke: Record<string, number> } | null = null, setSize = Infinity): Summary {
  const plan = spanFor(day.date);
  if (!plan) throw new Error(`${day.date} is a Sunday: no post.`);
  const { kind, span } = plan;
  const passed: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  if (setSize < MIN_SET) errors.push(`registeret ga bare ${setSize} enheter under konkurs (ventet tusenvis)`);
  else if (setSize !== Infinity) passed.push(`${setSize} enheter under konkurs i registeret`);

  const these = day.bankruptcies.filter((b) => inSpan(b, span));
  const normalSpans = Array.from({ length: NORMAL_WEEKS + 3 }, (_, i) => shift(span, i + 1)).filter((s) => !touchesHoliday(s) && s.from >= day.since).slice(0, NORMAL_WEEKS);
  const normal = normalSpans.length ? Math.round((normalSpans.reduce((sum, s) => sum + day.bankruptcies.filter((b) => inSpan(b, s)).length, 0) / normalSpans.length) * 10) / 10 : 0;
  if (normalSpans.length >= 2) passed.push(`normalen fra ${normalSpans.length} uker`);
  else errors.push(`for få uker til normalen (${normalSpans.length})`);
  if (these.length > (kind === 'week' ? 500 : 150)) errors.push(`urimelig mange konkurser (${these.length})`);

  const fylkeName = (nr: string) => config.fylker.find((f) => f.nummer === nr)?.navn ?? (nr === '21' ? 'Svalbard' : 'Ukjent');
  const ages = these
    .filter((b) => b.founded)
    .map((b) => (Date.parse(b.date) - Date.parse(b.founded!)) / YEAR_MS)
    .filter((x) => x >= 0)
    .sort((a, b) => a - b);
  const median = ages.length ? Math.round((ages.length % 2 ? ages[ages.length >> 1] : (ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2) * 10) / 10 : null;
  const monthStart = `${span.to.slice(0, 7)}-01`;

  let rates: FylkeRate[] | null = null;
  let balance: IndustryBalance[] | null = null;
  const reg: Registrations | null = kind === 'week' ? day.registrations : null;
  if (kind === 'week') {
    if (!population) errors.push('mangler folketall fra SSB');
    else
      rates = config.fylker
        .map((f) => {
          const n = these.filter((b) => b.fylke === f.nummer).length;
          const pop = population.byFylke[f.nummer];
          return { nummer: f.nummer, name: f.navn, n, population: pop, per100k: Math.round((n / pop) * 1e6) / 10 };
        })
        .sort((a, b) => b.n / b.population - a.n / a.population || a.name.localeCompare(b.name, 'nb'));
    if (!reg) errors.push('mangler nyregistreringene for uka');
    else
      balance = tally(these.map((b) => b.industry))
        .filter((x) => x.name !== 'Annet')
        .slice(0, 5)
        .map((x) => ({ name: x.name, bankrupt: x.n, started: reg.businessesByIndustry[x.name] ?? 0 }));
  }

  const count = (s: Span) => day.bankruptcies.filter((b) => inSpan(b, s)).length;
  const trend: Summary['trend'] = [];
  if (kind === 'week') {
    for (let w = 4; w >= 0; w--) {
      const s = shift(span, w);
      if (s.from >= day.since) trend.push({ label: `u${isoWeek(s.from).week}`, n: count(s) });
    }
  } else {
    for (let d = span.to; trend.length < 20 && d >= day.since; d = addDays(d, -1)) {
      const wd = weekday(d);
      if (wd === 0 || wd === 6) continue;
      // Monday's post: Friday's bar includes the weekend, like the number above it.
      trend.unshift({ label: d, n: d === span.from ? count(span) : count({ from: d, to: d }) });
    }
  }

  return {
    kind,
    date: day.date,
    span,
    count: these.length,
    normal,
    vsNormal: Math.round(these.length - normal),
    byFylke: tally(these.map((b) => fylkeName(b.fylke))),
    byIndustry: tally(these.map((b) => b.industry)).filter((x) => x.name !== 'Annet'),
    employees: these.reduce((sum, b) => sum + b.employees, 0),
    medianAge: median,
    under2: ages.filter((a) => a < 2).length,
    asShare: these.length ? Math.round((these.filter((b) => b.form === 'AS' || b.form === 'ASA').length / these.length) * 100) : 0,
    monthToDate: day.bankruptcies.filter((b) => b.date >= monthStart && b.date <= span.to).length,
    rates,
    populationYear: population?.year ?? null,
    balance,
    registered: reg?.total ?? null,
    trend,
    validation: { passed, warnings, errors },
  };
}
