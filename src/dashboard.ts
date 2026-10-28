// The dashboard (output/index.html): is everything OK, the bankruptcies per county, the coming post with
// buttons, what has been published, settings and the activity log. Buttons post to /api/action
// (Cloudflare function → GitHub → the workflow).

import type { Config } from './config.ts';
import type { Controls } from './controls.ts';
import { MAX_CAPTION } from './controlsSchema.ts';
import { CSS, JS } from './dashboardAssets.ts';
import type { Unit } from './publish/plan.ts';
import type { PublishedEntry } from './publish/state.ts';
import type { Status } from './status.ts';

export interface TrafficRow {
  name: string;
  yesterday: number;
  normal: number;
  diff: number;
}

export interface DashboardInput {
  config: Config;
  controls: Controls;
  status: Status;
  published: Record<string, PublishedEntry>;
  units: Unit[];
  rows: TrafficRow[];
  tokenRefreshedAt: string | null;
  now: string;
  builtAt: string;
  repo: string | null;
}

export interface Problem {
  level: 'bad' | 'warn';
  text: string;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ago = (iso: string | undefined, nowMs: number) => {
  if (!iso) return 'aldri';
  const min = Math.round((nowMs - Date.parse(iso)) / 60000);
  if (min < 1) return 'nå nettopp';
  if (min < 60) return `${min} min siden`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} t siden` : `${Math.round(h / 24)} dager siden`;
};
export const tokenDaysLeft = (refreshedAt: string | null, nowMs: number) => (refreshedAt && Date.parse(refreshedAt) > 0 ? Math.floor((Date.parse(refreshedAt) + 60 * 864e5 - nowMs) / 864e5) : null);
const nb = (n: number) => n.toLocaleString('nb-NO');

/** Everything that needs attention, worst first. A late post is checked live in the browser. */
export function problems(d: DashboardInput): Problem[] {
  const out: Problem[] = [];
  const g = d.status.generate;
  if (d.controls.paused) out.push({ level: 'warn', text: 'Automatisk publisering er på pause. Trykk «Start igjen» når den skal gå som normalt.' });
  for (const e of g?.errors ?? []) out.push({ level: 'bad', text: `Dataene for ${g!.date} besto ikke kontrollen, så innlegget er ikke laget: ${e}` });
  for (const w of g?.warnings ?? []) out.push({ level: 'warn', text: `${g!.date}: ${w}` });
  for (const f of d.status.publish?.failed ?? []) out.push({ level: 'bad', text: `Publisering av ${f.key} feilet: ${f.error}` });
  const days = tokenDaysLeft(d.tokenRefreshedAt, Date.parse(d.builtAt));
  if (days !== null && days <= 0) out.push({ level: 'bad', text: 'Instagram-tilgangen er utløpt. Lag en ny nøkkel og oppdater GitHub-secret INSTAGRAM_ACCESS_TOKEN.' });
  else if (days !== null && days <= 14) out.push({ level: 'warn', text: `Instagram-tilgangen utløper om ${days} dager. Den fornyes vanligvis automatisk; sjekk siste kjøring.` });
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1));
}

function unitBlock(u: Unit, d: DashboardInput): string {
  const c = d.controls;
  const skipped = c.skip.includes(u.key);
  const edited = u.kind === 'feed' && c.captions[u.key];
  const caption = edited ? c.captions[u.key] : u.caption;
  const state = skipped ? '<span class="tag warn">Hoppes over</span>' : u.publishAt <= d.now ? '<span class="tag warn">Venter på neste kjøring</span>' : '';
  const data = esc(JSON.stringify({ key: u.key, caption: caption ?? '', original: u.caption ?? '', edited: !!edited }));
  const strip = u.images.map((img, i) => `<a href="${esc(`${u.date}/${img}`)}" target="_blank" rel="noopener"><img src="${esc(`${u.date}/${img}`)}" alt="Bilde ${i + 1}" loading="lazy"></a>`).join('');
  return `<div class="unit${skipped ? ' skipped' : ''}" data-unit="${data}">
<div class="t">Konkurs-Norge · ${esc(u.date)} · ${u.kind === 'feed' ? 'innlegg' : 'story'}</div>
<div class="m">kl. ${esc(u.publishAt.slice(11, 16))} · ${u.images.length} bilder ${state} ${edited ? '<span class="tag ok">Tekst endret</span>' : ''}</div>
<div class="strip">${strip}</div>
${caption ? `<div class="cap">${esc(caption)}</div>` : ''}
<div class="btns">
<button class="btn sm" onclick="act({type:'publish-now',key:'${esc(u.key)}'}, 'Publisere dette på Instagram nå?')">Publiser nå</button>
${skipped ? `<button class="btn sm ghost" onclick="act({type:'unskip',key:'${esc(u.key)}'})">Angre hopp over</button>` : `<button class="btn sm ghost" onclick="act({type:'skip',key:'${esc(u.key)}'}, 'Hoppe over dette innlegget?')">Hopp over</button>`}
${u.kind === 'feed' ? `<button class="btn sm ghost" onclick="editCaption(this)">Rediger tekst</button>` : ''}
</div></div>`;
}

export function dashboardPage(d: DashboardInput): string {
  const { config, controls: c, status: s } = d;
  const nowMs = Date.parse(d.builtAt);
  const list = problems(d);
  const actions = d.repo ? `https://github.com/${d.repo}/actions` : null;
  const health = list.length
    ? `<div class="health problems" id="health">${list.map((p) => `<div class="p ${p.level}"><span class="tag ${p.level}">${p.level === 'bad' ? 'Feil' : 'Obs'}</span><span>${esc(p.text)}</span></div>`).join('')}</div>`
    : `<div class="health ok" id="health"><div class="p">✓ Alt i orden</div></div>`;
  const feed = d.units.find((u) => u.kind === 'feed');
  const done = feed ? !!d.published[feed.key] : false;
  const days = tokenDaysLeft(d.tokenRefreshedAt, nowMs);
  const g = s.generate;
  const card = (k: string, v: string, cls: string, sub = '', extra = '') => `<div class="card"><div class="k">${k}</div><div class="v ${cls}">${v}</div>${sub ? `<div class="s">${sub}</div>` : ''}${extra}</div>`;
  const cards = `<div class="cards">
${card('Autopilot', c.paused ? 'På pause' : 'På', c.paused ? 'warn' : 'ok', 'man–lør kl. 08', `<button class="btn sm ${c.paused ? '' : 'ghost'}" style="margin-top:8px" onclick="act({type:'${c.paused ? 'resume' : 'pause'}'}, '${c.paused ? 'Starte automatisk publisering igjen?' : 'Sette automatisk publisering på pause?'}')">${c.paused ? 'Start igjen' : 'Pause'}</button>`)}
${card('I dag', feed ? (done ? 'Publisert' : 'Klar') : 'Ikke laget', feed ? 'ok' : 'warn', g ? esc(g.date) : '')}
${card('Konkurser', g ? nb(g.total) : '–', '', g ? `${g.diff > 0 ? '+' : ''}${g.diff} mot normalen` : '')}
${card('Instagram-tilgang', days === null ? 'Ukjent' : days > 0 ? `${days} dager` : 'Utløpt', days === null ? 'warn' : days > 14 ? 'ok' : days > 0 ? 'warn' : 'bad', 'fornyes automatisk')}
</div>`;
  const table = d.rows.length
    ? `<div class="tablewrap"><table><thead><tr><th>Fylke</th><th class="num">Konkurser</th></tr></thead><tbody>${d.rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${nb(r.yesterday)}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="hint">Ikke laget ennå i dag.</p>';
  const upcoming = d.units.filter((u) => !d.published[u.key] && d.now < u.expiresAt);
  const pub = Object.entries(d.published).sort((a, b) => b[1].publishedAt.localeCompare(a[1].publishedAt)).slice(0, 12);
  const pubList = pub.length
    ? `<div class="list">${pub.map(([k, e]) => `<div><span>${esc(k.replace(/-(feed|story|reel)$/, ''))} <span class="muted">${e.kind === 'story' ? 'story' : e.kind === 'reel' ? 'reel' : 'innlegg'}</span></span><span class="when">${e.permalink ? `<a href="${esc(e.permalink)}" target="_blank" rel="noopener">Åpne ↗</a> · ` : ''}${esc(ago(e.publishedAt, nowMs))}</span></div>`).join('')}</div>`
    : '<p class="hint">Ingenting publisert ennå.</p>';
  const log = c.log.length
    ? `<div class="list">${c.log.slice(0, 15).map((l) => `<div><span>${esc(l.action)} <span class="muted">– ${esc(l.by)}</span></span><span class="when">${esc(ago(l.at, nowMs))}</span></div>`).join('')}</div>`
    : '<p class="hint">Ingen endringer ennå.</p>';
  const help = `
<details class="help"><summary>Innlegget er ikke publisert</summary><p>Systemet prøver flere ganger fra kl. 08 (innlegget publiseres til kl. 14). Trykk «Publiser nå», eller se feilmeldingen i ${actions ? `<a href="${esc(actions)}" target="_blank" rel="noopener">GitHub-kjøringene</a>` : 'GitHub-kjøringene'}.</p></details>
<details class="help"><summary>Noen spør om navn</summary><p>Kontoen navngir aldri konkursbedrifter – heller ikke i kommentarer. Henvis til Brønnøysundregistrene om noen vil slå opp en bestemt bedrift.</p></details>
<details class="help"><summary>Søndag</summary><p>Det åpnes nesten ingen konkurser i helgen. Mandagens innlegg tar fredag og helgen; lørdag kommer uka. Søndag kommer ingenting.</p></details>
<details class="help"><summary>Instagram-tilgangen er utløpt</summary><p>Lag en ny nøkkel i Meta-appen og legg den inn som GitHub-secret <code>INSTAGRAM_ACCESS_TOKEN</code>.</p></details>`;
  const expected = feed ? [{ key: feed.key, label: 'Konkurs-Norge', publishAt: feed.publishAt, expiresAt: feed.expiresAt, done, skipped: c.skip.includes(feed.key) }] : [];
  const live = { expected, paused: c.paused, builtAt: d.builtAt, lateWarn: 60, lateBad: 120, staleHours: 26 };

  return `<!doctype html>
<html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(config.brand.name)} – dashboard</title><meta name="theme-color" content="#1a1416"><style>${CSS}</style></head>
<body><div class="banner" id="banner"></div>
<header class="top"><div class="brand"><div class="mark"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 L19 9 L16 12 L10 6 Z M11.5 9.5 L4 17 L6 19 L13.5 11.5 Z M13 19 H21 V21 H13 Z" fill="#1a1416"/></svg></div><div><h1>${esc(config.brand.name)} · Dashboard</h1><small>${esc(config.brand.tagline)}</small></div></div>
<div class="toolbar">${actions ? `<a class="btn light" href="${esc(actions)}" target="_blank" rel="noopener">GitHub-kjøringer</a>` : ''}</div></header>
<main>
${health}
${cards}
<h2>Per fylke</h2>${table}
<h2>Neste innlegg</h2>${upcoming.length ? upcoming.map((u) => unitBlock(u, d)).join('') : '<p class="hint">Ingenting venter. Innlegget lages og publiseres kl. 08 mandag til lørdag.</p>'}
<h2>Publisert</h2>${pubList}
<h2>Innstillinger</h2><form class="settings" onsubmit="saveSettings(event)">
<label><input type="checkbox" name="stories" ${(c.settings.stories ?? true) ? 'checked' : ''}> Publiser også stories</label>
<button class="btn" style="margin-top:10px">Lagre innstillinger</button></form>
<h2>Aktivitetslogg</h2>${log}
<h2>Hvis noe skjer</h2>${help}
<h2>Kilder</h2><div class="list">
<div><a href="https://data.brreg.no/enhetsregisteret/oppslag/enheter" target="_blank" rel="noopener">Enhetsregisteret (Brønnøysundregistrene)</a><span class="when">konkurser og nyregistreringer, NLOD</span></div>
<div><a href="https://www.ssb.no/statbank/table/07459" target="_blank" rel="noopener">SSB, tabell 07459</a><span class="when">folketall per fylke</span></div>
${actions ? `<div><a href="${esc(actions)}" target="_blank" rel="noopener">GitHub Actions</a><span class="when">kjøringer og feillogg</span></div>` : ''}
</div>
<p class="hint">Sist oppdatert ${esc(new Date(d.builtAt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', dateStyle: 'short', timeStyle: 'short' }))}. Endringer du gjør her lagres i loggen med e-postadressen din.</p>
</main>
<dialog id="capDialog"><div class="in"><h3 style="margin:0 0 8px">Rediger tekst</h3>
<textarea id="capText" maxlength="${MAX_CAPTION}" oninput="document.getElementById('capCount').textContent=this.value.length"></textarea>
<div class="hint" style="margin:4px 0"><span id="capCount">0</span>/${MAX_CAPTION} tegn.</div>
<div class="hint" style="margin:8px 0 0">Automatisk tekst:</div><div class="cap" id="capOrig"></div>
<div class="btns"><button class="btn" onclick="saveCaption()">Lagre</button><button class="btn ghost" id="capReset" onclick="resetCaption()">Bruk automatisk tekst</button><button class="btn ghost" onclick="capDialog.close()">Avbryt</button></div>
</div></dialog>
<script>const LIVE = ${JSON.stringify(live).replace(/</g, '\\u003c')};${JS}</script>
</body></html>`;
}
