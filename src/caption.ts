// The captions: weekday mornings (the previous working day) and Saturday (the week). Numbers only, never a
// name. Every number is checked against the summary (factCheck).

import type { Config } from './config.ts';
import { dayText, isoWeek } from './dates.ts';
import type { Summary } from './summary.ts';

export const fmt = (n: number) => n.toLocaleString('nb-NO');
/** "15,2" */
export const dec = (x: number) => x.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "Oslo (5), Akershus (3) og Vestland (2)" */
export const listOf = (xs: { name: string; n: number }[], max = 3, low = false) => {
  const parts = xs.slice(0, max).map((x) => `${low ? lower(x.name) : x.name} (${x.n})`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} og ${parts.at(-1)}` : (parts[0] ?? '');
};

/** "tirsdag 27. oktober", or "fredag 23. oktober og helgen" for Monday's post. */
export const spanText = (s: Summary) => (s.span.from === s.span.to ? dayText(s.span.to) : `${dayText(s.span.from)} og helgen`);
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
export const weekRange = (s: Summary) => `${Number(s.span.from.slice(8, 10))}.–${Number(s.span.to.slice(8, 10))}. ${MONTHS[Number(s.span.to.slice(5, 7)) - 1]}`;

export function versus(s: Summary, what: string): string {
  const d = s.vsNormal;
  if (d === 0) return `like mange som en vanlig ${what} (snitt ${dec(s.normal)})`;
  return `${Math.abs(d)} ${d > 0 ? 'flere' : 'færre'} enn en vanlig ${what} (snitt ${dec(s.normal)})`;
}

function dayCaption(s: Summary, weekdayName: string): string[] {
  const one = s.count === 1;
  return [
    s.span.from === s.span.to ? `⚖️ Konkurser i går, ${spanText(s)}` : `⚖️ Konkurser fredag og helgen (${weekRange(s)})`,
    s.count === 0 ? 'Ingen bedrifter ble slått konkurs.' : `${s.count} ${one ? 'bedrift ble slått konkurs' : 'bedrifter ble slått konkurs'} – ${versus(s, s.span.from === s.span.to ? weekdayName : 'fredag og helg')}.`,
    '',
    s.count && s.employees ? `👥 ${fmt(s.employees)} ansatte i konkursbedriftene.` : '',
    s.medianAge !== null && s.count >= 3 ? `⏳ Typisk alder: ${dec(s.medianAge)} år${s.under2 ? `, ${s.under2} var under 2 år` : ''}.` : '',
    s.byFylke.length ? `📍 Flest i ${listOf(s.byFylke)}` : '',
    s.byIndustry.length ? `🏭 Bransjene: ${listOf(s.byIndustry, 3, true)}` : '',
    `📅 Hittil i ${MONTHS[Number(s.span.to.slice(5, 7)) - 1]}: ${fmt(s.monthToDate)} konkurser.`,
  ];
}

function weekCaption(s: Summary): string[] {
  const top = (s.rates ?? []).filter((r) => r.n > 0).slice(0, 3);
  return [
    `⚖️ Uka i konkurser, uke ${isoWeek(s.span.from).week} (${weekRange(s)})`,
    `${s.count} bedrifter ble slått konkurs – ${versus(s, 'uke')}.`,
    '',
    s.employees ? `👥 ${fmt(s.employees)} ansatte i konkursbedriftene. ${s.asShare} % var aksjeselskaper.` : '',
    top.length ? `📍 Flest per innbygger: ${top.map((r) => `${r.name} (${dec(r.per100k)} per 100 000)`).join(', ')}` : '',
    ...(s.balance?.length ? ['', '🏭 Konkurser mot nye bedrifter samme uke:', ...s.balance.map((b) => `• ${b.name}: ${b.bankrupt} ${b.bankrupt === 1 ? 'konkurs' : 'konkurser'}, ${b.started} nye`)] : []),
    s.registered !== null ? `🆕 ${fmt(s.registered)} nye registreringer i hele Norge samme uke.` : '',
    `📅 Hittil i ${MONTHS[Number(s.span.to.slice(5, 7)) - 1]}: ${fmt(s.monthToDate)} konkurser.`,
  ];
}

export function caption(s: Summary, config: Config, weekdayName: string): string {
  const lines = [
    ...(s.kind === 'day' ? dayCaption(s, weekdayName) : weekCaption(s)),
    '',
    'Ingen navn – bare tallene. Følg for konkursene i Norge hver morgen 👇',
    s.kind === 'week' ? config.source.short : 'Kilde: Brønnøysundregistrene',
    config.brand.hashtags.join(' '),
  ];
  return lines.filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
}

/** Numbers in the caption that are not in the summary. "1 250" is one number; decimals part by part. */
export function factCheck(text: string, s: Summary): string[] {
  const parts = (x: number) => dec(x).split(',').map(Number);
  const allowed = new Set<number>([
    Number(s.span.from.slice(8, 10)), Number(s.span.to.slice(8, 10)), isoWeek(s.span.from).week,
    s.count, Math.abs(s.vsNormal), ...parts(s.normal), s.employees, s.under2, s.asShare, s.monthToDate,
    ...(s.medianAge !== null ? parts(s.medianAge) : []),
    ...s.byFylke.map((x) => x.n), ...s.byIndustry.map((x) => x.n),
    ...(s.rates ?? []).flatMap((r) => [r.n, ...parts(r.per100k)]),
    ...(s.balance ?? []).flatMap((b) => [b.bankrupt, b.started]),
    ...(s.registered !== null ? [s.registered] : []),
    // Fixed words: "under 2 år", "per 100 000".
    2, 100000,
  ]);
  const body = text.replace(/#[\p{L}\p{N}_]+/gu, ' ');
  return [...body.matchAll(/\d{1,3}(?:[   ]\d{3})+|\d+/g)]
    .map((m) => Number(m[0].replace(/[   ]/g, '')))
    .filter((x) => !allowed.has(x))
    .map((x) => `number "${x}" is not in the data`);
}
