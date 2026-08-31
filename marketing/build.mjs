// Build the four public marketing pages as static HTML under frontend/public/,
// each with its own share card, so a link pasted into a feed or a group chat
// renders as something other than a bare URL. Run from the repo root:
//
//   npm i sharp --no-save   # not a repo dependency; only the cards need it
//   node marketing/build.mjs
//
// Two things separate these from the deck at /deck.
//
// They are meant to be indexed, so there is no noindex anywhere and they are in
// the sitemap. And they are fetched over the web rather than sent as an email
// attachment, so the fonts are real files served from this origin instead of
// base64 inlined into every page. That second choice is not only about size:
// linking fonts.googleapis.com the way frontend/index.html does would hand a
// third party the address of every visitor, including someone opening
// /need-help. CLAUDE.md rules out tracking who browses, and a webfont request
// is tracking whether or not it was meant as any.
//
// The rule the copy is written under lives in pages.mjs. The figures below are
// counted from the repository, never typed, and marketing/check-counts.mjs runs
// in CI so the committed pages cannot drift away from the tree.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { countAll } from '../deck/counts.mjs';
import { PAGES } from './pages.mjs';

const DIR = import.meta.dirname;
const ROOT = path.resolve(DIR, '..');
const PUBLIC = path.join(ROOT, 'frontend', 'public');
const ORIGIN = 'https://relayfunds.org';

// Unlike the deck, sharp is required rather than optional here. The deck
// degrades to a larger file without it; these pages degrade to having no share
// card, which is the entire point of building them.
let sharp;
try {
  sharp = createRequire(import.meta.url)('sharp');
} catch {
  console.error(
    'sharp is required to render the share cards.\n' +
      '  npm i sharp --no-save && node marketing/build.mjs\n\n' +
      'Without it these pages would ship with no preview image, which is the ' +
      'one thing they exist to fix.'
  );
  process.exit(1);
}

// ---- Fonts: fetch each face once and serve it from this origin --------------
const FACES = [
  ['Inter:wght@400', 'Inter', 400, 'inter-400.woff2'],
  ['Inter:wght@600', 'Inter', 600, 'inter-600.woff2'],
  ['Inter:wght@700', 'Inter', 700, 'inter-700.woff2'],
  ['JetBrains+Mono:wght@500', 'JetBrains Mono', 500, 'jetbrains-mono-500.woff2'],
];

const FONT_DIR = path.join(PUBLIC, 'fonts');
fs.mkdirSync(FONT_DIR, { recursive: true });

let FONT_CSS = '';
for (const [spec, family, weight, file] of FACES) {
  const dest = path.join(FONT_DIR, file);
  // Cached across rebuilds. Refetching four files on every build is wasted
  // network, and a font revision landing silently mid-build is not wanted.
  if (!fs.existsSync(dest)) {
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`, {
      headers: {
        // Without a modern UA Google serves ttf, roughly three times the size.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
    });
    if (!res.ok) throw new Error(`${family} ${weight}: css HTTP ${res.status}`);
    const css = await res.text();
    // Latin only. These pages are English and Spanish, both of which the latin
    // and latin-ext subsets cover; pulling every subset multiplies the bytes
    // for glyphs nothing renders.
    const block = css.split('@font-face').find((b) => b.includes('U+0000-00FF'));
    const url = block?.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!url) throw new Error(`${family} ${weight}: no latin woff2 in the stylesheet`);
    const fontRes = await fetch(url);
    if (!fontRes.ok) throw new Error(`${family} ${weight}: woff2 HTTP ${fontRes.status}`);
    fs.writeFileSync(dest, Buffer.from(await fontRes.arrayBuffer()));
    console.log(`fetched font: ${file} (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
  }
  FONT_CSS +=
    `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};` +
    `font-display:swap;src:url(/fonts/${file}) format('woff2')}`;
}

// ---- Counted, not typed -----------------------------------------------------
const { tests, routes, ciJobs } = countAll(ROOT);
console.log(`counted: ${tests} tests, ${routes} screens, ${ciJobs} checks`);

const STAT_ROW = [
  [String(routes), 'screens across four roles'],
  [String(tests), 'automated tests'],
  [String(ciJobs), 'automated checks on every change'],
  ['EN / ES', 'every screen, both languages'],
];

// ---- Design tokens ----------------------------------------------------------
// Lifted from frontend/tailwind.config.js and matched to the deck, so the three
// public surfaces do not each invent a Relay.
const CSS = `
${FONT_CSS}
:root{
  --p50:#f0f7ff;--p100:#dbeafe;--p200:#b4d3f5;--p400:#4a90d9;--p500:#2e6eb5;
  --p600:#1d5a9e;--p700:#164a84;--p800:#113b6a;--p900:#0c2d52;
  --teal:#0d9488;--teal-50:#f0fdfa;--teal-200:#99f6e4;
  --amber:#d97706;--amber-50:#fffbeb;--amber-200:#fde68a;
  --ink:#111827;--body:#374151;--muted:#6b7280;--line:#e5e7eb;--ground:#f9fafb;
  --r-sm:6px;--r:8px;--r-lg:12px;
  --sh-sm:0 1px 2px rgba(0,0,0,.05);--sh-md:0 4px 12px rgba(0,0,0,.08);--sh-lg:0 8px 24px rgba(0,0,0,.1);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ground);color:var(--body);
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:17px;line-height:1.62;-webkit-font-smoothing:antialiased}
a{color:var(--p600)}
em{font-style:normal;color:var(--p600)}
h1,h2,h3{color:var(--ink);font-weight:700;letter-spacing:-.021em;line-height:1.14;margin:0}
h1{font-size:clamp(31px,5.1vw,50px)}
h2{font-size:clamp(25px,3.5vw,35px);line-height:1.18}
h3{font-size:17px;line-height:1.34;letter-spacing:-.008em}
p{margin:0}
.wrap{max-width:940px;margin:0 auto;padding:0 22px}

/* Header */
.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);
  backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;height:62px}
.top img{height:26px;display:block}
.top nav{display:flex;gap:6px;flex-wrap:wrap}
.top nav a{display:inline-flex;align-items:center;min-height:38px;padding:0 12px;border-radius:var(--r);
  font-size:14px;font-weight:500;color:var(--body);text-decoration:none}
.top nav a:hover{background:var(--p50);color:var(--p700)}
.top nav a[aria-current]{background:var(--p50);color:var(--p700)}
@media(max-width:720px){.top nav a{padding:0 9px;font-size:13px}.top img{height:22px}}
@media(max-width:520px){.top nav .opt{display:none}}

/* Rhythm */
section{padding:clamp(38px,6.4vw,68px) 0}
section+section{padding-top:0}
.stack>*+*{margin-top:18px}
.eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;font-weight:500;
  letter-spacing:.13em;text-transform:uppercase;color:var(--p600)}
.lede{font-size:clamp(17px,1.9vw,19.5px);line-height:1.62;color:var(--body);max-width:70ch}
.small{font-size:15px;line-height:1.6}
.muted{color:var(--muted)}

/* Hero */
.hero{padding-top:clamp(40px,6vw,74px);border-bottom:1px solid var(--line);background:#fff}
.hero .badge{display:inline-flex;align-items:center;gap:9px;padding:6px 13px;border-radius:999px;
  background:var(--p50);border:1px solid var(--p200);color:var(--p700);
  font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;font-weight:500;letter-spacing:.06em}
.hero.warn .badge{background:var(--amber-50);border-color:var(--amber-200);color:#92400e}
.pulse{width:7px;height:7px;border-radius:999px;background:var(--teal);flex:none}
.hero.warn .pulse{background:var(--amber)}
.chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:6px}
.chip{display:inline-flex;gap:7px;align-items:baseline;padding:8px 13px;border-radius:999px;
  background:var(--ground);border:1px solid var(--line);font-size:14px;color:var(--muted)}
.chip b{color:var(--ink);font-weight:600}

/* Cards */
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(212px,1fr))}
.card{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:20px;box-shadow:var(--sh-sm)}
.card h3{margin-bottom:8px}
.card p{font-size:15px;line-height:1.58;color:var(--body)}
.card.accent{border-color:var(--p200);background:var(--p50)}
.card.flag{border-color:var(--amber-200);background:var(--amber-50)}

/* Is / is not */
.ledger{display:grid;grid-template-columns:auto 1fr;gap:11px 15px;align-items:start;
  background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:22px;box-shadow:var(--sh-sm)}
.ledger span:nth-child(odd){font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;font-weight:500;
  letter-spacing:.09em;padding:3px 8px;border-radius:var(--r-sm);white-space:nowrap;margin-top:2px}
.ledger .yes{background:var(--teal-50);color:var(--teal);border:1px solid var(--teal-200)}
.ledger .no{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.ledger span:nth-child(even){font-size:15.5px;line-height:1.55}

/* Steps */
.steps{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(198px,1fr))}
.step{background:#fff;border:1px solid var(--line);border-left:3px solid var(--p400);
  border-radius:var(--r);padding:17px 18px}
.step b{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;font-weight:500;
  letter-spacing:.1em;color:var(--p600);text-transform:uppercase;margin-bottom:7px}
.step p{font-size:15px;line-height:1.56}
.list{display:grid;gap:9px;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);
  padding:22px;margin:0;list-style:none;counter-reset:n}
.list li{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:baseline;font-size:15.5px;counter-increment:n}
.list li::before{content:counter(n,decimal-leading-zero);
  font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:var(--p600);font-weight:500}

/* Stats */
.stats{display:flex;flex-wrap:wrap;gap:clamp(20px,4vw,52px);padding:24px 0}
.stat{display:flex;flex-direction:column;gap:2px}
.stat .n{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:clamp(30px,4.4vw,42px);
  font-weight:500;color:var(--p600);line-height:1}
.stat .l{font-size:13.5px;color:var(--muted);max-width:19ch}

/* Notes */
.note{border-left:3px solid var(--p200);background:#fff;border-radius:0 var(--r) var(--r) 0;
  padding:15px 18px;font-size:15px;line-height:1.6;border-top:1px solid var(--line);
  border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.note.warn{border-left-color:var(--amber);background:var(--amber-50);border-color:var(--amber-200);
  border-left-color:var(--amber)}
.note b{color:var(--ink)}

/* Status */
.status{background:var(--p900);color:#c7dbf2;border-radius:var(--r-lg);padding:clamp(24px,4vw,38px)}
.status h2{color:#fff}
.status .eyebrow{color:var(--teal-200)}
.status .lede{color:#c7dbf2}
.status .grid{margin-top:22px}
.status .card{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.16);box-shadow:none}
.status .card h3{color:#fff}
.status .card p{color:#b7cfea}

/* Doors */
.doors{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.door{display:block;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);
  padding:20px;text-decoration:none;box-shadow:var(--sh-sm);transition:box-shadow .2s,border-color .2s}
.door:hover{border-color:var(--p400);box-shadow:var(--sh-md)}
.door b{display:block;color:var(--ink);font-size:17px;font-weight:700;letter-spacing:-.008em}
.door p{margin-top:6px;font-size:14.5px;line-height:1.5;color:var(--muted)}
.door .go{display:inline-block;margin-top:11px;font-size:14px;font-weight:600;color:var(--p600)}

/* Footer */
footer{border-top:1px solid var(--line);background:#fff;padding:34px 0 44px;margin-top:clamp(38px,6vw,66px)}
footer .wrap{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between}
footer p{font-size:14px;color:var(--muted);max-width:52ch}
footer a{color:var(--p600)}
footer .links{display:flex;flex-direction:column;gap:7px;font-size:14px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:14px;top:12px;z-index:60;background:var(--p600);color:#fff;padding:9px 15px;border-radius:var(--r)}
:focus-visible{outline:2px solid var(--p600);outline-offset:2px}
`
  .replace(/\n\s*/g, '')
  .trim();

// ---- Block rendering --------------------------------------------------------
const esc = (s) => String(s).replace(/&(?![a-z]+;|#\d+;)/g, '&amp;').replace(/</g, '&lt;');

const chip = ([b, rest]) => `<span class="chip"><b>${b}</b> ${rest}</span>`;
const card = ([h, p], cls = '') => `<div class="card ${cls}"><h3>${h}</h3><p>${p}</p></div>`;

function renderBlock(b) {
  switch (b.type) {
    case 'hero':
      return `<header class="hero${b.warn ? ' warn' : ''}"><div class="wrap stack">
        ${b.badge ? `<div class="badge"><span class="pulse"></span>${b.badge}</div>` : ''}
        <h1>${b.title}</h1>
        ${b.ledes.map((l) => `<p class="lede">${l}</p>`).join('')}
        ${b.chips ? `<div class="chips">${b.chips.map(chip).join('')}</div>` : ''}
      </div></header>`;

    case 'band':
      return `<section><div class="wrap stack">
        ${b.eyebrow ? `<span class="eyebrow">${b.eyebrow}</span>` : ''}
        <h2>${b.title}</h2>
        ${b.lede ? `<p class="lede">${b.lede}</p>` : ''}
      </div></section>`;

    case 'cards':
      return `<section style="padding-top:22px"><div class="wrap">
        <div class="grid">${b.items.map((i) => card(i, b.cls || '')).join('')}</div>
      </div></section>`;

    case 'ledger':
      return `<section style="padding-top:22px"><div class="wrap"><div class="ledger">
        ${b.is.map((t) => `<span class="yes">${b.isLabel || 'IS'}</span><span>${t}</span>`).join('')}
        ${b.not.map((t) => `<span class="no">${b.notLabel || 'NOT'}</span><span>${t}</span>`).join('')}
      </div></div></section>`;

    case 'steps':
      if (b.numbered) {
        return `<section style="padding-top:22px"><div class="wrap stack">
          ${b.heading ? `<h3>${b.heading}</h3>` : ''}
          <ol class="list">${b.items.map(([t]) => `<li><span>${t}</span></li>`).join('')}</ol>
        </div></section>`;
      }
      return `<section style="padding-top:22px"><div class="wrap">
        <div class="steps">${b.items
          .map(([t, p], i) => `<div class="step"><b>${String(i + 1).padStart(2, '0')} &middot; ${t}</b><p>${p}</p></div>`)
          .join('')}</div>
      </div></section>`;

    case 'stats':
      return `<section style="padding-top:8px"><div class="wrap"><div class="stats">
        ${STAT_ROW.map(([n, l]) => `<div class="stat"><span class="n">${n}</span><span class="l">${l}</span></div>`).join('')}
      </div></div></section>`;

    case 'note':
      return `<section style="padding-top:20px"><div class="wrap">
        <div class="note${b.warn ? ' warn' : ''}">${b.body}</div>
      </div></section>`;

    case 'status':
      return `<section><div class="wrap"><div class="status stack">
        <span class="eyebrow">${b.eyebrow}</span>
        <h2>${b.title}</h2>
        <p class="lede">${b.body}</p>
        <div class="grid">${b.facts.map((f) => card(f)).join('')}</div>
      </div></div></section>`;

    case 'doors':
      return `<section><div class="wrap stack">
        <span class="eyebrow">${b.eyebrow}</span>
        <h2>${b.title}</h2>
        <div class="doors">${b.items
          .map(([t, href, p]) => `<a class="door" href="${href}"><b>${t}</b><p>${p}</p><span class="go">Read this &rarr;</span></a>`)
          .join('')}</div>
      </div></section>`;

    default:
      throw new Error(`unknown block type: ${b.type}`);
  }
}

// ---- Share card -------------------------------------------------------------
// 1200x630, the size every platform crops from. Rendered from SVG rather than
// designed by hand so a copy change cannot leave the card saying the old thing.
//
// The typeface is whatever the build machine resolves from the stack below;
// librsvg does not read the woff2 files fetched above. Inter if it is installed,
// otherwise a close system sans. Check the output rather than assuming, which is
// why the build writes the PNGs where they can be opened.
const CARD_STACK = 'Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';

async function shareCard(page) {
  const lines = page.ogHeadline.split('\n');
  const size = lines.length > 3 ? 62 : 70;
  const top = 630 / 2 - (lines.length * size * 1.16) / 2 + size * 0.82;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0c2d52"/><stop offset="1" stop-color="#113b6a"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <rect x="0" y="0" width="1200" height="6" fill="#0d9488"/>
    <text x="72" y="96" font-family="${CARD_STACK}" font-size="20" font-weight="600"
      letter-spacing="3.4" fill="#5eead4">${esc(page.ogKicker)}</text>
    ${lines
      .map(
        (l, i) =>
          `<text x="72" y="${Math.round(top + i * size * 1.16)}" font-family="${CARD_STACK}" ` +
          `font-size="${size}" font-weight="700" letter-spacing="-1.4" fill="#ffffff">${esc(l)}</text>`
      )
      .join('')}
    <rect x="72" y="524" width="1056" height="1" fill="#ffffff" opacity="0.18"/>
    <text x="72" y="572" font-family="${CARD_STACK}" font-size="24" font-weight="600"
      fill="#ffffff">relayfunds.org</text>
    <text x="1128" y="572" text-anchor="end" font-family="${CARD_STACK}" font-size="20"
      font-weight="400" fill="#9dbfe4">Open source &#183; No pilot yet</text>
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  // Content-hashed, because nginx serves .png from this tree with a one-year
  // immutable cache. A card edited under a stable name would keep showing the
  // old image in every crawler and CDN that had already seen it.
  const hash = crypto.createHash('sha256').update(png).digest('hex').slice(0, 8);
  const name = `${page.slug}-${hash}.png`;
  const dir = path.join(PUBLIC, 'share');
  fs.mkdirSync(dir, { recursive: true });
  // Drop older cards for this page so the directory does not accumulate one
  // orphan per edit.
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(`${page.slug}-`) && f !== name) fs.unlinkSync(path.join(dir, f));
  }
  fs.writeFileSync(path.join(dir, name), png);
  return { url: `${ORIGIN}/share/${name}`, kb: Math.round(png.length / 1024) };
}

// ---- Document ---------------------------------------------------------------
function document_(page, card) {
  const url = `${ORIGIN}/${page.slug}/`;
  const nav = PAGES.map(
    (p) =>
      `<a href="/${p.slug}/"${p.slug === page.slug ? ' aria-current="page"' : ''}` +
      `${p.slug === 'what-is-relay' ? '' : ' class="opt"'}>${p.navLabel}</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/logo.png">
<meta name="theme-color" content="#0c2d52">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Relay">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${card.url}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(page.ogHeadline.replace(/\n/g, ' '))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${card.url}">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="top"><div class="wrap">
  <a href="/" aria-label="Relay home"><img src="/logo.png" alt="Relay"></a>
  <nav>${nav}</nav>
</div></div>
<main id="main">
${page.blocks.map(renderBlock).join('\n')}
</main>
<footer><div class="wrap">
  <p>Relay is built by Mythic Works LLC and is intended to be handed to a nonprofit, which has not
  been formed. It is not fundraising and has no donation page. Nothing on this site sets a cookie,
  records who visited, or loads anything from a third party.</p>
  <div class="links">
    <a href="/">relayfunds.org</a>
    <a href="https://github.com/Flatts3000/relay">Read the code on GitHub</a>
    <a href="mailto:flatts.scg@gmail.com">flatts.scg@gmail.com</a>
  </div>
</div></footer>
</body>
</html>`;
}

// ---- Write ------------------------------------------------------------------
const written = [];
for (const page of PAGES) {
  const card = await shareCard(page);
  const dir = path.join(PUBLIC, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  const html = document_(page, card);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  written.push([page.slug, Math.round(html.length / 1024), card.kb]);
}

// ---- The site's own share card ----------------------------------------------
// frontend/index.html is the single-page app's template and had no Open Graph
// tags at all, so every link to relayfunds.org itself - the one URL anyone
// actually pastes - rendered as a bare string with no image and no framing.
//
// The build owns the tags rather than leaving them hand-written, because the
// image filename carries a content hash and a human maintaining that by hand
// would get it wrong the first time the card changed.
const siteCard = await shareCard({
  slug: 'relay',
  ogKicker: 'RELAYFUNDS.ORG',
  ogHeadline: 'Mutual aid,\nconnected.',
});

const INDEX = path.join(ROOT, 'frontend', 'index.html');
const indexHtml = fs.readFileSync(INDEX, 'utf8');
const START = '<!-- share-card:start';
const END = '<!-- share-card:end -->';
const a = indexHtml.indexOf(START);
const b = indexHtml.indexOf(END);
if (a === -1 || b === -1) {
  throw new Error(
    `Could not find the share-card markers in ${path.relative(ROOT, INDEX)}. They delimit the ` +
      'block this build regenerates; restore them rather than removing this step, or the site ' +
      'root goes back to having no preview image.'
  );
}
// Only the two image URLs are rewritten. The titles and descriptions inside the
// block stay hand-editable, because they are copy and this build has no opinion
// about them.
const rewritten =
  indexHtml.slice(0, a) +
  indexHtml.slice(a, b).replace(/https:\/\/relayfunds\.org\/share\/relay[^"]*\.png/g, siteCard.url) +
  indexHtml.slice(b);
if (rewritten !== indexHtml) {
  fs.writeFileSync(INDEX, rewritten);
  console.log(`updated frontend/index.html share card -> ${siteCard.url.split('/').pop()}`);
}

// A sitemap so the pages are actually discoverable, listing only the public
// surfaces. /deck is deliberately absent: it is served noindex, and listing it
// here would both contradict that and advertise the path.
const today = new Date().toISOString().slice(0, 10);
const urls = ['', ...PAGES.map((p) => `${p.slug}/`), 'directory'];
fs.writeFileSync(
  path.join(PUBLIC, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${ORIGIN}/${u}</loc><lastmod>${today}</lastmod>` +
          `<changefreq>monthly</changefreq><priority>${u === '' ? '1.0' : '0.8'}</priority></url>`
      )
      .join('\n') +
    `\n</urlset>\n`
);

console.log('\nwrote:');
for (const [slug, html, png] of written) {
  console.log(`  /${slug}/  ${String(html).padStart(3)} KB html  +  ${String(png).padStart(3)} KB share card`);
}
console.log(`  /sitemap.xml  ${urls.length} urls`);
console.log('\nCheck the share cards before committing: frontend/public/share/*.png');
