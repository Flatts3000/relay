import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 3000 and 4000 are what the rest of the repo assumes: the backend's own
    // default port, .env.example, docker-compose, CORS_ORIGIN, FRONTEND_URL and
    // the magic-link emails built from it. They stay the defaults so `npm run
    // dev` works on a fresh clone.
    //
    // Overridable for anyone running several projects side by side. Vite does
    // not read the repo-root .env, so these must be exported in the shell:
    //   FRONTEND_PORT=3021 BACKEND_URL=http://localhost:8004 npm run dev
    // and the backend needs PORT, CORS_ORIGIN and FRONTEND_URL to match.
    port: Number(process.env['FRONTEND_PORT'] ?? 3000),
    // Fail rather than wander. Vite's default is to walk to the next free port
    // when this one is taken, which on a machine running several projects means
    // silently squatting on a port another project has registered - and the only
    // symptom is that project's dev server refusing to start later, somewhere
    // else entirely. Better to stop here and say so.
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env['BACKEND_URL'] ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Vitest 4 removed coverage.all, which defaulted to true in v1 and pulled
      // in every source file. Without an explicit include, only files touched by
      // a test are instrumented - and with no test files at all that is nothing,
      // so the thresholds below would compare against 0/0 and silently pass.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // Per-file rather than global.
      //
      // A global figure here would be meaningless: two of roughly a hundred
      // frontend files have tests, so any honest global number is ~2% and any
      // aspirational one fails every run - which is how the previous 60 came to
      // be ignored entirely, since nothing invoked `test:coverage`.
      //
      // What matters is that the client-side encryption path does not regress.
      // These two modules hold the product's central privacy claim, are at 100%
      // on all four metrics, and are enforced at 95 so a single defensive branch
      // does not fail the build while a genuine gap still does.
      //
      // Add entries here as other areas gain tests, and add a global floor once
      // there is a real one to hold. See #6.
      thresholds: {
        // A global floor low enough to be honest about a frontend with two
        // tested files, and high enough to be a canary.
        //
        // It exists because a per-file glob that matches nothing passes
        // silently: Vitest builds an empty coverage map and istanbul reports
        // 100% for a total of zero. So renaming either module below, or a typo
        // in its key, would remove the only enforced gate in this workspace with
        // no signal whatsoever. If that happens the global figure collapses
        // towards zero and this catches it.
        //
        // Measured 2026-08-29 at 1.90 / 0.56 / 1.79 / 1.97.
        statements: 1.5,
        branches: 0.4,
        functions: 1.4,
        lines: 1.5,

        'src/utils/broadcast-crypto.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        'src/utils/group-key.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
