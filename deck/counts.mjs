/**
 * The figures on the deck's "what exists" slide, read off the repository.
 *
 * Shared by build.mjs, which writes them into the deck, and check-counts.mjs,
 * which CI runs to catch the committed deck drifting away from the tree. Both
 * import from here so there is one definition of each number rather than two
 * that can disagree.
 *
 * The deck previously carried hand-written figures and went out claiming 187
 * automated tests and 11 open issues while the tree held 188 and 10.
 */
import fs from 'fs';
import path from 'path';

// Matches a test that actually runs. `.skip` and `.todo` are deliberately not
// here: they do not execute, and "automated tests" is a claim about what runs.
const TEST_DECL = /^\s*(it|test)(\.(only|concurrent))?\s*\(/gm;

// `.each` runs N cases from one declaration, so counting it as 1 would
// understate the total. Nothing in the tree uses it today; if that changes the
// count stops being trustworthy and this file has to grow a real parser.
const EACH_FORM = /^\s*(it|test)\.each[\s(`[]/m;

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else onFile(full, entry.name);
  }
}

export function countTests(root) {
  let total = 0;
  for (const workspace of ['backend', 'frontend']) {
    walk(path.join(root, workspace, 'src'), (full, name) => {
      if (!/\.(test|spec)\.tsx?$/.test(name)) return;
      const src = fs.readFileSync(full, 'utf8');
      if (EACH_FORM.test(src)) {
        throw new Error(
          `${full} uses it.each/test.each, which runs several cases from one ` +
            'declaration. The deck counts declarations, so the figure would be ' +
            'wrong. Teach deck/counts.mjs to expand it before shipping the deck.'
        );
      }
      total += (src.match(TEST_DECL) || []).length;
    });
  }
  return total;
}

export function countRoutes(root) {
  const src = fs.readFileSync(path.join(root, 'frontend', 'src', 'App.tsx'), 'utf8');
  let count = 0;
  for (const line of src.split('\n')) {
    const match = line.match(/path="([^"]+)"/);
    if (!match) continue;
    // "*" is the not-found catch-all. Anything behind import.meta.env.DEV never
    // ships, so it is not a screen anyone using the product can reach. Reading
    // that guard off the source keeps this right when a second dev-only route
    // appears, which hardcoding today's one route would not.
    if (match[1] === '*' || line.includes('import.meta.env.DEV')) continue;
    count += 1;
  }
  return count;
}

export function countCiJobs(root) {
  const yml = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const afterJobs = yml.split(/^jobs:\s*$/m)[1] ?? '';
  return (afterJobs.match(/^ {2}[A-Za-z][\w-]*:\s*$/gm) || []).length;
}

/**
 * All three, with floors.
 *
 * A broken pattern would otherwise ship "0 automated tests", which is worse than
 * the stale figure this replaced: a reader can discount a number that is merely
 * out of date, but a confident zero reads as the truth. The floors sit far below
 * the real values and far above anything a broken pattern produces. Drift of one
 * or two is caught by check-counts.mjs in CI, not by these.
 */
export function countAll(root) {
  const counts = {
    tests: countTests(root),
    routes: countRoutes(root),
    ciJobs: countCiJobs(root),
  };
  for (const [label, value, floor] of [
    ['tests', counts.tests, 50],
    ['routes', counts.routes, 10],
    ['CI jobs', counts.ciJobs, 5],
  ]) {
    if (value < floor) {
      throw new Error(
        `Counted only ${value} ${label}, below the sanity floor of ${floor}. The ` +
          'pattern that counts them has probably stopped matching. Fix the pattern ' +
          'rather than lowering the floor - this number goes in front of partners.'
      );
    }
  }
  return counts;
}
