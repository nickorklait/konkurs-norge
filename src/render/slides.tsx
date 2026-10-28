// Weekday mornings: the number and where/which industries. Saturday: the week, per county per 100,000,
// and new businesses against bankruptcies per industry. Counts only, never a name.

import type { ReactNode } from 'react';
import { dec, fmt, spanText, weekRange } from '../caption.ts';
import type { Config } from '../config.ts';
import { DAYS, isoWeek, weekday } from '../dates.ts';
import type { Count, Summary } from '../summary.ts';
import { SIZES, type Format } from './render.ts';

export const DISPLAY = 'Barlow Condensed';
export const TEXT = 'Inter';

function Gavel({ size, c }: { size: number; c: Config['colors'] }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size, backgroundColor: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24">
        <path d="M13 3 L19 9 L16 12 L10 6 Z" fill={c.surface} />
        <path d="M11.5 9.5 L4 17 L6 19 L13.5 11.5 Z" fill={c.surface} />
        <path d="M13 19 H21 V21 H13 Z" fill={c.surface} />
      </svg>
    </div>
  );
}

function Frame({ config, format, kicker, footnote, children }: { config: Config; format: Format; kicker: string; footnote: string; children: ReactNode }) {
  const c = config.colors;
  const { width, height } = SIZES[format];
  const story = format === 'story';
  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column', backgroundColor: c.surface, color: c.text, fontFamily: TEXT }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${story ? 200 : 56}px 56px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Gavel size={64} c={c} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: 3, textTransform: 'uppercase' }}>{config.brand.name}</span>
            <span style={{ fontWeight: 600, fontSize: 20, letterSpacing: 2, color: c.muted, textTransform: 'uppercase' }}>{kicker}</span>
          </div>
        </div>
        {children}
        <span style={{ fontSize: 17, color: c.muted, marginTop: 'auto', marginBottom: 14, lineHeight: 1.4 }}>{footnote}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, backgroundColor: '#ffffff', padding: '20px 56px', marginBottom: story ? 190 : 0 }}>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: 2, color: '#6b7280', textTransform: 'uppercase' }}>{config.sponsor.label}</span>
        <div style={{ display: 'flex', flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', border: `3px dashed ${c.surface}`, borderRadius: 12 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: c.surface, textTransform: 'uppercase' }}>{config.sponsor.text}</span>
        </div>
      </div>
    </div>
  );
}

const footnote = (config: Config, extra = '') => `Konkurser åpnet (konkursdato) i Enhetsregisteret, etter forretningsadresse. Vi navngir aldri konkursbedrifter. ${extra}${config.source.brreg}.`;
const kicker = (s: Summary) => (s.kind === 'week' ? `Uke ${isoWeek(s.span.from).week} · ${weekRange(s)}` : s.span.from === s.span.to ? `I går · ${spanText(s)}` : `Fredag og helgen · ${weekRange(s)}`);
const usual = (s: Summary) => (s.kind === 'week' ? 'uke' : s.span.from === s.span.to ? DAYS[weekday(s.span.to)] : 'fredag og helg');

function Tile({ label, value, c }: { label: string; value: string; c: Config['colors'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: c.panel, borderRadius: 16, padding: '14px 20px' }}>
      <span style={{ fontWeight: 600, fontSize: 19, color: c.muted }}>{label}</span>
      <span style={{ fontWeight: 800, fontSize: 44, marginTop: 2 }}>{value}</span>
    </div>
  );
}

export function Cover({ s, config, format }: { s: Summary; config: Config; format: Format }) {
  const c = config.colors;
  const story = format === 'story';
  const d = s.vsNormal;
  return (
    <Frame config={config} format={format} kicker={kicker(s)} footnote={footnote(config, `Normal: snittet av samme ${s.kind === 'week' ? 'uke' : 'dag'} de siste ukene. `)}>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: story ? 300 : 250, lineHeight: 0.85, marginTop: story ? 50 : 30, color: c.accent }}>{String(s.count)}</span>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: story ? 84 : 72, lineHeight: 1, textTransform: 'uppercase' }}>{s.count === 1 ? 'konkurs' : 'konkurser'}</span>
      <span style={{ fontSize: story ? 32 : 28, marginTop: 14, color: d > 0 ? c.up : d < 0 ? c.down : c.muted, fontWeight: 600 }}>
        {d === 0 ? `Som en vanlig ${usual(s)} (snitt ${dec(s.normal)})` : `${Math.abs(d)} ${d > 0 ? 'flere' : 'færre'} enn en vanlig ${usual(s)} (snitt ${dec(s.normal)})`}
      </span>
      <div style={{ display: 'flex', gap: 12, marginTop: story ? 50 : 34 }}>
        <Tile label="Ansatte berørt" value={fmt(s.employees)} c={c} />
        <Tile label="Typisk alder" value={s.medianAge !== null && s.count >= 3 ? `${dec(s.medianAge)} år` : '–'} c={c} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Tile label="Aksjeselskaper" value={`${s.asShare} %`} c={c} />
        <Tile label={`Hittil i ${['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'][Number(s.span.to.slice(5, 7)) - 1]}`} value={fmt(s.monthToDate)} c={c} />
      </div>
      {s.trend.length >= 4 && <Trend s={s} c={c} story={story} />}
    </Frame>
  );
}

/** The last weeks' working days (or weeks), this one highlighted. */
function Trend({ s, c, story }: { s: Summary; c: Config['colors']; story: boolean }) {
  const top = Math.max(1, ...s.trend.map((t) => t.n));
  const h = story ? 220 : 150;
  const last = s.trend.length - 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16, backgroundColor: c.panel, borderRadius: 16, padding: '14px 22px 10px' }}>
      <span style={{ fontWeight: 600, fontSize: 19, color: c.muted }}>{s.kind === 'week' ? 'Konkurser per uke' : 'Konkurser per arbeidsdag, siste fire uker'}</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: h, marginTop: 8, borderBottom: `1px solid ${c.line}` }}>
        {s.trend.map((t, i) => (
          <div key={t.label} style={{ width: s.kind === 'week' ? 80 : 30, height: Math.max(3, (t.n / top) * h), backgroundColor: i === last ? c.accent : c.normal, borderRadius: '4px 4px 0 0' }} />
        ))}
      </div>
      {s.kind === 'week' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {s.trend.map((t) => (
            <span key={t.label} style={{ width: 80, textAlign: 'center', fontSize: 18, color: c.muted }}>{`${t.label} · ${t.n}`}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Bars({ title, rows, c, story, max = 8, label = (r: Count) => String(r.n) }: { title: string; rows: Count[]; c: Config['colors']; story: boolean; max?: number; label?: (r: Count) => string }) {
  const top = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: c.panel, borderRadius: 16, padding: '14px 22px', gap: story ? 10 : 6 }}>
      <span style={{ fontWeight: 600, fontSize: 20, color: c.muted }}>{title}</span>
      {rows.slice(0, max).map((r) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', height: story ? 50 : 40 }}>
          <span style={{ width: 360, fontWeight: 600, fontSize: story ? 26 : 23 }}>{r.name}</span>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 10 }}>
            <div style={{ width: `${(r.n / top) * 85}%`, height: story ? 22 : 18, backgroundColor: c.accent, borderRadius: 5 }} />
            <span style={{ fontWeight: 800, fontSize: story ? 24 : 21 }}>{label(r)}</span>
          </div>
        </div>
      ))}
      {rows.length === 0 && <span style={{ fontSize: 22, color: c.muted }}>Ingen</span>}
    </div>
  );
}

export function Where({ s, config, format }: { s: Summary; config: Config; format: Format }) {
  const c = config.colors;
  const story = format === 'story';
  return (
    <Frame config={config} format={format} kicker={kicker(s)} footnote={footnote(config, 'Bransje etter næringskode. ')}>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: story ? 104 : 84, lineHeight: 0.95, marginTop: 24, textTransform: 'uppercase' }}>Hvor og hva</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: story ? 34 : 22 }}>
        <Bars title="Fylke" rows={s.byFylke} c={c} story={story} max={story ? 8 : 6} />
        <Bars title="Bransje" rows={s.byIndustry} c={c} story={story} max={story ? 7 : 5} />
      </div>
    </Frame>
  );
}

export function PerCapita({ s, config, format }: { s: Summary; config: Config; format: Format }) {
  const c = config.colors;
  const story = format === 'story';
  const rates = s.rates ?? [];
  const top = Math.max(0.1, ...rates.map((r) => r.per100k));
  return (
    <Frame config={config} format={format} kicker={kicker(s)} footnote={footnote(config, `Folketall 1. januar ${s.populationYear} (SSB). `)}>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: story ? 100 : 80, lineHeight: 0.95, marginTop: 24, textTransform: 'uppercase' }}>Per 100 000 innbyggere</span>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: story ? 30 : 18, backgroundColor: c.panel, borderRadius: 16, padding: '10px 22px' }}>
        {rates.map((r) => (
          <div key={r.nummer} style={{ display: 'flex', alignItems: 'center', height: story ? 62 : 48 }}>
            <span style={{ width: 300, fontWeight: 600, fontSize: story ? 26 : 22 }}>{r.name}</span>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 10 }}>
              <div style={{ width: `${Math.max(1, (r.per100k / top) * 75)}%`, height: story ? 22 : 16, backgroundColor: c.accent, borderRadius: 5 }} />
              <span style={{ fontWeight: 800, fontSize: story ? 24 : 20 }}>{dec(r.per100k)}</span>
            </div>
            <span style={{ width: 70, textAlign: 'right', fontSize: story ? 22 : 19, color: c.muted }}>{`${r.n}`}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Key({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color }} />
      <span style={{ fontWeight: 600, fontSize: 18, color }}>{text}</span>
    </div>
  );
}

export function Balance({ s, config, format }: { s: Summary; config: Config; format: Format }) {
  const c = config.colors;
  const story = format === 'story';
  const rows = s.balance ?? [];
  const top = Math.max(1, ...rows.flatMap((b) => [b.bankrupt, b.started]));
  return (
    <Frame config={config} format={format} kicker={kicker(s)} footnote={footnote(config, 'Nye bedrifter: nye selskaper i drift (ikke holding) registrert samme uke. ')}>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: story ? 104 : 84, lineHeight: 0.95, marginTop: 24, textTransform: 'uppercase' }}>Konkurs mot nye</span>
      <span style={{ fontSize: story ? 28 : 24, color: c.muted, marginTop: 8 }}>{s.registered !== null ? `${fmt(s.registered)} nye registreringer i hele Norge samme uke` : ''}</span>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: story ? 34 : 22, backgroundColor: c.panel, borderRadius: 16, padding: '14px 22px', gap: story ? 18 : 12 }}>
        <div style={{ display: 'flex', gap: 18 }}>
          <Key text="konkurser" color={c.accent} />
          <Key text="nye bedrifter" color={c.down} />
        </div>
        {rows.map((b) => (
          <div key={b.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 600, fontSize: story ? 27 : 24 }}>{b.name}</span>
            {[
              [b.bankrupt, c.accent],
              [b.started, c.down],
            ].map(([n, color], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: `${Math.max(1, ((n as number) / top) * 85)}%`, height: story ? 20 : 16, backgroundColor: color as string, borderRadius: 5 }} />
                <span style={{ fontWeight: 800, fontSize: story ? 22 : 19 }}>{String(n)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}
