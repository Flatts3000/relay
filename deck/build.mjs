// Build the Relay partner + funder deck as a single self-contained HTML file:
// webfonts base64-embedded, screenshots optimised and inlined, no external
// requests at all. Run from the repo root:
//
//   npm i sharp        # not a repo dependency; only the deck needs it
//   node deck/build.mjs
//
// Every number in this deck is measured from the repository or the running
// deployment. Nothing here is illustrative. If a fact is not yet known it is
// marked with the .todo chip rather than filled in with something plausible -
// this deck goes to people deciding whether to trust the project with other
// people's safety, and a single invented figure would be fatal to that.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { countAll } from './counts.mjs';

// Resolved from this file, not the working directory, so `node build.mjs` from
// inside deck/ does not warn that every screenshot is missing and then write
// frontend/public/deck/deck/index.html while reporting success.
const DIR = import.meta.dirname;
const ROOT = path.resolve(DIR, '..');
const SHOTS = path.join(ROOT, 'docs', 'audit_screenshots', 'ux_audit');

// Written into the frontend's public/ directory, which Vite copies verbatim into
// the build, so the deck ships with the app and is served at /deck.
//
// One copy, not two: the file is 1.1 MB of base64 and keeping a second in deck/
// would double that in every clone and in every commit that touches it.
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'deck');
const OUT = path.join(OUT_DIR, 'index.html');

// sharp is optional: without it the PNGs are embedded as-is, which works but
// produces a much larger file.
let sharp = null;
try {
  sharp = createRequire(import.meta.url)('sharp');
} catch {
  console.warn('sharp not found - embedding PNGs unoptimised. `npm i sharp` for a smaller file.');
}

// ---- Fonts: fetch the latin woff2 for each face and base64-embed ------------
const FAMILIES = [
  // Inter and JetBrains Mono only - the two faces the product itself uses.
  ['Inter:wght@400;500;600;700', 'Inter'],
  ['JetBrains+Mono:wght@400;500;600', 'JetBrains Mono'],
];

let FONT_CSS = '';
for (const [spec, fam] of FAMILIES) {
  // Failures here are reported, not swallowed and not fatal. Without this the
  // build printed "font embedded" for every family whether or not a single
  // @font-face rule was produced - so a proxy, an outage or a non-200 yielded a
  // deck with no webfonts and a log that said everything was fine.
  let embedded = 0;
  try {
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`, {
      headers: {
        // Without a modern UA Google serves ttf, which is roughly three times
        // the size for no benefit.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const css = await res.text();

    // Latin only. The deck ships in English; pulling every subset would triple
    // the file for glyphs nothing renders.
    const blocks = css.split('@font-face').filter((b) => b.includes('U+0000-00FF'));
    for (const block of blocks) {
      const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
      if (!url) continue;
      const fontRes = await fetch(url);
      if (!fontRes.ok) throw new Error(`woff2 HTTP ${fontRes.status}`);
      const buf = Buffer.from(await fontRes.arrayBuffer());
      FONT_CSS +=
        '@font-face' +
        block.replace(
          /url\(https:[^)]+\.woff2\)/,
          `url(data:font/woff2;base64,${buf.toString('base64')})`
        );
      embedded++;
    }
    if (embedded === 0) throw new Error('no latin @font-face blocks matched');
  } catch (err) {
    console.warn(`font NOT embedded: ${fam} (${err.message}) - falling back to system fonts`);
    continue;
  }
  console.log(`font embedded: ${fam} (${embedded} face(s))`);
}

// ---- Live figures ----------------------------------------------------------
// Counted at build time rather than typed in. The hardcoded figure was stale
// eight minutes after it was written, which is the argument against hardcoding
// it in a deck whose stated rule is that every number is measured.
let OPEN_ISSUES = null;
try {
  const { execSync } = await import('node:child_process');
  const out = execSync('gh issue list --state open --limit 200 --json number --jq "length"', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    cwd: ROOT,
  });
  const n = Number(out.trim());
  if (Number.isInteger(n) && n > 0) OPEN_ISSUES = n;
} catch {
  // gh missing or unauthenticated. The slide drops the count rather than
  // guessing at it.
}
console.log('open issues:', OPEN_ISSUES ?? 'unavailable, omitting the count');

// ---- Screenshots: width-limited JPEG -> data URI ----------------------------
async function shot(file, width = 1200, quality = 74) {
  const path = `${SHOTS}/${file}`;
  if (!fs.existsSync(path)) {
    console.warn('missing screenshot, slide will render without it:', file);
    return null;
  }
  if (!sharp) {
    return `data:image/png;base64,${fs.readFileSync(path).toString('base64')}`;
  }
  const buf = await sharp(path)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

const IMG = {
  home: await shot('home_desktop_v2.png', 1200, 70),
  directory: await shot('directory_desktop_v2.png', 1200, 76),
  reports: await shot('hub_reports_desktop_v2.png', 1200, 76),
  queue: await shot('hub_requests_desktop_v2.png', 1100, 74),
  verification: await shot('hub_verification_desktop_v2.png', 1100, 76),
};
console.log(
  'image KB:',
  Object.fromEntries(
    Object.entries(IMG).map(([k, v]) => [k, v ? Math.round(v.length / 1365) : 0])
  )
);

// ---- Counted, not typed -----------------------------------------------------
// Shared with deck/check-counts.mjs, which CI runs so the committed deck cannot
// quietly drift away from the repository between rebuilds.
const { tests: testCount, routes: routeCount, ciJobs: ciJobCount } = countAll(ROOT);
console.log('counted:', testCount, 'tests,', routeCount, 'routes,', ciJobCount, 'CI jobs');

// ---- Design tokens ----------------------------------------------------------
// Lifted wholesale from frontend/tailwind.config.js: the primary blue ramp, the
// teal and amber accents, the 6/8/12px radii and the three shadows. The deck
// used to invent its own dark palette on the grounds that the product blue
// disappears against a dark ground. The answer to that was to stop using a dark
// ground, not to change the brand - the app itself is light (gray-50 surfaces,
// white cards), and the embedded screenshots are of that light app.
const CSS = `
${FONT_CSS}
:root{
  --primary-50:#f0f7ff; --primary-100:#dbeafe; --primary-200:#b4d3f5;
  --primary-400:#4a90d9; --primary:#2e6eb5; --primary-600:#1d5a9e;
  --primary-700:#164a84; --primary-900:#0c2d52;
  --teal:#14b8a6; --teal-50:#f0fdfa; --teal-200:#99f6e4; --teal-700:#0f766e;
  --amber:#d97706; --amber-50:#fffbeb; --amber-300:#fcd34d; --amber-700:#b45309;
  --red:#dc2626; --red-700:#b91c1c;

  --page:#f9fafb;
  --surface:#ffffff;
  --ink:#111827; --ink-2:#4b5563; --ink-3:#6b7280;
  --line:#e5e7eb;

  --sans:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;

  --r-sm:6px; --r:8px; --r-lg:12px;
  --sh-sm:0 1px 2px rgba(0,0,0,.05);
  --sh-md:0 4px 12px rgba(0,0,0,.08);
  --sh-lg:0 8px 24px rgba(0,0,0,.1);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
html,body{margin:0;background:var(--page)}
body{color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;padding-bottom:54px}

/* Ordinary document flow, deliberately.
   The previous shell was position:fixed with overflow:hidden, slides absolutely
   positioned at inset:0, a mask-image compositing overlay on top, and the slide
   itself a nested scroller. On iOS that combination ghosts: the browser keeps a
   stale tile of the slide and paints the relaid-out copy over it, so a single
   slide appeared twice at two different offsets - its own lede running under its
   own heading and card. Reported from an iOS in-app browser and not reproducible
   in desktop Chromium or WebKit, which is the signature of a compositing bug
   rather than a layout one.
   Nothing here is fixed except one opaque 52px bar, nothing is absolutely
   positioned over anything, and only ever one slide is painted, so there is no
   stale layer to keep and nothing to keep it under. */
.deck{position:relative}
.slide{
  display:none;
  /* less the fixed chrome bar, so a slide that fits does not scroll the page */
  min-height:calc(100vh - 54px); min-height:calc(100dvh - 54px);
  flex-direction:column;justify-content:center;
  padding:clamp(30px,5.6vh,64px) clamp(22px,6.4vw,104px) clamp(40px,6vh,72px);
  background:
    radial-gradient(880px 560px at 88% -12%, rgba(46,110,181,.07), transparent 62%),
    radial-gradient(720px 600px at -8% 108%, rgba(20,184,166,.06), transparent 58%);
}
/* One element animating itself, rather than a crossfade between two painted
   slides. The old .leaving state kept the outgoing slide displayed for 470ms,
   which is what put two copies on screen at once in the first place. */
.slide.active{display:flex;animation:enter .34s ease both}
@keyframes enter{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}

h1,h2,h3,h4,p{margin:0}
.k{font-family:var(--sans);font-weight:700;line-height:1.08;letter-spacing:-.028em;text-wrap:balance;color:var(--ink)}
.h-xl{font-size:clamp(2.1rem,5.2vw,4.2rem)}
.h-lg{font-size:clamp(1.7rem,3.9vw,3rem)}
.h-md{font-size:clamp(1.35rem,2.7vw,2rem)}
.hl{color:var(--primary-600)}
.warn{color:var(--amber)}
.eyebrow{font-family:var(--mono);text-transform:uppercase;letter-spacing:.18em;font-size:.68rem;font-weight:600;color:var(--primary-600)}
.lede{font-size:clamp(1rem,1.4vw,1.28rem);line-height:1.55;color:var(--ink-2);max-width:64ch}
.small{font-size:clamp(.85rem,1vw,.97rem);color:var(--ink-2);line-height:1.5}
.muted{color:var(--ink-3)}
.src{font-family:var(--mono);font-size:.64rem;color:var(--ink-3);letter-spacing:.02em;line-height:1.6}
.stack{display:flex;flex-direction:column;gap:clamp(12px,1.9vh,24px);min-height:0}
.stack.gap-s{gap:clamp(9px,1.2vh,14px)}
.row{display:flex;gap:clamp(12px,1.5vw,24px);flex-wrap:wrap}
.cols{display:grid;gap:clamp(14px,1.6vw,26px);min-height:0}
.two{grid-template-columns:1.02fr .98fr;align-items:center}
.three{grid-template-columns:repeat(3,1fr)}
.four{grid-template-columns:repeat(4,1fr)}
.chip{font-family:var(--mono);font-size:.72rem;letter-spacing:.03em;color:var(--ink-2);border:1px solid var(--line);
  border-radius:999px;padding:.5em 1em;background:var(--surface);box-shadow:var(--sh-sm)}
.chip b{color:var(--primary-600);font-weight:600}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:clamp(14px,1.5vw,22px);box-shadow:var(--sh-sm)}
.card h3{font-family:var(--sans);font-weight:600;font-size:1rem;color:var(--ink);margin-bottom:6px;line-height:1.25}
.card p{font-size:.9rem;color:var(--ink-2);line-height:1.55}
.card.accent{border-color:var(--primary-200);background:var(--primary-50)}
.card.accent h3{color:var(--primary-700)}
.card.flag{border-color:var(--amber-300);background:var(--amber-50)}
/* amber-700, not amber-600: heading-sized body text on the amber ground needs
   4.5:1 and amber-600 gives 3.07:1. */
.card.flag h3{color:var(--amber-700)}
.stat .n{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:clamp(1.5rem,3vw,2.6rem);
  color:var(--primary-600);font-weight:600;letter-spacing:-.02em;line-height:1}
.stat .l{display:block;margin-top:7px;font-size:.7rem;letter-spacing:.03em;color:var(--ink-3);font-family:var(--mono);line-height:1.4}
.dl{display:grid;grid-template-columns:auto 1fr;gap:9px 18px;align-items:baseline}
.dl dt{font-family:var(--mono);font-size:.74rem;color:var(--primary-600);letter-spacing:.03em;white-space:nowrap}
.dl dd{margin:0;color:var(--ink-2);font-size:.93rem;line-height:1.45}
.badge{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;font-family:var(--mono);font-size:.7rem;
  letter-spacing:.05em;color:var(--ink-2);border:1px solid var(--line);border-radius:999px;padding:.45em .9em;
  background:var(--surface);box-shadow:var(--sh-sm);max-width:100%}
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--teal);animation:pl 2.4s ease-in-out infinite}
@keyframes pl{0%,100%{opacity:1}50%{opacity:.3}}
.todo{display:inline-block;font-family:var(--mono);font-size:.7rem;letter-spacing:.04em;color:var(--amber-700);
  border:1px dashed var(--amber-300);border-radius:var(--r-sm);padding:.3em .65em;background:var(--amber-50)}
.shot{margin:0;border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--line);background:var(--surface);
  box-shadow:var(--sh-lg)}
.shot .bar{display:flex;align-items:center;gap:6px;padding:8px 11px;background:#f3f4f6;border-bottom:1px solid var(--line)}
.shot .bar span{width:8px;height:8px;border-radius:50%;background:#d1d5db}
.shot .bar em{margin-left:9px;font-style:normal;font-family:var(--mono);font-size:.64rem;color:var(--ink-3)}
.shot .shotimg{height:var(--h,clamp(180px,38vh,400px));overflow:hidden;background:var(--page)}
.shot img{display:block;width:100%;height:auto;object-fit:cover;object-position:top}
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
/* The lockbox diagram on the anonymous-request slide. Inline SVG rather than an
   image: it stays sharp at any size, costs about 4KB against 50KB for the
   screenshot it replaced, and inherits the palette instead of baking it in. */
.lock{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.4vw,20px)}
.lock .p{display:flex;flex-direction:column;gap:9px;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r-lg);padding:clamp(12px,1.2vw,16px);box-shadow:var(--sh-sm)}
.lock .art{display:block;width:100%;height:auto;max-width:300px;margin:0 auto}
/* The two coordination failures, drawn: three parties, two broken links. */
.gaps{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:clamp(8px,1.2vw,18px);align-items:center}
.gaps .node{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:clamp(14px,1.5vw,22px);box-shadow:var(--sh-sm);text-align:center}
.gaps .node svg{display:block;margin:0 auto 12px;width:clamp(46px,4.2vw,64px);height:auto}
.gaps .node h3{font-size:1rem;font-weight:600;color:var(--ink);margin-bottom:5px}
.gaps .node p{font-size:.86rem;color:var(--ink-2);line-height:1.45}
.gaps .brk{text-align:center}
.gaps .brk svg{display:block;margin:0 auto 7px;width:clamp(48px,4.6vw,68px);height:auto}
/* An inventory of what a warrant actually reaches: each line carries its own
   mark, and the absent ones are drawn as struck-through ghosts. */
.inv{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:clamp(7px,.9vh,11px)}
.inv li{display:flex;align-items:flex-start;gap:10px;font-size:.88rem;color:var(--ink-2);line-height:1.4}
.inv svg{flex:0 0 20px;width:20px;height:20px;margin-top:1px}
.inv.gone li{color:var(--ink-3)}
.gaps .brk span{font-family:var(--mono);font-size:.58rem;letter-spacing:.09em;text-transform:uppercase;
  color:var(--red-700);line-height:1.35;display:block}
.lock b{display:block;font-family:var(--mono);font-size:.62rem;letter-spacing:.1em;
  text-transform:uppercase;color:var(--primary-600);margin-bottom:6px}
.lock p{font-size:.84rem;color:var(--ink-2);line-height:1.45}
.step{border:1px solid var(--line);border-radius:var(--r-lg);padding:clamp(12px,1.3vw,18px);background:var(--surface);box-shadow:var(--sh-sm)}
.step b{display:block;font-family:var(--mono);font-size:.66rem;letter-spacing:.1em;color:var(--primary-600);margin-bottom:7px}
.step p{font-size:.87rem;color:var(--ink-2);line-height:1.45}
.ledger{display:grid;grid-template-columns:auto 1fr;gap:7px 16px;font-size:.9rem;align-items:baseline}
.ledger .yes{font-family:var(--mono);font-size:.72rem;color:var(--teal-700)}
.ledger .no{font-family:var(--mono);font-size:.72rem;color:var(--red)}
.ledger span:nth-child(even){color:var(--ink-2);line-height:1.45}
.toc{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--line);border-radius:var(--r-lg);
  overflow:hidden;background:var(--surface);box-shadow:var(--sh-sm)}
.toc>div{padding:clamp(14px,1.5vw,20px);border-right:1px solid var(--line)}
.toc>div:last-child{border-right:none;background:var(--primary-50)}
.toc b{display:block;font-family:var(--mono);font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--primary-600);margin-bottom:9px}
.toc p{font-size:.87rem;color:var(--ink-2);line-height:1.5;margin-bottom:7px}
.toc p:last-child{margin-bottom:0}
.quote{border-left:3px solid var(--primary-200);padding:2px 0 2px clamp(14px,1.6vw,22px)}
.quote p{font-family:var(--sans);font-weight:600;font-size:clamp(1.2rem,2.2vw,1.75rem);line-height:1.32;color:var(--ink);letter-spacing:-.02em}
.quote cite{display:block;margin-top:12px;font-style:normal;font-family:var(--mono);font-size:.66rem;letter-spacing:.05em;color:var(--ink-3)}
.byline{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;margin-top:12px;padding-top:14px;border-top:1px solid var(--line)}
.byline b{font-family:var(--sans);font-weight:600;font-size:1.02rem;color:var(--ink)}
.byline span{font-size:.9rem;color:var(--ink-3)}
.byline a{font-family:var(--mono);font-size:.86rem;color:var(--primary-600);text-decoration:none;border-bottom:1px solid var(--primary-200)}
.byline a:hover{color:var(--primary-700)}

/* Chrome. One opaque bar - no mask, no full-viewport overlay, nothing to ghost. */
.chrome{position:fixed;left:0;right:0;bottom:0;z-index:20;background:var(--surface);border-top:1px solid var(--line)}
.prog{height:2px;width:0;background:var(--primary);transition:width .34s ease}
/* .chrome-bar, not .bar: the screenshot frames already own a .bar (their fake
   browser title bar), and a bare .bar here leaked justify-content:space-between
   into every one of them, spraying the traffic-light dots across the frame. */
.chrome-bar{height:52px;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:0 clamp(14px,4vw,28px);font-family:var(--mono);font-size:.68rem;letter-spacing:.04em;color:var(--ink-3)}
.chrome-bar .wm{color:var(--ink-2);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chrome-bar .wm b{color:var(--primary-600)}
.chrome-bar .meta{white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}
.nav{display:flex;gap:6px}
.nav button{font-family:var(--mono);font-size:.8rem;color:var(--ink-2);background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r-sm);width:44px;height:44px;cursor:pointer;transition:.15s}
.nav button:hover{color:var(--primary-700);border-color:var(--primary-200);background:var(--primary-50)}
.zone{position:fixed;top:0;bottom:54px;width:17%;z-index:10;cursor:pointer;touch-action:pan-y}
.zone.l{left:0}.zone.r{right:0}
:focus-visible{outline:2px solid var(--primary-600);outline-offset:3px}

@media (max-width:900px){
  .two,.three,.four,.flow,.toc,.lock{grid-template-columns:1fr}
  /* Stacked, the broken links sit between the parties as they do across. */
  .gaps{grid-template-columns:1fr}
  .gaps .brk svg{width:56px}
  /* Each lockbox panel turns into a row - small drawing beside its text -
     rather than four full-width illustrations stacked down the phone. */
  .lock .p{flex-direction:row;align-items:center;gap:14px}
  .lock .art{width:124px;flex:0 0 124px;max-width:none;margin:0}
  /* .toc was left at three columns on every width, which nothing caught because
     it only clips below about 360px - at 320px its third column ran 27px past
     the viewport. Stacked, its column rules have to become row rules. */
  .toc>div{border-right:none;border-bottom:1px solid var(--line)}
  .toc>div:last-child{border-bottom:none}
  .shot{display:none}
  /* The page scrolls now, so a tall slide makes the document taller instead of
     being clipped inside a nested scroller. */
  .slide{justify-content:flex-start;padding-top:clamp(28px,5vh,48px)}
  .zone{display:none}
  .chrome-bar .wm{display:none}
}
/* Under ~360px the section name and its separator are the first thing to go,
   so the slide counter always stays legible. */
@media (max-width:360px){
  .chrome-bar .sec,.chrome-bar .dot{display:none}
}
@media (prefers-reduced-motion:reduce){
  .slide.active{animation:none}.pulse{animation:none}.prog{transition:none}
}
`;

// ---- Lockbox diagram --------------------------------------------------------
// Four drawings for the anonymous-request slide. Plain geometry, no <text>: the
// labels live in the HTML beside each panel, so they stay selectable, translate
// with the page and do not need the webfont to have loaded.
const C = {
  ink: '#9ca3af',
  line: '#e5e7eb',
  dash: '#cbd5e1',
  box: '#b4d3f5',
  lid: '#dbeafe',
  blue: '#2e6eb5',
  seal: '#0c2d52',
  blueD: '#164a84',
  blueL: '#4a90d9',
  key: '#1d5a9e',
  teal: '#14b8a6',
  amber: '#d97706',
  amberL: '#fcd34d',
  amberBg: '#fffbeb',
  red: '#dc2626',
  red7: '#b91c1c',
  tint: '#f0f7ff',
  page: '#f9fafb',
};

// A closed padlock: shackle down into both shoulders of the body.
const padlock = (x, y, fill, sc = 1) =>
  `<g transform="translate(${x},${y}) scale(${sc})">
     <path d="M5 10V7.5a5 5 0 0 1 10 0V10" fill="none" stroke="${fill}" stroke-width="2.6" stroke-linecap="round"/>
     <rect x="0" y="10" width="20" height="15" rx="3.5" fill="${fill}"/>
     <circle cx="10" cy="16" r="2" fill="#fff"/><rect x="9" y="16" width="2" height="4.5" rx="1" fill="#fff"/>
   </g>`;

// The same padlock sprung: the left leg of the shackle has lifted clear.
const padlockOpen = (x, y, fill, sc = 1) =>
  `<g transform="translate(${x},${y}) scale(${sc})">
     <path d="M15 10V7a5 5 0 0 0-10 0" fill="none" stroke="${fill}" stroke-width="2.6" stroke-linecap="round"/>
     <rect x="0" y="10" width="20" height="15" rx="3.5" fill="${fill}"/>
     <circle cx="10" cy="16" r="2" fill="#fff"/><rect x="9" y="16" width="2" height="4.5" rx="1" fill="#fff"/>
   </g>`;

const key = (x, y, stroke, sc = 1) =>
  `<g transform="translate(${x},${y}) scale(${sc})">
     <circle cx="4.5" cy="4.5" r="3.6" fill="none" stroke="${stroke}" stroke-width="2.1"/>
     <path d="M8.3 4.5h9.4m-3.4 0v3.2m3.4-3.2v3.9" fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round"/>
   </g>`;

const arrow = (x, y, len = 14) =>
  `<path d="M${x} ${y}h${len}m-4.5-4.5 4.5 4.5-4.5 4.5" fill="none" stroke="${C.ink}"
     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;

// A key copy, shut behind one group's padlock. The colour varies per group only
// to make "one each, and different" legible at a glance.
const wrapped = (x, y, lock) =>
  `<g transform="translate(${x},${y})">
     <rect x="0" y="0" width="52" height="40" rx="7" fill="${C.tint}" stroke="${C.box}" stroke-width="2"/>
     ${key(7, 13, C.key)}
     ${padlock(32, 9, lock, 0.62)}
   </g>`;

const svg = (label, body) =>
  `<svg class="art" viewBox="0 0 200 132" role="img" aria-label="${label}">${body}</svg>`;

const ART_SEAL = `
  <rect x="6" y="12" width="34" height="44" rx="4" fill="#fff" stroke="${C.line}" stroke-width="2"/>
  <path d="M14 24h18M14 32h18M14 40h11" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>
  ${arrow(48, 34)}
  <rect x="74" y="22" width="72" height="38" rx="5" fill="#fff" stroke="${C.box}" stroke-width="2"/>
  <rect x="70" y="14" width="80" height="12" rx="4" fill="${C.lid}" stroke="${C.box}" stroke-width="2"/>
  ${padlock(100, 28, C.seal)}
  ${wrapped(6, 82, C.blue)}
  ${wrapped(74, 82, C.blueL)}
  ${wrapped(142, 82, C.blueD)}
`;

const ART_SERVER = `
  <rect x="5" y="8" width="190" height="116" rx="12" fill="${C.page}" stroke="${C.dash}"
    stroke-width="2" stroke-dasharray="7 6"/>
  <rect x="22" y="34" width="66" height="34" rx="5" fill="#fff" stroke="${C.box}" stroke-width="2"/>
  <rect x="18" y="26" width="74" height="12" rx="4" fill="${C.lid}" stroke="${C.box}" stroke-width="2"/>
  ${padlock(45, 40, C.seal, 0.85)}
  <g transform="translate(110,24)">
    <rect x="0" y="0" width="64" height="22" rx="6" fill="#fff" stroke="${C.box}" stroke-width="2"/>
    ${padlock(7, 3, C.blue, 0.62)}<path d="M28 11h26" stroke="${C.lid}" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g transform="translate(110,52)">
    <rect x="0" y="0" width="64" height="22" rx="6" fill="#fff" stroke="${C.box}" stroke-width="2"/>
    ${padlock(7, 3, C.blueL, 0.62)}<path d="M28 11h26" stroke="${C.lid}" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g transform="translate(110,80)">
    <rect x="0" y="0" width="64" height="22" rx="6" fill="#fff" stroke="${C.box}" stroke-width="2"/>
    ${padlock(7, 3, C.blueD, 0.62)}<path d="M28 11h26" stroke="${C.lid}" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g transform="translate(24,80)">
    ${key(0, 0, C.ink, 1.5)}
    <path d="M-5 21 35-7" stroke="${C.red7}" stroke-width="3.4" stroke-linecap="round"/>
  </g>
`;

const ART_OPEN = `
  <rect x="6" y="14" width="62" height="26" rx="8" fill="#fff" stroke="${C.line}" stroke-width="2"/>
  <circle cx="18" cy="27" r="3.2" fill="${C.ink}"/><circle cx="30" cy="27" r="3.2" fill="${C.ink}"/>
  <circle cx="42" cy="27" r="3.2" fill="${C.ink}"/><circle cx="54" cy="27" r="3.2" fill="${C.ink}"/>
  ${arrow(74, 27, 10)}
  ${key(92, 22, C.key)}
  ${arrow(122, 27, 10)}
  ${padlockOpen(148, 14, C.blue)}
  <g transform="translate(40,64)">
    <rect x="0" y="1" width="86" height="11" rx="4" fill="${C.lid}" stroke="${C.box}"
      stroke-width="2" transform="rotate(-15 5 7)"/>
    <rect x="0" y="14" width="86" height="42" rx="5" fill="#fff" stroke="${C.box}" stroke-width="2"/>
    <path d="M12 28h32M12 37h24" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="54" y="24" width="26" height="18" rx="6" fill="${C.amberBg}" stroke="${C.amberL}" stroke-width="2"/>
    <path d="M60 33h14" stroke="${C.amber}" stroke-width="2.4" stroke-linecap="round"/>
  </g>
`;

const ART_OFF = `
  <rect x="6" y="22" width="64" height="44" rx="10" fill="#fff" stroke="${C.line}" stroke-width="2"/>
  <path d="M18 38h40M18 50h26" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>
  <rect x="130" y="22" width="64" height="44" rx="10" fill="#fff" stroke="${C.line}" stroke-width="2"/>
  <path d="M142 38h40M142 50h26" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M70 44h60" stroke="${C.amber}" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="82" y="34" width="36" height="20" rx="6" fill="${C.amberBg}" stroke="${C.amberL}" stroke-width="2"/>
  <path d="M89 44h22" stroke="${C.amber}" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="52" y="88" width="96" height="30" rx="9" fill="none" stroke="${C.dash}"
    stroke-width="2" stroke-dasharray="7 6"/>
  <path d="M84 103h32" stroke="${C.dash}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M76 116 124 90" stroke="${C.red}" stroke-width="2.6" stroke-linecap="round"/>
`;

// ---- The two coordination failures -----------------------------------------
// Money pools in one place, local knowledge sits in another, and the people who
// need both cannot safely reach either. Three parties, two broken links.
const ICON_HUB = `
  <path d="M12 26v9c0 4.1 9 7.5 20 7.5s20-3.4 20-7.5v-9" fill="#fff" stroke="${C.box}" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="32" cy="26" rx="20" ry="7.5" fill="#fff" stroke="${C.box}" stroke-width="2.5"/>
  <path d="M12 13v9c0 4.1 9 7.5 20 7.5s20-3.4 20-7.5v-9" fill="#fff" stroke="${C.box}" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="32" cy="13" rx="20" ry="7.5" fill="${C.lid}" stroke="${C.box}" stroke-width="2.5"/>`;

const ICON_GROUP = `
  <path d="M28 17 18 33M36 17 46 33M21 40h22" stroke="${C.box}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="32" cy="12" r="7.5" fill="${C.lid}" stroke="${C.box}" stroke-width="2.5"/>
  <circle cx="14" cy="40" r="7.5" fill="#fff" stroke="${C.box}" stroke-width="2.5"/>
  <circle cx="50" cy="40" r="7.5" fill="#fff" stroke="${C.box}" stroke-width="2.5"/>`;

const ICON_PERSON = `
  <circle cx="32" cy="16" r="9" fill="#fff" stroke="${C.box}" stroke-width="2.5"/>
  <path d="M14 46v-2c0-9.9 8-18 18-18s18 8.1 18 18v2" fill="#fff" stroke="${C.box}"
    stroke-width="2.5" stroke-linecap="round"/>`;

const BREAK = `<svg viewBox="0 0 72 40" role="img" aria-label="A connection broken in the middle.">
  <path d="M3 20h20M49 20h20" stroke="${C.dash}" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M29 30 35 10M39 30 45 10" stroke="${C.red7}" stroke-width="3.2" stroke-linecap="round"/>
</svg>`;

const node = (icon, alt, title, body) =>
  `<div class="node"><svg viewBox="0 0 64 56" role="img" aria-label="${alt}">${icon}</svg>
   <h3>${title}</h3><p>${body}</p></div>`;

const brk = (label) => `<div class="brk">${BREAK}<span>${label}</span></div>`;

// ---- Warrant inventory ------------------------------------------------------
// One mark per line, so the shape of the answer is legible before the words are.
const I = (body) => `<svg viewBox="0 0 22 22" aria-hidden="true">${body}</svg>`;
const I_LOCK = I(`<path d="M7 9.5V7a4 4 0 0 1 8 0v2.5" fill="none" stroke="${C.blue}" stroke-width="2"/>
  <rect x="4" y="9.5" width="14" height="9.5" rx="2.5" fill="${C.blue}"/>`);
const I_LIST = I(`<path d="M3 6h16M3 11h16M3 16h10" stroke="${C.blue}" stroke-width="2" stroke-linecap="round"/>`);
const I_BARS = I(`<path d="M5 18v-6M11 18V5M17 18v-9" stroke="${C.blue}" stroke-width="2.6" stroke-linecap="round"/>`);
const I_PIN = I(`<path d="M11 19s6-6.2 6-10a6 6 0 1 0-12 0c0 3.8 6 10 6 10z" fill="none" stroke="${C.blue}" stroke-width="2"/>
  <circle cx="11" cy="9" r="2.2" fill="${C.blue}"/>`);
const I_GONE = I(`<rect x="3" y="5" width="16" height="12" rx="3" fill="none" stroke="${C.dash}"
    stroke-width="2" stroke-dasharray="4 3"/><path d="M5.5 17 16.5 5" stroke="${C.red7}" stroke-width="2.2" stroke-linecap="round"/>`);

const I_PERSON_SM = I(`<circle cx="11" cy="7.5" r="3.6" fill="none" stroke="${C.blue}" stroke-width="2"/>
  <path d="M4.5 18.5v-1a6.5 6.5 0 0 1 13 0v1" fill="none" stroke="${C.blue}" stroke-width="2" stroke-linecap="round"/>`);

const has = (icon, text) => `<li>${icon}<span>${text}</span></li>`;
const gone = (text) => `<li>${I_GONE}<span>${text}</span></li>`;

const lockArt = (label, body, alt, art) =>
  `<div class="p">${svg(alt, art)}<div><b>${label}</b><p>${body}</p></div></div>`;

function frame(src, label, h) {
  if (!src) return '';
  return `<figure class="shot"${h ? ` style="--h:${h}"` : ''}>
    <div class="bar"><span></span><span></span><span></span><em>${label}</em></div>
    <div class="shotimg"><img src="${src}" alt="${label}"></div>
  </figure>`;
}

// ---- Slides -----------------------------------------------------------------
const slides = [
  // 1 TITLE
  `<section class="slide" data-name="Relay">
    <div class="stack">
      <div class="badge"><span class="pulse"></span> RELAYFUNDS.ORG &nbsp;&middot;&nbsp; BUILT AND DEPLOYED &middot; ONE CONTRIBUTOR &middot; LOOKING FOR PEOPLE, NOT MONEY</div>
      <h1 class="k h-xl">The money exists. It cannot <span class="hl">find the people doing the work</span>.</h1>
      <p class="lede">Mutual aid is neighbors covering each other's costs directly - a block, a church, a school group, putting money together for someone's rent, power bill or groceries. Larger funds raise money centrally to back that work. Today the two sides find each other by word of mouth, or not at all.</p>
      <p class="lede">Relay is that missing connection. Someone can ask a group for help without leaving a trail, and Relay never decides who deserves aid and never touches the money.</p>
      <div class="row" style="margin-top:4px">
        <span class="chip"><b>Encrypted</b>&nbsp; so only the group can read it</span>
        <span class="chip"><b>No accounts</b>&nbsp; for people asking for help</span>
        <span class="chip"><b>Open source</b>&nbsp; nobody can take it private</span>
        <span class="chip"><b>EN / ES</b></span>
      </div>
    </div>
  </section>`,

  // 2 THE GROUP
  `<section class="slide" data-name="Who this is for">
    <div class="stack">
      <span class="eyebrow">Who this is for</span>
      <h2 class="k h-lg">A block. A church basement. A <span class="hl">school parents' group</span>.</h2>
      <div class="cols two">
        <div class="stack gap-s">
          <p class="lede">They know who on their block is behind on rent, whose power is about to be cut, which family stopped answering the door. They are good at the part that is hard to systematize.</p>
          <p class="lede">What they do not have is a way to reach the fund that would cover it - without already knowing somebody who knows somebody. So the money sits in one place and the knowledge sits in another.</p>
        </div>
        <div class="card accent">
          <h3>Relay deals with groups, never with individuals</h3>
          <p>Relay works at group level and nowhere else. Groups are accountable for the money, groups make every distribution decision, groups hold the local relationships. Relay's whole job is to stop the introduction being a prerequisite.</p>
          <p style="margin-top:10px">That is also why it can afford to know nothing about the people receiving aid.</p>
        </div>
      </div>
      <p class="src">docs/problem_brief.md describes mutual aid in the U.S., and specifically in Minnesota, as operating through block-level, school-based, church-based and informal networks, with money easier to raise centrally and aid better distributed locally. No group has joined Relay yet - see slide 12.</p>
    </div>
  </section>`,

  // 3 PROBLEM
  `<section class="slide" data-name="The problem">
    <div class="stack">
      <span class="eyebrow">Two coordination failures</span>
      <h2 class="k h-lg">Not a fundraising problem. A <span class="hl">discovery and trust</span> problem.</h2>
      <p class="lede">Money pools in one place. Local knowledge sits in another. Neither
        link between them is safe to cross.</p>
      <div class="gaps">
        ${node(ICON_HUB, 'A stack of pooled coins.', 'Fund hubs',
          'An organization that raises money centrally - a solidarity fund, a bail fund, a foundation. No safe way to tell which local groups are real.')}
        ${brk('No safe<br>introduction')}
        ${node(ICON_GROUP, 'Three people joined into a small network.', 'Local groups',
          'Know exactly who needs what. Reachable only by word of mouth and DMs.')}
        ${brk('No safe<br>way to search')}
        ${node(ICON_PERSON, 'A single person.', 'People in crisis',
          'Will not leave a traceable record just to look for help.')}
      </div>
      <p class="small" style="margin-top:2px"><b>The one outside signal Relay has:</b> a sitting state legislator, approached independently, named the absence of a safe way to find local aid as her most pressing need. Unattributed here until she agrees to be named.</p>
      <p class="small muted">Both failures fall hardest on the people with the most to lose: undocumented residents, people fleeing violence, anyone for whom a database row is a risk.</p>
    </div>
  </section>`,

  // 4 WHY NOW
  `<section class="slide" data-name="Why now">
    <div class="stack">
      <span class="eyebrow">Why now</span>
      <h2 class="k h-lg">The risk here is not hypothetical. <span class="warn">Organizers are being prosecuted.</span></h2>
      <div class="cols three" style="margin-top:4px">
        <div class="card flag">
          <h3>Charity fraud and money laundering charges</h3>
          <p>Three Atlanta Solidarity Fund organizers were arrested in May 2023 over what Nonprofit Quarterly describes as routine nonprofit reimbursements. The money laundering charges were dropped in September 2024; racketeering charges remain, under a 61-defendant indictment brought using RICO, a law written to prosecute organized crime.</p>
        </div>
        <div class="card flag">
          <h3>The apps people use to send money keep records</h3>
          <p>Tax reporting rules on money-sharing apps put a record behind ordinary transfers between neighbors - the exact way most mutual aid moves money today.</p>
        </div>
        <div class="card flag">
          <h3>Organizers fear being changed by the money</h3>
          <p>Organizers worry that foundation structure and its compliance rules blunt the work. Any tool arriving in this space is judged against that suspicion, and should be.</p>
        </div>
      </div>
      <div class="quote" style="margin-top:8px">
        <p>The sector's own recommendations to mutual aid funds include decentralized organizing to reduce surveillance vulnerability, and parallel structures where visibility is a risk.</p>
        <cite>Nonprofit Quarterly, "Protecting Solidarity: Countering Attacks on Mutual Aid Funds" &middot; Relay's design brief, arrived at independently</cite>
      </div>
    </div>
  </section>`,

  // 5 THE CONSTRAINT
  `<section class="slide" data-name="The constraint">
    <div class="stack">
      <span class="eyebrow">Why this is hard to build</span>
      <h2 class="k h-lg">Every obvious solution makes people <span class="hl">less safe</span>.</h2>
      <p class="lede">A directory that logs searches. An intake form that stores a phone number. A tracking script recording who visited. Each is standard practice, and each manufactures a record that can be leaked, scraped, or lawfully demanded.</p>
      <div class="cols three" style="margin-top:6px">
        <div class="card"><h3>Assume it will be taken</h3><p>The premise is that the database will one day be read by someone hostile. Not that it might be - that it will.</p></div>
        <div class="card"><h3>Do not collect it in the first place</h3><p>Data never collected cannot be leaked. Relay holds no individual records to secure in the first place.</p></div>
        <div class="card"><h3>Verify without paperwork</h3><p>A fund hub approves them, another group vouches for them, or an established organization refers them. Three light paths. No IDs, no rosters, no documents.</p></div>
      </div>
    </div>
  </section>`,

  // 6 WHAT IT IS
  `<section class="slide" data-name="What Relay is">
    <div class="stack">
      <span class="eyebrow">Scope, stated narrowly on purpose</span>
      <h2 class="k h-lg">A thin layer between funds and groups. <span class="hl">Nothing more.</span></h2>
      <div class="cols two">
        <div class="ledger">
          <span class="yes">IS</span><span>A list of local groups, each vouched for by someone, that anyone can search with no account and nothing recorded about the search</span>
          <span class="yes">IS</span><span>A way for a group to ask a fund for money, and for the fund to answer. Never for a person to ask</span>
          <span class="yes">IS</span><span>A way to ask nearby groups for help without saying who you are</span>
          <span class="no">NOT</span><span>A judge of who deserves help. Relay never makes that decision</span>
          <span class="no">NOT</span><span>Anywhere along the path the money takes. It never passes through Relay</span>
          <span class="no">NOT</span><span>A caseworker system, or a benefits application</span>
          <span class="no">NOT</span><span>A database of people who needed help</span>
        </div>
        ${frame(IMG.home, 'relayfunds.org', 'clamp(180px,40vh,420px)')}
      </div>
    </div>
  </section>`,

  // 7 HOW IT WORKS
  `<section class="slide" data-name="How it works">
    <div class="stack">
      <span class="eyebrow">How it is meant to work</span>
      <h2 class="k h-md">Take away the need to know somebody, and <span class="hl">what already exists works better</span>.</h2>
      <div class="toc" style="margin-top:6px">
        <div>
          <b>What it does</b>
          <p>A searchable list of groups that someone has vouched for.</p>
          <p>A way for groups to ask funds for money, and to see what happened to the request.</p>
          <p>A way to ask for help anonymously, delivered only to groups working in that area.</p>
        </div>
        <div>
          <b>What that changes</b>
          <p>Groups reach hubs without a personal introduction.</p>
          <p>Hubs vet groups without collecting sensitive documents.</p>
          <p>People reach groups without creating a traceable record.</p>
        </div>
        <div>
          <b>What that leads to</b>
          <p>More groups connected to funds, and funds moving faster.</p>
          <p>Aid reaches people who currently go without because searching for it is itself a risk.</p>
          <p>Nothing new created that could be used to watch people.</p>
        </div>
      </div>
      <p class="small muted" style="margin-top:4px">Relay changes nothing about how groups do their work, or who they decide to help. It only changes how they and the money find each other, which is why this is short.</p>
    </div>
  </section>`,

  // 8 GROUPS AND HUBS
  `<section class="slide" data-name="Groups and hubs">
    <div class="stack">
      <span class="eyebrow">How groups get funded</span>
      <h2 class="k h-md">Groups get funded without knowing the right person.</h2>
      <div class="flow" style="margin-top:4px">
        <div class="step"><b>01 &middot; JOIN</b><p>A group registers with a name that may be a pseudonym, a service area, aid categories, and a contact address - a shared team one is what groups are asked for. Nothing else.</p></div>
        <div class="step"><b>02 &middot; VERIFY</b><p>A fund hub approves, another group vouches, or an established organization refers. No documents at any point.</p></div>
        <div class="step"><b>03 &middot; REQUEST</b><p>An amount, a category, a region. Justification is optional and warns against personal detail.</p></div>
        <div class="step"><b>04 &middot; TRACK</b><p>Submitted, approved, funds sent, acknowledged. No receipts, no narratives, no recipient data.</p></div>
      </div>
      <div class="cols two" style="margin-top:8px;align-items:start">
        ${frame(IMG.verification, 'Hub verification queue', 'clamp(140px,26vh,280px)')}
        ${frame(IMG.reports, 'Totals, never individuals', 'clamp(140px,26vh,280px)')}
      </div>
      <p class="src">Hubs get totals by category, groups supported, and time to funding. A per-person figure is not withheld - it cannot be produced, because the data to produce it is never collected.</p>
    </div>
  </section>`,

  // 9 ANONYMOUS REQUESTS
  `<section class="slide" data-name="Anonymous requests">
    <div class="stack">
      <span class="eyebrow">How someone asks for help &middot; the hard one</span>
      <h2 class="k h-md">Someone asks for help, and Relay never learns who they are.</h2>
      <p class="lede">One lockbox. One key, copied and padlocked once per group.
        Relay holds all of it and can open none of it.</p>
      <div class="lock">
        ${lockArt(
          'ON THEIR DEVICE',
          'Sealed in the browser. One copy of the key is locked for each group serving the area.',
          'A written message is sealed inside a lockbox, and the key to that box is copied three times, each copy shut behind a different group\'s padlock.',
          ART_SEAL
        )}
        ${lockArt(
          'ON THE SERVER',
          'Relay holds what it cannot open. No account, no cookie, no IP on this route.',
          'Relay\'s store holds the sealed lockbox and the locked key copies. A key symbol struck through shows Relay holds no key to any of them.',
          ART_SERVER
        )}
        ${lockArt(
          "ON THE GROUP'S DEVICE",
          'The group passphrase opens their copy of the key, and only theirs.',
          'A passphrase produces the group key, which springs open that group\'s padlock and then the lockbox, revealing the message and a safe-word tag.',
          ART_OPEN
        )}
        ${lockArt(
          'OFF RELAY ENTIRELY',
          'They talk directly. The safe word proves the call is genuine.',
          'Two parties talk directly, with the safe word passing between them. Relay is drawn below as an empty dashed outline, struck through, because it is not part of the exchange.',
          ART_OFF
        )}
      </div>
      <p class="src">TweetNaCl: secretbox for the payload, box for per-group key wrapping with a fresh ephemeral keypair each time. Group keys derive from a coordinator passphrase via PBKDF2-HMAC-SHA256 at 600,000 iterations, and the passphrase never leaves the browser. An independent expert reviewed the cryptography and found the design sound - that review is not yet written up in the repository (issue #14), which makes it the one claim on this slide you cannot check for yourself.</p>
    </div>
  </section>`,

  // 10 SUBPOENA
  `<section class="slide" data-name="Under subpoena">
    <div class="stack">
      <span class="eyebrow">The test that matters</span>
      <h2 class="k h-lg">Served with a warrant, Relay produces <span class="hl">nothing about the people it serves</span>.</h2>
      <div class="cols two" style="margin-top:4px">
        <div class="card accent">
          <h3>What is there</h3>
          <ul class="inv">
            ${has(I_LOCK, 'Encrypted blobs nobody at Relay can open')}
            ${has(I_LIST, 'A public list of groups that consented to be listed')}
            ${has(I_BARS, 'Group-level funding amounts and dates')}
            ${has(I_PIN, 'Coarse region and aid category per request')}
            ${has(I_PERSON_SM, 'Organizer accounts: an email, and which group they work with')}
          </ul>
        </div>
        <div class="card">
          <h3>What is not there</h3>
          <ul class="inv gone">
            ${gone('Names, addresses, phones or emails of anyone asking for help - their contact details sit inside the encrypted message Relay cannot open')}
            ${gone('Individual accounts')}
            ${gone('IP addresses or cookies, for anyone at all - none reaches the database or the application logs, and nothing whatever is recorded when someone asks for help or browses the directory')}
            ${gone('Any record of who browsed the directory')}
            ${gone('Any record of who received what')}
          </ul>
        </div>
      </div>
      <div class="row" style="margin-top:6px">
        <span class="chip"><b>Deleted</b>&nbsp; requests go once confirmed, or after seven days</span>
        <span class="chip"><b>Hashed</b>&nbsp; every credential at rest</span>
        <span class="chip"><b>Open source</b>&nbsp; every claim here can be checked in the code</span>
      </div>
      <p class="small muted" style="margin-top:2px">The known limit, stated because a partner should press on it: coarse routing metadata - region and aid category - is stored in the clear so requests can be delivered at all. It is written down in public alongside the code, rather than glossed over.</p>
    </div>
  </section>`,

  // 11 WHAT EXISTS
  `<section class="slide" data-name="What exists">
    <div class="stack">
      <span class="eyebrow">Not a concept</span>
      <h2 class="k h-lg">Built, deployed, and <span class="hl">open to inspection</span>.</h2>
      <div class="row" style="margin-top:2px;gap:clamp(20px,3vw,54px)">
        <div class="stat"><span class="n">${routeCount}</span><span class="l">screens across four roles</span></div>
        <div class="stat"><span class="n">${testCount}</span><span class="l">automated tests</span></div>
        <div class="stat"><span class="n">${ciJobCount}</span><span class="l">automated checks on every change</span></div>
        <div class="stat"><span class="n">EN / ES</span><span class="l">every screen, both languages</span></div>
      </div>
      <div class="cols two" style="margin-top:8px;align-items:start">
        ${frame(IMG.directory, 'Public group directory', 'clamp(150px,30vh,320px)')}
        ${frame(IMG.queue, 'Hub funding queue', 'clamp(150px,30vh,320px)')}
      </div>
      <p class="src">Live at relayfunds.org. For anyone who wants the technical detail: React, Node and PostgreSQL on a single server. Every pull request runs lint, typecheck, both test suites, a migrations job diffing the applied schema against the definitions, container builds, dependency audit, CodeQL and Trivy.</p>
    </div>
  </section>`,

  // 12 HONEST STATUS
  `<section class="slide" data-name="Where it stands">
    <div class="stack">
      <span class="eyebrow">Where it actually stands</span>
      <h2 class="k h-lg">No pilot has run. <span class="warn">Nobody has used this yet.</span></h2>
      <p class="lede">The build is real and the production database holds zero records, because no group has joined yet. Nor can one be listed until a fund hub verifies it: both the public directory and the routing of encrypted requests only ever surface groups a hub has approved, so the first hub unlocks both halves at once. Saying so plainly is the point - a project asking to be trusted with other people's safety does not get to overstate itself.</p>
      <div class="cols three" style="margin-top:6px">
        <div class="card flag"><h3>Paused February 2026</h3><p>Development stopped after the last planned build phase shipped, and restarted in August 2026 to repair the deployment and clear the open issues.</p></div>
        <div class="card flag"><h3>Single host, no alerting</h3><p>One rented server, running everything. An outage earlier this year was found by hand, not by a monitor.</p></div>
        <div class="card flag"><h3>The nonprofit is intended, not formed</h3><p>Mythic Works LLC is building Relay and means to transfer it to a 501(c)(3). That entity is not incorporated anywhere yet, which is one of the reasons this deck is not asking anyone for money.</p></div>
      </div>
      <p class="small muted" style="margin-top:2px">Where a limitation is an engineering problem it is a numbered issue in the public tracker, including the uncomfortable ones. Being paused, and having no nonprofit yet, are facts about the project rather than bugs, so they are not. What that buys a partner: the thing you would be piloting exists today and can be examined line by line, rather than described.</p>
    </div>
  </section>`,

  // 13 THE PILOT
  `<section class="slide" data-name="The pilot">
    <div class="stack">
      <span class="eyebrow">The ask, concretely</span>
      <h2 class="k h-lg">One hub. Three to five groups. <span class="hl">Thirty to forty-five days.</span></h2>
      <div class="cols two" style="margin-top:4px">
        <div class="stack gap-s">
          <p class="small"><b style="color:var(--ink)">A partner provides:</b> one fund hub willing to route real money through the workflow, introductions to three to five local groups, and honest feedback when it does not work.</p>
          <p class="small"><b style="color:var(--ink)">Relay provides:</b> the software, help getting groups set up, support throughout, and someone to run the pilot. No cost to participants.</p>
          <p class="small"><b style="color:var(--ink)">Participation is opt-in and endable by any party at any time.</b> If it does not clearly help, it stops - written into the proposal, not implied.</p>
        </div>
        <div class="card">
          <h3>It succeeded if</h3>
          <div class="dl" style="margin-top:10px">
            <dt>01</dt><dd>A group connected to a hub without a personal introduction</dd>
            <dt>02</dt><dd>Someone asked for help without identifying themselves</dd>
            <dt>03</dt><dd>A group reached that person, verified by safe word</dd>
            <dt>04</dt><dd>Funds moved faster than they did before</dd>
            <dt>05</dt><dd>Participants say it felt safer than the tools it replaced</dd>
            <dt>06</dt><dd>Nobody asked for recipient data, because nothing needed it</dd>
          </div>
        </div>
      </div>
    </div>
  </section>`,

  // 14 WHAT IS MISSING
  `<section class="slide" data-name="What is missing">
    <div class="stack">
      <span class="eyebrow">What is missing</span>
      <h2 class="k h-lg">The hard part is built. What is missing is <span class="hl">people</span>.</h2>
      <p class="lede">One person has written all of it. Everything on the previous slides was made by that one person, which is why the engineering is the part that is finished and everything else is not.</p>
      <div class="cols four" style="margin-top:6px">
        <div class="card accent">
          <h3>Someone with roots in mutual aid</h3>
          <p>The thing everything else waits on, and the one part that cannot be coded around. Relationships with hubs and groups, and the standing to say to organizers that this is safe to try.</p>
        </div>
        <div class="card accent">
          <h3>Someone to build the organization</h3>
          <p>The 501(c)(3) is intended and not incorporated. Formation, a board, the operating and governance side. Nobody is doing this today.</p>
        </div>
        <div class="card">
          <h3>Engineers</h3>
          <p>${OPEN_ISSUES ? `${OPEN_ISSUES} known problems, every one of them written down in public` : 'Every known gap is a public issue'}. About a third of the server code is covered by tests, the browser side only where the encryption lives, and nothing watches the site for outages.</p>
        </div>
        <div class="card">
          <h3>Someone trying to break it</h3>
          <p>The cryptography has been independently reviewed once. The application around it has not, and that is where this kind of design usually fails.</p>
        </div>
      </div>
      <p class="small muted" style="margin-top:2px">This is a co-founder conversation, not a volunteer listing. The entity does not exist yet, which means what it looks like and who runs it are still genuinely open.</p>
    </div>
  </section>`,

  // 15 NEXT
  `<section class="slide" data-name="Next">
    <div class="stack">
      <span class="eyebrow">Next</span>
      <h2 class="k h-lg">Two conversations worth having: <span class="hl">a hub, and a co-founder</span>.</h2>
      <div class="cols three" style="margin-top:6px">
        <div class="card"><h3>Try it</h3><p>A fund hub routes one cycle of real requests through it, or a network signs three to five local groups up.</p></div>
        <div class="card accent"><h3>Join it</h3><p>Come in as a co-founder on the organizing, the organization, or the engineering. See the previous slide for where the holes are.</p></div>
        <div class="card"><h3>Pass it on</h3><p>An introduction to one hub is worth more right now than anything else anyone could offer.</p></div>
      </div>
      <div class="cols two" style="margin-top:8px;align-items:start">
        <div class="card accent">
          <h3>Nobody is asking you for money</h3>
          <p>Relay is not fundraising. Mythic Works LLC is building it and intends to transfer it to a 501(c)(3), which is not incorporated yet - and until there is a pilot worth pointing at, there is nothing worth raising against.</p>
          <p style="margin-top:10px">The license already makes the give-away partly irreversible. Relay is AGPL-3.0, which means the code cannot be made private by anyone - including whoever owns it - and anyone can inspect it or run their own copy.</p>
        </div>
        <div class="card">
          <h3>What you would be joining</h3>
          <p>Real code, deployed, open, and reviewed. No users, no revenue, no staff, and a nonprofit that has not been formed. A single small server and the builder's time is the entire cost base, carried directly.</p>
          <p style="margin-top:10px">Everything about the organization is still open, which is the argument for coming in now rather than later.</p>
        </div>
      </div>
      <div class="row" style="margin-top:10px;align-items:center">
        <span class="chip"><b>relayfunds.org</b></span>
        <span class="chip"><b>github.com/Flatts3000/relay</b></span>
      </div>
      <div class="byline">
        <b>Jason Flatford</b>
        <span>Built Relay. The one contributor on slide 14.</span>
        <a href="mailto:flatts.scg@gmail.com">flatts.scg@gmail.com</a>
      </div>
    </div>
  </section>`,
];

// ---- Shell ------------------------------------------------------------------
const JS = `
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var prog=document.querySelector('.prog'),counter=document.querySelector('.counter'),sec=document.querySelector('.sec');
  var i=0,n=slides.length,swiped=false;
  function show(next){
    next=Math.max(0,Math.min(n-1,next));
    slides.forEach(function(s){s.classList.remove('active')});
    slides[next].classList.add('active');
    // The document scrolls now rather than each slide, so a long slide would
    // otherwise hand the next one its scroll position and open it part way down.
    if(next!==i)window.scrollTo(0,0);
    i=next;
    prog.style.width=((i+1)/n*100)+'%';
    counter.textContent=('0'+(i+1)).slice(-2)+' / '+('0'+n).slice(-2);
    sec.textContent=slides[i].getAttribute('data-name')||'';
    if(location.hash!=='#'+(i+1))history.replaceState(null,'','#'+(i+1));
  }
  function go(d){show(i+d)}
  // Space and PageDown page through a tall slide before they advance.
  // Advancing on the first press was right when the deck was a fixed, clipped
  // box and nothing ever scrolled. Now a slide taller than the viewport extends
  // the document, and jumping immediately would silently skip everything still
  // below the fold - on a 390x700 phone that was 368px of unread slide 4.
  // The arrows still advance at once; they are the deliberate "next" gesture.
  function atBottom(){return window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2}
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'){e.preventDefault();go(1)}
    else if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}
    else if(e.key==='PageDown'||e.key===' '){if(!atBottom())return;e.preventDefault();go(1)}
    else if(e.key==='PageUp'){if(window.scrollY>2)return;e.preventDefault();go(-1)}
    else if(e.key==='Home'){show(0)}else if(e.key==='End'){show(n-1)}
  });
  document.querySelector('.zone.l').addEventListener('click',function(){if(!swiped)go(-1)});
  document.querySelector('.zone.r').addEventListener('click',function(){if(!swiped)go(1)});
  document.querySelector('.nav .p').addEventListener('click',function(){go(-1)});
  document.querySelector('.nav .nx').addEventListener('click',function(){go(1)});
  // A swipe must not also register as a tap. touchstart is passive, so nothing
  // calls preventDefault, and a drag beginning and ending inside a .zone still
  // synthesises a click on it - advancing twice. swiped suppresses the click
  // that immediately follows. The vertical guard stops a scroll with sideways
  // drift changing slide on mobile, where slides scroll.
  var sx=null, sy=null;
  document.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
  document.addEventListener('touchend',function(e){
    if(sx===null)return;
    var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){swiped=true;go(dx<0?1:-1);setTimeout(function(){swiped=false},400)}
    sx=null;sy=null;
  },{passive:true});
  var h=parseInt((location.hash||'').replace('#',''),10);
  show(isNaN(h)?0:h-1);
})();
`;

const HTML = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Relay - Partner and Funder Overview</title>
<style>${CSS}</style>
</head>
<body>
<main class="deck">
  ${slides.join('\n')}
</main>
<div class="zone l" aria-hidden="true"></div>
<div class="zone r" aria-hidden="true"></div>
<div class="chrome">
  <div class="prog"></div>
  <div class="chrome-bar">
    <span class="wm">Relay<b>.</b> <span class="muted">connecting local groups and the funds behind them</span></span>
    <nav class="nav"><button class="p" aria-label="Previous slide">&larr;</button><button class="nx" aria-label="Next slide">&rarr;</button></nav>
    <span class="meta"><span class="sec"></span><span class="dot"> &nbsp;&middot;&nbsp; </span><span class="counter"></span></span>
  </div>
</div>
<script>${JS}</script>
</body></html>`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, HTML);
console.log(
  'wrote frontend/public/deck/index.html:',
  Math.round(HTML.length / 1024),
  'KB,',
  slides.length,
  'slides  ->  served at /deck'
);
