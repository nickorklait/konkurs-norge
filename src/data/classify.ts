// What kind of unit a registration is, and how we may show it.
// - business: a company (AS etc.) with real activity → shown by name ("Velkommen!")
// - holding: holding/investment company → counted only (often a person's name, and not news)
// - person: sole proprietorship (ENK) → counted only (the name is the owner's by law)
// - other: associations, branches of foreign companies (NUF), co-ownerships, bankruptcy estates and
//   shelf companies (made for resale) → counted only

import type { Enhet } from './brreg.ts';

export type Kind = 'business' | 'holding' | 'person' | 'other';

/** Company forms we name: limited companies and partnerships. */
const COMPANY = new Set(['AS', 'ASA', 'ANS', 'DA', 'SA']);
const PERSONAL = new Set(['ENK']);
const SHELF_TEXT = /hylleselskap|lagerselskap|opprettet for (?:videre)?salg/i;
const HOLDING_TEXT = /holding|investering|eie (?:og forvalte )?aksjer|forvaltning av (?:egen )?formue|kapitalforvaltning|aksjer og andeler/i;

export const activityText = (e: Enhet) => (e.aktivitet?.length ? e.aktivitet : (e.vedtektsfestetFormaal ?? [])).join(' ').replace(/\s+/g, ' ').trim();

export function classify(e: Enhet): Kind {
  const form = e.organisasjonsform.kode;
  if (PERSONAL.has(form)) return 'person';
  if (!COMPANY.has(form)) return 'other';
  if (SHELF_TEXT.test(activityText(e))) return 'other';
  const nace = e.naeringskode1?.kode ?? '';
  // 64.2 is "Holdingselskaper"; 00.000 "Uoppgitt" is usually a holding/investment company too, so look at the stated activity.
  if (nace.startsWith('64.2') || nace.startsWith('64.3')) return 'holding';
  if ((nace === '' || nace.startsWith('00')) && HOLDING_TEXT.test(activityText(e))) return 'holding';
  if (/\bHOLDING\b|\bINVEST\b/.test(e.navn)) return 'holding';
  return 'business';
}

/** Broad, readable industry groups from the NACE code (two first digits). */
const GROUPS: [RegExp, string][] = [
  [/^(01|02|03)/, 'Landbruk og natur'],
  [/^(10|11|12|13|14|15|16|17|18|19|2\d|30|31|32|33)/, 'Industri og produksjon'],
  [/^(35|36|37|38|39)/, 'Energi og miljø'],
  [/^(41|42|43)/, 'Bygg og anlegg'],
  [/^(45|46)/, 'Handel og engros'],
  [/^47/, 'Butikk og netthandel'],
  [/^(49|50|51|52|53)/, 'Transport'],
  [/^(55|56)/, 'Mat, servering og overnatting'],
  [/^(58|59|60|61|62|63)/, 'IT og media'],
  [/^(64|65|66)/, 'Finans og forsikring'],
  [/^68/, 'Eiendom'],
  [/^(69|70|71|72|73|74|75)/, 'Rådgivning og fagtjenester'],
  [/^(77|78|79|80|81|82)/, 'Forretningstjenester'],
  [/^85/, 'Undervisning'],
  [/^(86|87|88)/, 'Helse og omsorg'],
  [/^(90|91|92|93)/, 'Kultur, sport og fritid'],
  [/^(94|95|96)/, 'Personlige tjenester'],
];

export function industry(e: Enhet): string {
  const code = e.naeringskode1?.kode ?? '';
  return GROUPS.find(([re]) => re.test(code))?.[1] ?? 'Annet';
}

/** The company's own words about what it does, short enough for a card. */
export function shortActivity(e: Enhet, max = 110): string {
  let t = activityText(e) || e.naeringskode1?.beskrivelse || '';
  t = t.replace(/\s*,?\s*(?:samt )?(?:alt )?(?:annen|og annen) (?:virksomhet|aktivitet) som (?:naturlig )?(?:står i forbindelse|henger sammen) med (?:dette|det ovennevnte)\.?/i, '');
  t = t.replace(/\s*,?\s*(?:herunder|inkludert) (?:deltakelse|å delta) i andre selskaper[^.]*\.?/i, '');
  if (t.length > max) t = `${t.slice(0, max).replace(/[\s,;:]+\S*$/, '')} …`;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.replace(/\.$/, '');
}

/** "SANDVIKA" → "Sandvika", "NORDRE HOSLE" → "Nordre Hosle" */
export const placeName = (s: string | undefined) => (s ?? '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
