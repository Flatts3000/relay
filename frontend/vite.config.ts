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
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
});
