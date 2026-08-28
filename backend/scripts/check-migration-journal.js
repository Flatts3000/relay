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

if (problems.length > 0) {
  console.error('Migration journal is inconsistent:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nEvery .sql file in drizzle/ needs a matching journal entry, or');
  console.error('drizzle-kit migrate will skip it and the deploy will report success.');
  process.exit(1);
}

console.log(
  `Migration journal OK: ${files.length} migrations, all journaled, ` +
    'sequential, and strictly increasing in `when`.'
);
