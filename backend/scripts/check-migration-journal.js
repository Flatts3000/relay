#!/usr/bin/env node
/**
 * Fails if any migration in drizzle/ is missing from meta/_journal.json.
 *
 * drizzle-kit migrate applies only what the journal lists. Migrations 0003,
 * 0004 and 0005 were hand-written and never journaled, so for six months every
 * deploy silently skipped them and a database provisioned by deploy.sh was
 * missing the entire broadcast feature, the multi-hub tables and onboarding.
 * Nothing surfaced that: the migrate step reported success each time, because
 * from its point of view there was nothing left to apply.
 *
 * A file on disk that no deploy will ever run is the failure mode this guards.
 * See issue #26.
 *
 * It also sanity-checks the snapshots drizzle-kit generate diffs against.
 * Snapshots are not read by migrate - they cannot break a deploy - but a stale or
 * unreadable one makes generate emit a migration that re-creates everything added
 * since, which fails on any database that already has it. See issue #37.
 *
 * Whether the newest snapshot is actually current is answered by running
 * generate, which CI does; this script only covers what can be checked without
 * it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const journalPath = join(drizzleDir, 'meta', '_journal.json');

const files = readdirSync(drizzleDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => f.replace(/\.sql$/, ''))
  .sort();

const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
const entries = journal.entries ?? [];
const tags = entries.map((e) => e.tag);

const problems = [];

for (const file of files) {
  if (!tags.includes(file)) {
    problems.push(`${file}.sql exists but is not in _journal.json, so it will never be applied`);
  }
}

for (const tag of tags) {
  if (!files.includes(tag)) {
    problems.push(`_journal.json lists "${tag}" but drizzle/${tag}.sql does not exist`);
  }
}

// Out-of-order indexes would apply migrations in an order nobody expects.
const indexes = entries.map((e) => e.idx);
for (let i = 0; i < indexes.length; i++) {
  if (indexes[i] !== i) {
    problems.push(`_journal.json idx values are not sequential from 0 (found ${indexes.join(', ')})`);
    break;
  }
}

// The invariant that actually decides whether a migration runs.
//
// drizzle never looks at idx. PgDialect.migrate reads the single highest
// created_at already in __drizzle_migrations and applies a migration only when
// its journal `when` exceeds that value:
//
//   if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis)
//
// So a `when` that does not increase is silently skipped on any database that
// has already migrated past it - the exact failure this script exists to catch,
// arriving through a different door. It is invisible on a fresh database,
// because lastDbMigration is undefined there and everything applies regardless.
for (let i = 1; i < entries.length; i++) {
  const prev = entries[i - 1];
  const curr = entries[i];
  if (curr.when <= prev.when) {
    problems.push(
      `"${curr.tag}" has when=${curr.when}, not greater than "${prev.tag}" (${prev.when}). ` +
        'drizzle would skip it on an already-migrated database.'
    );
  }
}

// The files drizzle-kit will treat as snapshots.
//
// Its own filter is "everything in meta/ that does not start with _", sorted,
// and it takes the last one as the baseline. Matching that exactly matters: a
// stray 0010_snapshot.json.bak sorts after the real file, silently becomes the
// baseline, and makes generate abort as malformed - while a stricter filter here
// would still report everything fine.
const metaDir = join(drizzleDir, 'meta');
const metaFiles = readdirSync(metaDir).filter((f) => !f.startsWith('_'));
const snapshots = metaFiles.slice().sort();

for (const file of metaFiles) {
  if (!/^\d{4}_snapshot\.json$/.test(file)) {
    problems.push(
      `meta/${file} is not a snapshot but drizzle-kit reads it as one; ` +
        'the lexicographically last file in meta/ becomes the generate baseline'
    );
  }
}

if (snapshots.length === 0) {
  problems.push(
    'meta/ contains no snapshot, so drizzle-kit generate has no baseline to diff ' +
      'against and would emit a migration re-creating the entire schema'
  );
}

// Parsing is guarded because a malformed snapshot is a realistic merge outcome
// on a file this size, and an uncaught SyntaxError would kill the script with a
// stack trace, discarding every problem already collected.
for (const file of snapshots) {
  try {
    JSON.parse(readFileSync(join(metaDir, file), 'utf8'));
  } catch (err) {
    problems.push(`meta/${file} is not valid JSON (${err.message})`);
  }
}

// Deliberately not re-implementing the prevId chain check here. `drizzle-kit
// check` already does exactly that - same grouping, same collision report - and
// exits non-zero, so db:check-journal runs it rather than a hand-rolled copy
// that would drift from the tool it models.
//
// Nor does this script assert that the newest migration has a snapshot named
// after it. generate writes a snapshot only when the schema actually changed, so
// a data-only migration - 0010 is one - can never have a matching file, and
// demanding one would be a check with no achievable remedy. What actually
// matters is that the newest snapshot still reflects the current schema, and the
// only thing that can answer that is generate itself: CI runs it and fails if it
// wants to write anything.

if (problems.length > 0) {
  console.error('Migration journal is inconsistent:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nEvery .sql file in drizzle/ needs a matching journal entry, or');
  console.error('drizzle-kit migrate will skip it and the deploy will report success.');
  process.exit(1);
}

console.log(
  `Migration journal OK: ${files.length} migrations, all journaled, ` +
    'sequential, and strictly increasing in `when`; ' +
    `${snapshots.length} snapshot(s) in meta/, all parseable.`
);
