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
