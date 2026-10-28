import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caption, factCheck } from '../src/caption.ts';
import { loadConfig } from '../src/config.ts';
import { toBankruptcy, toRegistrations, type Bankruptcy, type Day, type Enhet } from '../src/data/brreg.ts';
import { sinceFor, spanFor, summarize } from '../src/summary.ts';

const config = loadConfig();
let n = 0;
const unit = (o: Record<string, unknown> = {}): Enhet =>
  ({
    organisasjonsnummer: String(950000000 + ++n),
    navn: `HEMMELIG FIRMA ${n} AS`,
    organisasjonsform: { kode: 'AS', beskrivelse: 'Aksjeselskap' },
    naeringskode1: { kode: '43.210', beskrivelse: 'Elektrisk installasjonsarbeid' },
    forretningsadresse: { kommunenummer: '0301' },
    stiftelsesdato: '2020-10-27',
    antallAnsatte: 3,
    konkurs: true,
    konkursdato: '2026-10-27',
    ...o,
  }) as unknown as Enhet;
const b = (date: string, fylke = '03', industry = 'Bygg og anlegg'): Bankruptcy => ({ date, fylke, industry, form: 'AS', employees: 2, founded: '2021-01-01' });

test('what we save has no name and no organisation number', () => {
  const e = unit();
  const saved = JSON.stringify(toBankruptcy(e));
  assert.ok(!saved.includes('HEMMELIG') && !saved.includes(e.organisasjonsnummer));
  assert.deepEqual(toBankruptcy(e), { date: '2026-10-27', fylke: '03', industry: 'Bygg og anlegg', form: 'AS', employees: 3, founded: '2020-10-27' });
  const r = toRegistrations([unit({ konkurs: false }), unit({ slettedato: '2026-10-28' })], '2026-10-19', '2026-10-23');
  assert.equal(r.total, 1);
  assert.ok(!JSON.stringify(r).includes('HEMMELIG'));
});

test('which days a post covers: the previous working day, Monday Friday and the weekend, Saturday the week, Sunday nothing', () => {
  assert.deepEqual(spanFor('2026-10-28'), { kind: 'day', span: { from: '2026-10-27', to: '2026-10-27' } });
  assert.deepEqual(spanFor('2026-10-26'), { kind: 'day', span: { from: '2026-10-23', to: '2026-10-25' } });
  assert.deepEqual(spanFor('2026-10-24'), { kind: 'week', span: { from: '2026-10-19', to: '2026-10-23' } });
  assert.equal(spanFor('2026-10-25'), null);
  assert.ok(sinceFor('2026-10-28') <= '2026-10-01');
});

const day = (bankruptcies: Bankruptcy[], date = '2026-10-28', o: Partial<Day> = {}): Day => ({ fetchedAt: '', date, bankruptcies, since: sinceFor(date), setSize: 3000, registrations: null, ...o });

test('a weekday: against the normal for that weekday, by county and industry, and the caption passes the fact-check', () => {
  const tuesdays = ['2026-10-20', '2026-10-13', '2026-10-06', '2026-09-29'];
  const s = summarize(day([b('2026-10-27'), b('2026-10-27', '46', 'Transport'), b('2026-10-27', '03'), ...tuesdays.flatMap((d) => [b(d)])]), config);
  assert.deepEqual([s.count, s.normal, s.vsNormal], [3, 1, 2]);
  assert.deepEqual(s.byFylke, [{ name: 'Oslo', n: 2 }, { name: 'Vestland', n: 1 }]);
  assert.equal(s.monthToDate, 6);
  const text = caption(s, config, 'tirsdag');
  assert.match(text, /3 bedrifter ble slått konkurs – 2 flere enn en vanlig tirsdag \(snitt 1,0\)\./);
  assert.match(text, /Flest i Oslo \(2\) og Vestland \(1\)/);
  assert.deepEqual(factCheck(text, s), []);
  assert.deepEqual(factCheck(`${text}\n999 konkurser`, s), ['number "999" is not in the data']);
});

test('a broken register answer stops the post', () => {
  assert.match(summarize(day([], '2026-10-28', { setSize: 12 }), config, null, 12).validation.errors[0], /bare 12/);
});

test('Saturday: per 100,000 per county and new businesses against bankruptcies per industry', () => {
  const week = [b('2026-10-19'), b('2026-10-20'), b('2026-10-21', '56'), b('2026-10-22', '46', 'Transport')];
  const registrations = { from: '2026-10-19', to: '2026-10-23', total: 1680, businessesByIndustry: { 'Bygg og anlegg': 39, Transport: 4 }, byFylke: {} };
  const population = { year: '2026', byFylke: Object.fromEntries(config.fylker.map((f) => [f.nummer, f.nummer === '56' ? 50000 : 500000])) };
  const s = summarize(day([...week, b('2026-10-14'), b('2026-10-07')], '2026-10-24', { registrations }), config, population);
  assert.equal(s.kind, 'week');
  assert.deepEqual(s.rates?.slice(0, 2).map((r) => [r.name, r.n, r.per100k]), [['Finnmark', 1, 2], ['Oslo', 2, 0.4]]);
  assert.deepEqual(s.balance, [{ name: 'Bygg og anlegg', bankrupt: 3, started: 39 }, { name: 'Transport', bankrupt: 1, started: 4 }]);
  const text = caption(s, config, 'fredag');
  assert.match(text, /Bygg og anlegg: 3 konkurser, 39 nye/);
  assert.match(text, /1\s680 nye registreringer i hele Norge/);
  assert.match(text, /Transport: 1 konkurs, 4 nye/);
  assert.deepEqual(factCheck(text, s), []);
});
