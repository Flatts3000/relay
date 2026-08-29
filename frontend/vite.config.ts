import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Ports are assigned per project by the local port registry so several
    // projects can run their dev servers side by side. Overridable via env for
    // anyone whose registry hands out different numbers.
    port: Number(process.env['FRONTEND_PORT'] ?? 3021),
    proxy: {
      '/api': {
        target: process.env['BACKEND_URL'] ?? 'http://localhost:8004',
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
