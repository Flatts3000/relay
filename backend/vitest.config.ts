import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // These are integration tests sharing one database, and teardown truncates
    // the whole schema. Vitest runs test files in parallel by default, which
    // would have one file wiping another file's fixtures mid-run and contending
    // on ACCESS EXCLUSIVE locks. Run files serially instead.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Without this only files a test imports are instrumented, because Vitest 4
      // removed coverage.all and `include` has no default. That makes the
      // threshold below almost useless as a ratchet: a wholly untested new
      // service would not appear in the report at all, so the percentages would
      // stay flat or rise while coverage actually fell. The frontend config
      // already carried this note; the backend did not.
      include: ['src/**/*.ts'],
      exclude: ['node_modules/**', 'src/test/**', '**/*.d.ts', '**/*.test.ts', 'drizzle/**'],
      // A floor with headroom, enforced in CI. Stronger than the 60 configured
      // here before, which nothing ever ran, so it failed on every local
      // invocation and blocked nothing.
      //
      // Measured 2026-08-29 with `include` above: 33.55 / 21.50 / 38.79 / 33.85.
      // Set several points below that on purpose. Pinned to the exact figure,
      // adding four uncovered branches anywhere - a couple of defensive guards
      // in an already-tested file - would fail CI on an unrelated change, which
      // teaches people to route around the gate rather than respect it.
      //
      // This is a ratchet. Raise it as coverage climbs.
      thresholds: {
        statements: 30,
        branches: 18,
        functions: 35,
        lines: 30,
      },
    },
  },
});
