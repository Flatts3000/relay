/**
 * Checks that the committed deck still tells the truth about the repository.
 *
 * `frontend/public/deck/index.html` is a committed artifact served at /deck, and
 * nothing regenerated it automatically - so moving the counts in build.mjs from
 * hand-written to computed only fixed the figures at the moment someone
 * remembered to run the build. One merged test and the deck is wrong again,
 * which is the exact defect that put "187 automated tests" in front of readers
 * while the tree held 188.
 *
 * This deliberately does NOT rebuild and byte-compare. The build fetches
 * webfonts from Google and re-encodes screenshots with sharp, so a byte
 * comparison would fail on a font revision or a sharp upgrade - neither of which
 * says anything about whether the deck is accurate. Comparing the figures is
 * both deterministic and the thing actually worth protecting.
 *
 *   node deck/check-counts.mjs
 */
import fs from 'fs';
import path from 'path';
import { countAll } from './counts.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DECK = path.join(ROOT, 'frontend', 'public', 'deck', 'index.html');

if (!fs.existsSync(DECK)) {
  console.error(`Missing ${path.relative(ROOT, DECK)}. Run: node deck/build.mjs`);
  process.exit(1);
}

const html = fs.readFileSync(DECK, 'utf8');

// The stat block on the "what exists" slide.
const published = new Map(
  [...html.matchAll(/<span class="n">([^<]+)<\/span><span class="l">([^<]+)<\/span>/g)].map((m) => [
    m[2],
    m[1],
  ])
);

const counts = countAll(ROOT);
const expected = [
  ['automated tests', String(counts.tests)],
  ['screens across four roles', String(counts.routes)],
  ['automated checks on every change', String(counts.ciJobs)],
];

const problems = [];
for (const [label, value] of expected) {
  const found = published.get(label);
  if (found === undefined) problems.push(`the deck has no "${label}" figure at all`);
  else if (found !== value) problems.push(`"${label}": deck says ${found}, repository says ${value}`);
}

if (problems.length > 0) {
  console.error('The committed deck disagrees with the repository:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\nRebuild it and commit the result:\n' +
      '  npm i sharp --no-save && node deck/build.mjs\n\n' +
      'These figures are shown to partners as evidence the project is what it ' +
      'says it is, so a stale one costs more than the rebuild does.'
  );
  process.exit(1);
}

console.log(
  `Deck figures match: ${counts.tests} tests, ${counts.routes} screens, ${counts.ciJobs} checks.`
);
