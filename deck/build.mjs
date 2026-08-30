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

// Resolved from this file, not the working directory, so `node build.mjs` from
// inside deck/ does not warn that every screenshot is missing and then write
// deck/deck/relay-deck.html while reporting success.
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
  ['Instrument+Serif', 'Instrument Serif', '400'],
  ['Inter:wght@400;500;600', 'Inter', '400 600'],
  ['JetBrains+Mono:wght@400;500;600', 'JetBrains Mono', '400 600'],
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
  help: await shot('help_broadcast_desktop_v2.png', 1000, 76),
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

// ---- Design tokens ----------------------------------------------------------
// Ground and accent come from the product's own Tailwind config: primary-700
// #164a84 and accent.teal.500 #14b8a6. Teal carries the accent because the
// product blue disappears against a dark ground.
const CSS = `
${FONT_CSS}
:root{
  --page:#060B12; --deep:#0A1420; --card:#0F1C2B; --card2:#0C1725;
  --teal:#2DD4BF; --teal-dim:#14B8A6; --teal-glow:rgba(45,212,191,.14);
  --amber:#FBBF24;
  --ink:#F1F5F9; --ink-2:#A8B8CC; --ink-3:#64788F; --line:rgba(255,255,255,.09);
  --serif:'Instrument Serif',Georgia,serif;
  --sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  --mono:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--page)}
.deck{position:fixed;inset:0;overflow:hidden;color:var(--ink);font-family:var(--sans);
  -webkit-font-smoothing:antialiased;background:
  radial-gradient(1100px 680px at 84% -12%, rgba(45,212,191,.07), transparent 60%),
  radial-gradient(900px 760px at -5% 108%, rgba(22,74,132,.30), transparent 58%),
  linear-gradient(180deg,#08111C 0%, var(--page) 62%)}
.deck::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.45;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:62px 62px;mask-image:radial-gradient(120% 88% at 50% 0%,#000 22%,transparent 74%)}
.slide{position:absolute;inset:0;display:none;flex-direction:column;justify-content:center;
  padding:clamp(26px,5.6vh,60px) clamp(28px,6.6vw,104px) clamp(60px,8vh,84px);
  opacity:0;transition:opacity .45s ease, transform .45s ease;transform:translateY(9px)}
.slide.active{display:flex;opacity:1;transform:none;z-index:2}
.slide.leaving{display:flex;opacity:0;z-index:1}
h1,h2,h3,h4,p{margin:0}
.k{font-family:var(--serif);font-weight:400;line-height:1.03;letter-spacing:-.005em;text-wrap:balance}
.h-xl{font-size:clamp(2.4rem,6.2vw,5.2rem)}
.h-lg{font-size:clamp(2rem,4.6vw,3.7rem)}
.h-md{font-size:clamp(1.6rem,3.2vw,2.5rem)}
.hl{color:var(--teal)}
.warn{color:var(--amber)}
.eyebrow{font-family:var(--mono);text-transform:uppercase;letter-spacing:.2em;font-size:.66rem;font-weight:500;color:var(--teal)}
.lede{font-size:clamp(.98rem,1.45vw,1.32rem);line-height:1.52;color:var(--ink-2);max-width:64ch}
.small{font-size:clamp(.84rem,1vw,.98rem);color:var(--ink-2);line-height:1.5}
.muted{color:var(--ink-3)}
.src{font-family:var(--mono);font-size:.62rem;color:var(--ink-3);letter-spacing:.02em;line-height:1.6}
.stack{display:flex;flex-direction:column;gap:clamp(12px,1.9vh,24px);min-height:0}
.stack.gap-s{gap:clamp(9px,1.2vh,14px)}
.row{display:flex;gap:clamp(12px,1.5vw,24px);flex-wrap:wrap}
.cols{display:grid;gap:clamp(14px,1.6vw,26px);min-height:0}
.two{grid-template-columns:1.02fr .98fr;align-items:center}
.three{grid-template-columns:repeat(3,1fr)}
.four{grid-template-columns:repeat(4,1fr)}
.chip{font-family:var(--mono);font-size:.72rem;letter-spacing:.03em;color:var(--ink);border:1px solid var(--line);
  border-radius:999px;padding:.5em 1em;background:rgba(255,255,255,.02)}
.chip b{color:var(--teal);font-weight:500}
.card{background:linear-gradient(180deg,var(--card) 0%,var(--card2) 100%);border:1px solid var(--line);
  border-radius:13px;padding:clamp(14px,1.5vw,22px)}
.card h3{font-family:var(--sans);font-weight:600;font-size:.99rem;color:var(--ink);margin-bottom:6px;line-height:1.25}
.card p{font-size:.89rem;color:var(--ink-2);line-height:1.5}
.card.accent{border-color:var(--teal-dim);background:linear-gradient(180deg,rgba(45,212,191,.13),var(--card2))}
.card.flag{border-color:rgba(251,191,36,.4);background:linear-gradient(180deg,rgba(251,191,36,.09),var(--card2))}
.card.flag h3{color:var(--amber)}
.stat .n{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:clamp(1.5rem,3vw,2.6rem);
  color:var(--teal);font-weight:600;letter-spacing:-.02em;line-height:1}
.stat .l{display:block;margin-top:7px;font-size:.7rem;letter-spacing:.03em;color:var(--ink-3);font-family:var(--mono);line-height:1.4}
.dl{display:grid;grid-template-columns:auto 1fr;gap:9px 18px;align-items:baseline}
.dl dt{font-family:var(--mono);font-size:.74rem;color:var(--teal);letter-spacing:.03em;white-space:nowrap}
.dl dd{margin:0;color:var(--ink-2);font-size:.92rem;line-height:1.45}
.badge{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;font-family:var(--mono);font-size:.7rem;
  letter-spacing:.05em;color:var(--ink-2);border:1px solid var(--line);border-radius:999px;padding:.45em .9em;
  background:rgba(255,255,255,.02);max-width:100%}
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--teal);animation:pl 2.4s ease-in-out infinite}
@keyframes pl{0%,100%{opacity:1}50%{opacity:.3}}
.todo{display:inline-block;font-family:var(--mono);font-size:.7rem;letter-spacing:.04em;color:var(--amber);
  border:1px dashed rgba(251,191,36,.55);border-radius:6px;padding:.3em .65em;background:rgba(251,191,36,.07)}
.shot{margin:0;border-radius:11px;overflow:hidden;border:1px solid var(--line);background:#08101c;
  box-shadow:0 28px 58px -28px rgba(0,0,0,.85)}
.shot .bar{display:flex;align-items:center;gap:6px;padding:8px 11px;background:#0A1524;border-bottom:1px solid var(--line)}
.shot .bar span{width:8px;height:8px;border-radius:50%;background:#22314a}
.shot .bar em{margin-left:9px;font-style:normal;font-family:var(--mono);font-size:.64rem;color:var(--ink-3)}
.shot .shotimg{height:var(--h,clamp(180px,38vh,400px));overflow:hidden;background:var(--page)}
.shot img{display:block;width:100%;height:auto;object-fit:cover;object-position:top}
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;counter-reset:s}
.step{border:1px solid var(--line);border-radius:11px;padding:clamp(12px,1.3vw,18px);background:rgba(255,255,255,.02);position:relative}
.step b{display:block;font-family:var(--mono);font-size:.66rem;letter-spacing:.1em;color:var(--teal);margin-bottom:7px}
.step p{font-size:.86rem;color:var(--ink-2);line-height:1.45}
.ledger{display:grid;grid-template-columns:auto 1fr;gap:7px 16px;font-size:.9rem;align-items:baseline}
.ledger .yes{font-family:var(--mono);font-size:.72rem;color:var(--teal)}
.ledger .no{font-family:var(--mono);font-size:.72rem;color:#F87171}
.ledger span:nth-child(even){color:var(--ink-2);line-height:1.45}
.footer{position:absolute;left:0;right:0;bottom:0;height:44px;display:flex;align-items:center;justify-content:space-between;
  padding:0 clamp(28px,6.6vw,104px);font-family:var(--mono);font-size:.68rem;letter-spacing:.05em;color:var(--ink-3);z-index:5}
.footer .wm{color:var(--ink-2);font-weight:500}
.footer .wm b{color:var(--teal)}
.prog{position:absolute;left:0;bottom:0;height:2px;background:var(--teal);transition:width .45s ease;z-index:6}
.nav{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:7}
.nav button{font-family:var(--mono);font-size:.7rem;color:var(--ink-2);background:rgba(255,255,255,.04);
  border:1px solid var(--line);border-radius:7px;width:30px;height:25px;cursor:pointer;transition:.15s}
.nav button:hover{color:var(--ink);border-color:var(--teal-dim);background:var(--teal-glow)}
/* pan-y so a vertical drag in the side strips still scrolls the slide, which
   matters under the mobile breakpoint below where .slide becomes scrollable and
   these strips cover 40% of the width. Hidden outright on small screens: swipe
   already navigates there, and the strips only get in the way. */
.zone{position:absolute;top:0;bottom:44px;width:20%;z-index:4;cursor:pointer;touch-action:pan-y}
.zone.l{left:0}.zone.r{right:0}
:focus-visible{outline:2px solid var(--teal);outline-offset:3px}
.toc{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.toc>div{padding:clamp(14px,1.5vw,20px);background:rgba(255,255,255,.02);border-right:1px solid var(--line)}
.toc>div:last-child{border-right:none;background:linear-gradient(180deg,rgba(45,212,191,.12),var(--card2))}
.toc b{display:block;font-family:var(--mono);font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);margin-bottom:9px}
.toc p{font-size:.86rem;color:var(--ink-2);line-height:1.5;margin-bottom:7px}
.toc p:last-child{margin-bottom:0}
.quote{border-left:2px solid var(--teal-dim);padding:2px 0 2px clamp(14px,1.6vw,22px)}
.quote p{font-family:var(--serif);font-size:clamp(1.25rem,2.3vw,1.9rem);line-height:1.28;color:var(--ink);letter-spacing:-.005em}
.quote cite{display:block;margin-top:12px;font-style:normal;font-family:var(--mono);font-size:.66rem;letter-spacing:.05em;color:var(--ink-3)}
.byline{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;margin-top:12px;padding-top:14px;border-top:1px solid var(--line)}
.byline b{font-family:var(--sans);font-weight:600;font-size:1.02rem;color:var(--ink)}
.byline span{font-size:.9rem;color:var(--ink-3)}
.byline a{font-family:var(--mono);font-size:.86rem;color:var(--teal);text-decoration:none;border-bottom:1px solid var(--teal-dim)}
.byline a:hover{color:var(--ink)}
@media (max-width:900px){
  .two,.three,.four,.flow{grid-template-columns:1fr}
  .shot{display:none}
  .slide{justify-content:flex-start;padding-top:56px;overflow-y:auto}
  .zone{display:none}
}
@media (prefers-reduced-motion:reduce){.slide{transition:none}.pulse{animation:none}.prog{transition:none}}
`;

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
      <h1 class="k h-xl">Infrastructure for <span class="hl">solidarity</span>, built to be useless to anyone who seizes it.</h1>
      <p class="lede">Relay connects local mutual aid groups to the funds that back them, and lets people ask those groups for help without leaving a trail. It never decides who deserves aid and never touches distribution.</p>
      <div class="row" style="margin-top:4px">
        <span class="chip"><b>E2E</b>&nbsp; encrypted requests</span>
        <span class="chip"><b>No accounts</b>&nbsp; for individuals</span>
        <span class="chip"><b>AGPL-3.0</b></span>
        <span class="chip"><b>EN / ES</b></span>
      </div>
    </div>
  </section>`,

  // 2 THE GROUP
  `<section class="slide" data-name="Who this is for">
    <div class="stack">
      <span class="eyebrow">Who this is for</span>
      <h2 class="k h-lg">Eleven neighbours and a <span class="hl">spreadsheet</span>.</h2>
      <div class="cols two">
        <div class="stack gap-s">
          <p class="lede">They know who on their block is behind on rent, whose power is about to be cut, which family stopped answering the door. They are good at the part that is hard to systematise.</p>
          <p class="lede">What they do not have is a way to reach the fund that would cover it - without already knowing somebody who knows somebody. So the money sits in one place and the knowledge sits in another.</p>
        </div>
        <div class="card accent">
          <h3>The unit of trust is the group</h3>
          <p>Relay works at group level and nowhere else. Groups are accountable for the money, groups make every distribution decision, groups hold the local relationships. Relay's whole job is to stop the introduction being a prerequisite.</p>
          <p style="margin-top:10px">That is also why it can afford to know nothing about the people receiving aid.</p>
        </div>
      </div>
      <p class="src">The pattern above is drawn from docs/problem_brief.md and is illustrative of the groups Relay is designed for. No group has been onboarded yet - see slide 12.</p>
    </div>
  </section>`,

  // 3 PROBLEM
  `<section class="slide" data-name="The problem">
    <div class="stack">
      <span class="eyebrow">Two coordination failures</span>
      <h2 class="k h-lg">Not a fundraising problem. A <span class="hl">discovery and trust</span> problem.</h2>
      <div class="cols two" style="margin-top:6px">
        <div class="card">
          <h3>Groups cannot find hubs. Hubs cannot vet groups.</h3>
          <p>Money is easier to raise centrally; aid is better distributed locally. The link between them runs on word of mouth, DMs and Google Forms. New and smaller groups never get connected, and hubs have no safe way to tell who is real without demanding paperwork that excludes exactly the groups doing the work.</p>
        </div>
        <div class="card">
          <h3>People in crisis cannot search for help safely.</h3>
          <p>Directories are fragmented, stale, or need an account. An email or phone number creates a traceable record. People avoid looking at all rather than leave a trail - so the aid exists, and does not reach them.</p>
        </div>
      </div>
      <p class="small muted" style="margin-top:2px">Both failures fall hardest on the people with the most to lose: undocumented residents, people fleeing violence, anyone for whom a database row is a risk.</p>
    </div>
  </section>`,

  // 4 WHY NOW
  `<section class="slide" data-name="Why now">
    <div class="stack">
      <span class="eyebrow">Why now</span>
      <h2 class="k h-lg">The threat model is not hypothetical. <span class="warn">Organizers are being prosecuted.</span></h2>
      <div class="cols three" style="margin-top:4px">
        <div class="card flag">
          <h3>Charity fraud and money laundering charges</h3>
          <p>Three Atlanta Solidarity Fund organizers were arrested in May 2023 over what Nonprofit Quarterly describes as routine nonprofit reimbursements. The money laundering charges were dropped in September 2024; racketeering charges under a 61-defendant RICO indictment remain outstanding.</p>
        </div>
        <div class="card flag">
          <h3>Payment rails are a surveillance layer</h3>
          <p>IRS reporting thresholds on money-sharing apps put a durable record behind ordinary transfers between neighbours - the exact mechanism most mutual aid runs on today.</p>
        </div>
        <div class="card flag">
          <h3>Co-optation is a live fear</h3>
          <p>Organizers actively worry that philanthropic structure and compliance requirements defang the work. Any tool entering this space is read against that suspicion, and should be.</p>
        </div>
      </div>
      <div class="quote" style="margin-top:8px">
        <p>The sector's own recommendations to mutual aid funds include decentralised organizing to reduce surveillance vulnerability, and parallel structures where visibility is a risk.</p>
        <cite>Nonprofit Quarterly, "Protecting Solidarity: Countering Attacks on Mutual Aid Funds" &middot; Relay's design brief, arrived at independently</cite>
      </div>
    </div>
  </section>`,

  // 5 THE CONSTRAINT
  `<section class="slide" data-name="The constraint">
    <div class="stack">
      <span class="eyebrow">Why this is hard to build</span>
      <h2 class="k h-lg">Every obvious solution makes people <span class="hl">less safe</span>.</h2>
      <p class="lede">A directory that logs searches. An intake form that stores a phone number. An analytics tag recording who visited. Each is standard practice, and each manufactures a record that can be leaked, scraped, or lawfully demanded.</p>
      <div class="cols three" style="margin-top:6px">
        <div class="card"><h3>Assume seizure</h3><p>The premise is that the database will one day be read by someone hostile. Not that it might be - that it will.</p></div>
        <div class="card"><h3>Minimise, do not protect</h3><p>Data never collected cannot be leaked. Relay holds no individual records to secure in the first place.</p></div>
        <div class="card"><h3>Verify without paperwork</h3><p>Hub approval, peer attestation, or a sponsor reference. Three lightweight paths. No IDs, no rosters, no documents.</p></div>
      </div>
    </div>
  </section>`,

  // 6 WHAT IT IS
  `<section class="slide" data-name="What Relay is">
    <div class="stack">
      <span class="eyebrow">Scope, stated narrowly on purpose</span>
      <h2 class="k h-lg">A thin coordination layer. <span class="hl">Nothing more.</span></h2>
      <div class="cols two">
        <div class="ledger">
          <span class="yes">IS</span><span>A public directory of verified groups, browsable with no account and no tracking</span>
          <span class="yes">IS</span><span>A funding request workflow between groups and hubs, at group level only</span>
          <span class="yes">IS</span><span>An anonymous, end-to-end encrypted way to ask local groups for help</span>
          <span class="no">NOT</span><span>An arbiter of who deserves aid - Relay makes no eligibility decision, ever</span>
          <span class="no">NOT</span><span>Anywhere in the distribution path - money and aid never pass through it</span>
          <span class="no">NOT</span><span>A case management or benefits system</span>
          <span class="no">NOT</span><span>A database of people who needed help</span>
        </div>
        ${frame(IMG.home, 'relayfunds.org', 'clamp(180px,40vh,420px)')}
      </div>
    </div>
  </section>`,

  // 7 THEORY OF CHANGE
  `<section class="slide" data-name="Theory of change">
    <div class="stack">
      <span class="eyebrow">Theory of change</span>
      <h2 class="k h-md">Remove the introduction requirement, and the existing system works better.</h2>
      <div class="toc" style="margin-top:6px">
        <div>
          <b>Activities</b>
          <p>A verified public directory of groups.</p>
          <p>A group-level funding request and payout workflow.</p>
          <p>Encrypted anonymous help requests routed to matching groups.</p>
        </div>
        <div>
          <b>Outputs</b>
          <p>Groups reach hubs without a personal introduction.</p>
          <p>Hubs vet groups without collecting sensitive documents.</p>
          <p>People reach groups without creating a traceable record.</p>
        </div>
        <div>
          <b>Outcomes</b>
          <p>More groups connected to funds, and funds moving faster.</p>
          <p>Aid reaches people who currently go without because searching for it is itself a risk.</p>
          <p>No new surveillance surface created in the process.</p>
        </div>
      </div>
      <p class="small muted" style="margin-top:4px">Relay changes nothing about how groups do their work or who they help. The intervention is strictly on the coordination layer, which is why the theory is short.</p>
    </div>
  </section>`,

  // 8 GROUPS AND HUBS
  `<section class="slide" data-name="Groups and hubs">
    <div class="stack">
      <span class="eyebrow">Flow one</span>
      <h2 class="k h-md">Groups get funded without knowing the right person.</h2>
      <div class="flow" style="margin-top:4px">
        <div class="step"><b>01 &middot; JOIN</b><p>A group registers with a name that may be a pseudonym, a service area, aid categories, and a role-based email. Nothing else.</p></div>
        <div class="step"><b>02 &middot; VERIFY</b><p>Hub approval, a peer group vouching, or a sponsor reference. No documents at any point.</p></div>
        <div class="step"><b>03 &middot; REQUEST</b><p>An amount, a category, a region. Justification is optional and warns against personal detail.</p></div>
        <div class="step"><b>04 &middot; TRACK</b><p>Submitted, approved, funds sent, acknowledged. No receipts, no narratives, no recipient data.</p></div>
      </div>
      <div class="cols two" style="margin-top:8px;align-items:start">
        ${frame(IMG.verification, 'Hub verification queue', 'clamp(140px,26vh,280px)')}
        ${frame(IMG.reports, 'Aggregate reporting', 'clamp(140px,26vh,280px)')}
      </div>
      <p class="src">Hubs get totals by category, groups supported, and time to funding. A per-person figure is not withheld - it cannot be produced, because the data to produce it is never collected.</p>
    </div>
  </section>`,

  // 9 ANONYMOUS REQUESTS
  `<section class="slide" data-name="Anonymous requests">
    <div class="stack">
      <span class="eyebrow">Flow two &middot; the hard one</span>
      <h2 class="k h-md">Someone asks for help, and Relay never learns who they are.</h2>
      <div class="cols two">
        <div class="flow" style="grid-template-columns:1fr">
          <div class="step"><b>ON THEIR DEVICE</b><p>They pick an area and what they need, write a message, and include a way to be reached. The browser generates a key, encrypts the message, and wraps that key separately for each verified group serving the area.</p></div>
          <div class="step"><b>ON THE SERVER</b><p>Relay stores ciphertext it cannot read, plus one wrapped key per recipient group. No account, no cookie, no IP logged on this route.</p></div>
          <div class="step"><b>ON THE GROUP'S DEVICE</b><p>A coordinator unlocks with their group passphrase and sees the message, the contact details, and a safe word.</p></div>
          <div class="step"><b>OFF RELAY ENTIRELY</b><p>The group makes contact directly and repeats the safe word, so the person knows the call is genuine. Relay is not in that conversation.</p></div>
        </div>
        <div class="stack gap-s">
          ${frame(IMG.help, 'Request help anonymously', 'clamp(190px,42vh,440px)')}
          <p class="src">TweetNaCl. secretbox for the payload, box for per-group key wrapping with a fresh ephemeral keypair each time. Group keys derive from a coordinator passphrase via PBKDF2-HMAC-SHA256 at 600,000 iterations; the passphrase never leaves the browser. Cryptography independently reviewed.</p>
        </div>
      </div>
    </div>
  </section>`,

  // 10 SUBPOENA
  `<section class="slide" data-name="Under subpoena">
    <div class="stack">
      <span class="eyebrow">The test that matters</span>
      <h2 class="k h-lg">Served with a warrant, Relay produces <span class="hl">almost nothing</span>.</h2>
      <div class="cols two" style="margin-top:4px">
        <div class="card accent">
          <h3>What is there</h3>
          <p>Encrypted blobs nobody at Relay can open. A public list of groups that already consented to being listed. Group-level funding amounts and dates. Coarse region and aid category on each request.</p>
        </div>
        <div class="card">
          <h3>What is not there</h3>
          <p>No names, addresses, phone numbers or emails of anyone seeking aid - contact details live inside the encrypted payload. No individual accounts. No IP addresses or cookies on anonymous routes. No record of who browsed the directory. No record of who received what.</p>
        </div>
      </div>
      <div class="row" style="margin-top:6px">
        <span class="chip"><b>Deleted</b>&nbsp; requests go on confirmation or at 7-day TTL</span>
        <span class="chip"><b>Hashed</b>&nbsp; every credential at rest</span>
        <span class="chip"><b>AGPL-3.0</b>&nbsp; the claims are auditable</span>
      </div>
      <p class="small muted" style="margin-top:2px">The known limit, stated because a partner should press on it: coarse routing metadata - region and aid category - is stored in the clear so requests can be delivered at all. It is documented in the repository rather than glossed.</p>
    </div>
  </section>`,

  // 11 WHAT EXISTS
  `<section class="slide" data-name="What exists">
    <div class="stack">
      <span class="eyebrow">Not a concept</span>
      <h2 class="k h-lg">Built, deployed, and <span class="hl">auditable</span>.</h2>
      <div class="row" style="margin-top:2px;gap:clamp(20px,3vw,54px)">
        <div class="stat"><span class="n">37</span><span class="l">routes across four roles</span></div>
        <div class="stat"><span class="n">187</span><span class="l">automated tests</span></div>
        <div class="stat"><span class="n">10</span><span class="l">CI jobs on every change</span></div>
        <div class="stat"><span class="n">EN / ES</span><span class="l">every screen, both languages</span></div>
      </div>
      <div class="cols two" style="margin-top:8px;align-items:start">
        ${frame(IMG.directory, 'Public group directory', 'clamp(150px,30vh,320px)')}
        ${frame(IMG.queue, 'Hub funding queue', 'clamp(150px,30vh,320px)')}
      </div>
      <p class="src">Live at relayfunds.org. React, Node and PostgreSQL on a single host behind Caddy. Every pull request runs lint, typecheck, both test suites, a migrations job diffing the applied schema against the definitions, container builds, dependency audit, CodeQL and Trivy.</p>
    </div>
  </section>`,

  // 12 HONEST STATUS
  `<section class="slide" data-name="Where it stands">
    <div class="stack">
      <span class="eyebrow">Where it actually stands</span>
      <h2 class="k h-lg">No pilot has run. <span class="warn">Nobody has used this yet.</span></h2>
      <p class="lede">The build is real and the production database holds zero records, because no group has been onboarded. Saying so plainly is the point - a project asking to be trusted with other people's safety does not get to overstate itself.</p>
      <div class="cols three" style="margin-top:6px">
        <div class="card flag"><h3>Paused February 2026</h3><p>Development stopped after the tenth phase shipped, and restarted in August 2026 to repair the deployment and work the backlog down.</p></div>
        <div class="card flag"><h3>Single host, no alerting</h3><p>One EC2 instance running Docker Compose. An outage earlier this year was found by hand, not by a monitor.</p></div>
        <div class="card flag"><h3>The nonprofit is intended, not formed</h3><p>Mythic Works LLC is building Relay and means to transfer it to a 501(c)(3). That entity is not incorporated anywhere yet, which is one of the reasons this deck is not asking anyone for money.</p></div>
      </div>
      <p class="small muted" style="margin-top:2px">Every limitation above is a numbered issue in the public tracker, including the uncomfortable ones. What that buys a partner: the thing you would be piloting exists today and can be examined line by line, rather than described.</p>
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
          <p class="small"><b style="color:var(--ink)">Relay provides:</b> the platform, onboarding, support throughout, and a facilitator. No cost to participants.</p>
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
      <p class="lede">The repository has one contributor. Everything on the previous slides was made by one person, which is why the engineering is the part that is finished and everything else is not.</p>
      <div class="cols four" style="margin-top:6px">
        <div class="card accent">
          <h3>Someone with roots in mutual aid</h3>
          <p>The binding constraint, and the one that cannot be coded around. Relationships with hubs and groups, and the standing to say to organizers that this is safe to try.</p>
        </div>
        <div class="card accent">
          <h3>Someone to build the organisation</h3>
          <p>The 501(c)(3) is intended and not incorporated. Formation, a board, the operating and governance side. Nobody is doing this today.</p>
        </div>
        <div class="card">
          <h3>Engineers</h3>
          <p>${OPEN_ISSUES ? `${OPEN_ISSUES} open issues, all public` : 'Every known gap is a public issue'}. Backend coverage around a third, frontend tested only where the encryption lives, and no monitoring at all.</p>
        </div>
        <div class="card">
          <h3>Adversarial review</h3>
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
        <div class="card"><h3>Try it</h3><p>A fund hub routes one cycle of real requests through it, or a network puts three to five groups through onboarding.</p></div>
        <div class="card accent"><h3>Join it</h3><p>Come in as a co-founder on the organising, the organisation, or the engineering. See the previous slide for where the holes are.</p></div>
        <div class="card"><h3>Pass it on</h3><p>An introduction to one hub is worth more right now than anything else anyone could offer.</p></div>
      </div>
      <div class="cols two" style="margin-top:8px;align-items:start">
        <div class="card accent">
          <h3>Nobody is asking you for money</h3>
          <p>Relay is not fundraising. Mythic Works LLC is building it and intends to transfer it to a 501(c)(3), which is not incorporated yet - and until there is a pilot worth pointing at, there is nothing worth raising against.</p>
          <p style="margin-top:10px">The AGPL-3.0 licence already makes the give-away partly irreversible: the code cannot be closed by anyone, including its current owner.</p>
        </div>
        <div class="card">
          <h3>What you would be joining</h3>
          <p>Real code, deployed, open, and reviewed. No users, no revenue, no staff, and a nonprofit that has not been formed. A single small server and the builder's time is the entire cost base, carried directly.</p>
          <p style="margin-top:10px">Everything about the organisation is still open, which is the argument for coming in now rather than later.</p>
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
    var cur=slides[i];
    slides.forEach(function(s){s.classList.remove('active','leaving')});
    if(cur!==slides[next]){cur.classList.add('leaving');setTimeout(function(){cur.classList.remove('leaving')},470)}
    slides[next].classList.add('active');
    i=next;
    prog.style.width=((i+1)/n*100)+'%';
    counter.textContent=('0'+(i+1)).slice(-2)+' / '+('0'+n).slice(-2);
    sec.textContent=slides[i].getAttribute('data-name')||'';
    if(location.hash!=='#'+(i+1))history.replaceState(null,'','#'+(i+1));
  }
  function go(d){show(i+d)}
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();go(1)}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(-1)}
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
  <div class="zone l" aria-hidden="true"></div>
  <div class="zone r" aria-hidden="true"></div>
  <div class="footer">
    <span class="wm">Relay<b>.</b> <span class="muted">a coordination layer for mutual aid</span></span>
    <span><span class="sec"></span> &nbsp;&middot;&nbsp; <span class="counter"></span></span>
  </div>
  <nav class="nav"><button class="p" aria-label="Previous slide">&larr;</button><button class="nx" aria-label="Next slide">&rarr;</button></nav>
  <div class="prog"></div>
</main>
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
