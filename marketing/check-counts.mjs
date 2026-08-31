/**
 * Checks that the committed marketing pages still tell the truth about the
 * repository.
 *
 * Same reasoning as deck/check-counts.mjs, and the same defect it was written
 * for. The pages under frontend/public/<slug>/ are committed artifacts served
 * to the public, and nothing regenerates them automatically. Computing the
 * figures in build.mjs rather than typing them only fixes them at the moment
 * somebody remembers to run the build; one merged test puts the tree at 192 and
 * leaves four public pages claiming 191.
 *
 * These pages carry the figures in front of funders and organizers as evidence
 * the project is what it says it is, so a stale one costs more than a rebuild.
 *
 *   node marketing/check-counts.mjs
 */
import fs from 'fs';
import path from 'path';
import { countAll } from '../deck/counts.mjs';
import { PAGES } from './pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'frontend', 'public');

const counts = countAll(ROOT);
const expected = [
  ['automated tests', String(counts.tests)],
  ['screens across four roles', String(counts.routes)],
  ['automated checks on every change', String(counts.ciJobs)],
];

const problems = [];
let checked = 0;

for (const page of PAGES) {
  const file = path.join(PUBLIC, page.slug, 'index.html');
  if (!fs.existsSync(file)) {
    problems.push(`/${page.slug}/ has not been built at all`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');

  // Only the pages that actually carry a stat row are checked. Not every page
  // has one, and demanding the figures appear everywhere would force them onto
  // /need-help, where a reader in a crisis has no use for a test count.
  const published = new Map(
    [...html.matchAll(/<span class="n">([^<]+)<\/span><span class="l">([^<]+)<\/span>/g)].map(
      (m) => [m[2], m[1]]
    )
  );
  if (published.size === 0) continue;
  checked += 1;

  for (const [label, value] of expected) {
    const found = published.get(label);
    if (found === undefined) problems.push(`/${page.slug}/ has no "${label}" figure`);
    else if (found !== value) {
      problems.push(`/${page.slug}/ "${label}": page says ${found}, repository says ${value}`);
    }
  }
}

// A build that silently stopped emitting stat rows would otherwise pass this
// check by having nothing to disagree with.
if (checked === 0) {
  problems.push('no marketing page carries a stat row, so nothing was actually verified');
}

// The figures are not the only thing that can go stale. The whole point of
// these pages is that a pasted link renders with a preview image, and the build
// deletes a page's previous card whenever it writes a new one - so a rebuild
// committed with the HTML staged and frontend/public/share/ left unstaged
// leaves every og:image pointing at a file that no longer exists. Every preview
// 404s, and a check that only reads the stat row passes green while it happens.
//
// frontend/index.html is included because the build rewrites its card too, and
// it is the URL people actually paste.
const withCards = [
  ...PAGES.map((p) => [`/${p.slug}/`, path.join(PUBLIC, p.slug, 'index.html')]),
  ['frontend/index.html', path.join(ROOT, 'frontend', 'index.html')],
];

for (const [label, file] of withCards) {
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const urls = [...html.matchAll(/<meta (?:property|name)="(?:og:image|twitter:image)" content="([^"]+)"/g)];
  if (urls.length === 0) {
    problems.push(`${label} declares no share card at all`);
    continue;
  }
  // og:image and twitter:image normally name the same file; report it once.
  for (const url of new Set(urls.map((m) => m[1]))) {
    const rel = url.replace('https://relayfunds.org/', '');
    if (!fs.existsSync(path.join(PUBLIC, rel))) {
      problems.push(`${label} points at ${rel}, which is not on disk`);
    }
  }
}

if (problems.length > 0) {
  console.error('The committed marketing pages disagree with the repository:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\nRebuild them and commit the result:\n' +
      '  npm i sharp --no-save && node marketing/build.mjs\n'
  );
  process.exit(1);
}

console.log(
  `Marketing figures match on ${checked} page(s): ` +
    `${counts.tests} tests, ${counts.routes} screens, ${counts.ciJobs} checks.`
);
