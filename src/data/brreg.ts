// The open Enhetsregisteret API (data.brreg.no, NLOD). Every unit under bankruptcy carries konkurs=true until
// the estate is wound up and the unit deleted, so the whole set (a few thousand) is read once a day and the
// recent bankruptcies taken from it. New registrations come from the date-range search.
//
// Privacy: bankrupt companies are never named. What we save (data/konkurs/<date>.json) has no names and no
// organisation numbers, only the fields the counts use, so the repo cannot be used to look them up either.

import fs from 'node:fs';
import path from 'node:path';
import { paths, type Config } from '../config.ts';
import { classify, industry } from './classify.ts';

const API = 'https://data.brreg.no/enhetsregisteret/api';
const PAGE = 200;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The fields we read from a unit in the register. */
export interface Enhet {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform: { kode: string; beskrivelse: string };
  registreringsdatoEnhetsregisteret?: string;
  stiftelsesdato?: string;
  naeringskode1?: { kode: string; beskrivelse: string };
  aktivitet?: string[];
  vedtektsfestetFormaal?: string[];
  forretningsadresse?: { kommunenummer?: string; poststed?: string; postnummer?: string };
  postadresse?: { kommunenummer?: string };
  antallAnsatte?: number;
  konkurs?: boolean;
  konkursdato?: string;
  slettedato?: string;
}

/** A bankruptcy as we keep it: no name, no number. */
export interface Bankruptcy {
  date: string;
  /** Two-digit county ("03"), from the business address (else the postal address); "" if none. */
  fylke: string;
  industry: string;
  form: string;
  employees: number;
  /** Founding date (or registration date). */
  founded: string | null;
}

/** New registrations as counts only. */
export interface Registrations {
  from: string;
  to: string;
  total: number;
  /** New businesses in operation (companies, not holding) per industry. */
  businessesByIndustry: Record<string, number>;
  byFylke: Record<string, number>;
}

export async function search(query: string, config: Config, fetchFn: typeof fetch = fetch): Promise<Enhet[]> {
  const out: Enhet[] = [];
  for (let page = 0; ; page++) {
    const res = await fetchFn(`${API}/enheter?${query}&size=${PAGE}&page=${page}`, { headers: { 'User-Agent': config.source.userAgent, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Enhetsregisteret answered ${res.status} for ${query}`);
    const body = (await res.json()) as { _embedded?: { enheter: Enhet[] }; page: { totalPages: number } };
    out.push(...(body._embedded?.enheter ?? []));
    if (page + 1 >= body.page.totalPages) return out;
    await pause(150);
  }
}

const fylkeOf = (e: Enhet) => (e.forretningsadresse?.kommunenummer ?? e.postadresse?.kommunenummer ?? '').slice(0, 2);

export const toBankruptcy = (e: Enhet): Bankruptcy => ({
  date: e.konkursdato!,
  fylke: fylkeOf(e),
  industry: industry(e),
  form: e.organisasjonsform.kode,
  employees: e.antallAnsatte ?? 0,
  founded: e.stiftelsesdato ?? e.registreringsdatoEnhetsregisteret ?? null,
});

export function toRegistrations(units: Enhet[], from: string, to: string): Registrations {
  const live = units.filter((e) => !e.slettedato);
  const businessesByIndustry: Record<string, number> = {};
  const byFylke: Record<string, number> = {};
  for (const e of live) {
    const f = fylkeOf(e);
    byFylke[f] = (byFylke[f] ?? 0) + 1;
    if (classify(e) === 'business') businessesByIndustry[industry(e)] = (businessesByIndustry[industry(e)] ?? 0) + 1;
  }
  return { from, to, total: live.length, businessesByIndustry, byFylke };
}

export interface Day {
  fetchedAt: string;
  date: string;
  /** Bankruptcies opened from `since` (the last ~5 weeks), newest first. */
  bankruptcies: Bankruptcy[];
  since: string;
  /** Units under bankruptcy in the register when read (a sanity check). */
  setSize: number;
  /** Saturday only: the week's new registrations. */
  registrations: Registrations | null;
}

const file = (date: string) => path.join(paths.data, 'konkurs', `${date}.json`);

export function readDay(date: string): Day | null {
  return fs.existsSync(file(date)) ? (JSON.parse(fs.readFileSync(file(date), 'utf8')) as Day) : null;
}

/** Everything the post for `date` needs; saved, and reused unless `refresh`. */
export async function loadDay(date: string, since: string, week: { from: string; to: string } | null, config: Config, { refresh = false, fetchFn = fetch }: { refresh?: boolean; fetchFn?: typeof fetch } = {}): Promise<Day> {
  const saved = readDay(date);
  if (saved && !refresh) return saved;
  const all = await search('konkurs=true', config, fetchFn);
  const bankruptcies = all
    .filter((e) => e.konkursdato && e.konkursdato >= since && e.konkursdato < date)
    .map(toBankruptcy)
    .sort((a, b) => b.date.localeCompare(a.date));
  const registrations = week ? toRegistrations(await search(`fraRegistreringsdatoEnhetsregisteret=${week.from}&tilRegistreringsdatoEnhetsregisteret=${week.to}`, config, fetchFn), week.from, week.to) : null;
  const day: Day = { fetchedAt: new Date().toISOString(), date, bankruptcies, since, setSize: all.length, registrations };
  fs.mkdirSync(path.dirname(file(date)), { recursive: true });
  fs.writeFileSync(file(date), JSON.stringify(day));
  return day;
}

/** County population on 1 January (SSB table 07459), cached per year in data/. */
export async function loadPopulation(config: Config, fetchFn: typeof fetch = fetch): Promise<{ year: string; byFylke: Record<string, number> }> {
  const f = path.join(paths.data, 'population.json');
  const cached = fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as { year: string; byFylke: Record<string, number>; fetchedAt: string }) : null;
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 30 * 864e5) return cached;
  const res = await fetchFn('https://data.ssb.no/api/v0/no/table/07459/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': config.source.userAgent },
    body: JSON.stringify({
      query: [
        { code: 'Region', selection: { filter: 'item', values: config.fylker.map((x) => x.nummer) } },
        { code: 'Tid', selection: { filter: 'top', values: ['1'] } },
        { code: 'ContentsCode', selection: { filter: 'item', values: ['Personer1'] } },
      ],
      response: { format: 'json-stat2' },
    }),
  });
  if (!res.ok) {
    if (cached) return cached;
    throw new Error(`SSB answered ${res.status}`);
  }
  const j = (await res.json()) as { value: number[]; dimension: { Region: { category: { index: Record<string, number> } }; Tid: { category: { index: Record<string, number> } } } };
  const byFylke: Record<string, number> = {};
  for (const [k, i] of Object.entries(j.dimension.Region.category.index)) byFylke[k] = j.value[i];
  const data = { fetchedAt: new Date().toISOString(), year: Object.keys(j.dimension.Tid.category.index)[0], byFylke };
  fs.mkdirSync(paths.data, { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2));
  return data;
}
