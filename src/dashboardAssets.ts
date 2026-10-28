// Styles and browser script for the dashboard (shared design with the strøm dashboard).

export const CSS = `
:root { color-scheme: light; --bg: #f3f5f8; --card: #ffffff; --line: #dde3eb; --text: #0b1430; --muted: #56618a; --accent: #5ef0a8; --navy: #0b1430;
  --ok: #15803d; --ok-bg: #dcfce7; --warn: #a15c00; --warn-bg: #fef3c7; --bad: #b91c1c; --bad-bg: #fee2e2; --cheap: #1a8a60; --dear: #a86a0b; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --bg: #0b1430; --card: #131f45; --line: #26335c; --text: #f2f5fb; --muted: #9fb0d6;
  --ok: #4ade80; --ok-bg: #12351f; --warn: #fbbf24; --warn-bg: #3a2c0a; --bad: #f87171; --bad-bg: #3b1515; --cheap: #1fa874; --dear: #d8962a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.45 Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
a { color: inherit; }
header.top { background: var(--navy); color: #fff; padding: 14px 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: space-between; }
.brand { display: flex; gap: 12px; align-items: center; }
.mark { width: 42px; height: 42px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.brand h1 { margin: 0; font-size: 18px; } .brand small { color: #a9b8cc; }
.toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
main { max-width: 900px; margin: 0 auto; padding: 16px; }
h2 { font-size: 17px; margin: 28px 0 10px; }
.btn { display: inline-flex; align-items: center; min-height: 40px; padding: 8px 14px; border-radius: 10px; border: 1px solid transparent; background: var(--navy); color: #fff; font: 600 14px/1 inherit; cursor: pointer; text-decoration: none; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .btn { background: var(--accent); color: #0b1430; } }
.btn.ghost { background: transparent; color: var(--text); border-color: var(--line); }
.btn.light { background: rgba(255,255,255,.12); color: #fff; border-color: rgba(255,255,255,.25); }
.btn.sm { min-height: 34px; padding: 6px 10px; font-size: 13px; }
.health { border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.health.ok { background: var(--ok-bg); color: var(--ok); font-weight: 600; }
.health .p { display: flex; gap: 8px; align-items: baseline; }
.health .p.bad { color: var(--bad); } .health .p.warn { color: var(--warn); }
.health.problems { background: var(--card); border: 1px solid var(--line); }
.tag { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 2px 6px; border-radius: 6px; flex: 0 0 auto; }
.tag.bad { background: var(--bad-bg); color: var(--bad); } .tag.warn { background: var(--warn-bg); color: var(--warn); } .tag.ok { background: var(--ok-bg); color: var(--ok); }
.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
@media (min-width: 640px) { .cards { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; }
.card .k { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
.card .v { font-size: 20px; font-weight: 700; margin-top: 2px; }
.card .s { font-size: 13px; color: var(--muted); }
.v.ok { color: var(--ok); } .v.warn { color: var(--warn); } .v.bad { color: var(--bad); }
.unit { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin-bottom: 10px; }
.unit.skipped { opacity: .55; }
.unit .t { font-weight: 700; } .unit .m { font-size: 13px; color: var(--muted); }
.strip { display: flex; gap: 6px; overflow-x: auto; margin: 10px 0; padding-bottom: 4px; }
.strip img { height: 120px; width: auto; border-radius: 6px; background: var(--navy); flex: 0 0 auto; }
.cap { font-size: 13px; white-space: pre-wrap; background: var(--bg); border-radius: 10px; padding: 8px 10px; max-height: 9em; overflow: auto; }
.btns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.tablewrap { overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 9px 12px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
th { font-size: 12px; color: var(--muted); font-weight: 600; }
tr:last-child td { border-bottom: 0; }
td.num { text-align: right; font-variant-numeric: tabular-nums; } th.num { text-align: right; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: 0; }
.list { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.list > div { padding: 9px 12px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; gap: 10px; font-size: 14px; }
.list > div:last-child { border-bottom: 0; }
.muted, .when { color: var(--muted); } .when { white-space: nowrap; font-size: 13px; }
.hint { font-size: 13px; color: var(--muted); }
form.settings { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
form.settings label { display: flex; gap: 10px; align-items: center; margin: 6px 0; }
form.settings input { width: 20px; height: 20px; }
details.help { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 10px 14px; margin-bottom: 8px; }
details.help summary { font-weight: 600; cursor: pointer; }
.banner { position: sticky; top: 0; z-index: 5; background: #1e3a8a; color: #fff; padding: 10px 16px; font-size: 14px; display: none; }
.banner.show { display: block; }
dialog { border: 0; border-radius: 16px; padding: 0; width: min(560px, calc(100vw - 32px)); background: var(--card); color: var(--text); }
dialog::backdrop { background: rgba(0,0,0,.5); }
dialog .in { padding: 16px; }
table.handles input { width: 100%; min-width: 150px; font: inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); }
table.handles td { white-space: normal; vertical-align: middle; }
dialog textarea { width: 100%; min-height: 240px; font: 14px/1.45 inherit; padding: 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--text); }
`;

// Live checks in the browser, and the buttons.
export const JS = `
function osloNow() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).replace(' ', 'T'); }
function addMin(t, m) { const d = new Date(t + ':00Z'); d.setUTCMinutes(d.getUTCMinutes() + m); return d.toISOString().slice(0, 16); }
function liveChecks() {
  const now = osloNow(); const out = [];
  if (!LIVE.paused) for (const e of LIVE.expected) {
    if (e.done || e.skipped || now >= e.expiresAt || now < addMin(e.publishAt, LIVE.lateWarn)) continue;
    const bad = now >= addMin(e.publishAt, LIVE.lateBad);
    out.push([bad ? 'bad' : 'warn', e.label + ' skulle vært publisert kl. ' + e.publishAt.slice(11) + ' og er ikke publisert' + (bad ? '. Trykk «Publiser nå» eller se GitHub-kjøringene.' : ' ennå. Systemet prøver igjen hvert 20. minutt.')]);
  }
  if (Date.now() - Date.parse(LIVE.builtAt) > LIVE.staleHours * 3600e3) out.push(['bad', 'Siden er ikke oppdatert på over ' + Math.round(LIVE.staleHours / 24) + ' dager. Kjøringene i GitHub kan ha stoppet.']);
  if (!out.length) return;
  const h = document.getElementById('health');
  if (h.classList.contains('ok')) { h.className = 'health problems'; h.innerHTML = ''; }
  for (const [lvl, text] of out) {
    const p = document.createElement('div'); p.className = 'p ' + lvl;
    p.innerHTML = '<span class="tag ' + lvl + '">' + (lvl === 'bad' ? 'Feil' : 'Obs') + '</span>';
    const s = document.createElement('span'); s.textContent = text; p.appendChild(s); h.prepend(p);
  }
}
liveChecks();
function banner(t) { const b = document.getElementById('banner'); b.textContent = t; b.classList.add('show'); }
async function act(action, question) {
  if (question && !confirm(question)) return;
  let r;
  try { r = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); }
  catch { alert('Knappene virker bare på det publiserte dashboardet.'); return; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { alert(j.error || 'Noe gikk galt.'); return; }
  banner('Sendt ✓ Endringen er tatt imot og vises her om ca. 3–5 minutter' + (action.type === 'publish-now' ? ' (innlegget publiseres da).' : '.'));
}
let current = null;
function editCaption(btn) {
  current = JSON.parse(btn.closest('.unit').dataset.unit);
  const t = document.getElementById('capText'); t.value = current.caption;
  document.getElementById('capCount').textContent = t.value.length;
  document.getElementById('capOrig').textContent = current.original;
  document.getElementById('capReset').style.display = current.edited ? '' : 'none';
  document.getElementById('capDialog').showModal();
}
function saveCaption() { const text = document.getElementById('capText').value; document.getElementById('capDialog').close(); act({ type: 'caption', key: current.key, text }); }
function resetCaption() { document.getElementById('capDialog').close(); act({ type: 'caption', key: current.key, text: null }); }
function saveSettings(e) { e.preventDefault(); const f = e.target; act({ type: 'settings', settings: { stories: f.stories.checked } }); }
function saveHandles(e) {
  e.preventDefault();
  const handles = {};
  for (const i of e.target.querySelectorAll('input[data-orgnr]')) if (i.value.trim() !== i.dataset.saved) handles[i.dataset.orgnr] = i.value.trim() || null;
  if (!Object.keys(handles).length) { alert('Ingen endringer å lagre.'); return; }
  act({ type: 'handles', handles });
}
`;
