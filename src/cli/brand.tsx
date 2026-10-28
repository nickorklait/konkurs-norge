// npm run brand: profile picture and tekster.txt (name, bio, intro post, launch plan) in output/brand/. One-offs, by hand.

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, paths } from '../config.ts';
import { renderPng } from '../render/render.ts';

const config = loadConfig();
const c = config.colors;
const out = path.join(paths.output, 'brand');
fs.mkdirSync(out, { recursive: true });

const avatar = (
  <div style={{ width: 1080, height: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
    <div style={{ width: 780, height: 780, borderRadius: 780, backgroundColor: c.panel, border: `14px solid ${c.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={460} height={460} viewBox="0 0 24 24">
        <path d="M13 3 L19 9 L16 12 L10 6 Z" fill={c.accent} />
        <path d="M11.5 9.5 L4 17 L6 19 L13.5 11.5 Z" fill={c.accent} />
        <path d="M13 19 H21 V21 H13 Z" fill={c.accent} />
      </svg>
    </div>
  </div>
);
fs.writeFileSync(path.join(out, 'profilbilde.png'), await renderPng(avatar, { width: 1080, height: 1080 }));

const bio = `⚖️ Konkursene i Norge, hver morgen kl. 8\n📍 Fylke og bransje – aldri navn\n📊 Lørdag: uka, og konkurs mot nye bedrifter 👇`;
fs.writeFileSync(
  path.join(out, 'tekster.txt'),
  `PROFILNAVN
${config.brand.name}

BRUKERNAVN (forslag, sjekk hva som er ledig)
@konkurs.norge · @konkursnorge · @konkursene.i.norge

KATEGORI
Nyheter og medier (eller Økonomi)

BIO (${bio.length} av 150 tegn)
${bio}

TEKST TIL INTRO-INNLEGGET (fest det øverst)
Hvor mange bedrifter går konkurs i Norge – og hvor? ⚖️

Hver morgen kl. 8: gårsdagens konkurser mot en vanlig dag, fordelt på fylke og bransje, hvor mange ansatte
som er berørt og hvor gamle bedriftene var. Mandag: fredag og helgen. Lørdag: uka, per innbygger i hvert
fylke, og konkurser mot nye bedrifter i hver bransje.

Vi navngir aldri konkursbedrifter – bak mange av dem står det enkeltpersoner. Bare tallene, rett fra
Brønnøysundregistrene og SSB.
Følg for tallene hver morgen, og send til en som jobber med økonomi 👇

FØRSTE UKE
Dag 1: profilbilde, navn, bio og intro-innlegget (fest det). Det første innlegget kommer automatisk kl. 8.
Dag 1–3: følg økonomijournalister, regnskapsbyråer, revisorer, banker og næringsforeninger; kommenter
  nyttig på innlegg om konkurser («Bygg og anlegg hadde 11 av ukas 60 konkurser»).
Hver lørdag: del ukesinnlegget i story – det er det som deles videre i bransjene.
Etter 2–3 uker: tilby sponsorplassen («Sponset av») til regnskapsbyråer, inkasso, advokatfirmaer eller banker
  – med tall fra vekstrapporten.
Mål første måned: 300–600 følgere (smalere publikum, men ofte fagfolk som deler videre).
`,
);
console.log(`Brand files in ${path.relative(process.cwd(), out)}: profilbilde.png, tekster.txt`);
