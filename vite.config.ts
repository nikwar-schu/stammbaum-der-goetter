import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * `base: './'` haelt die Anwendung unabhaengig vom Pfad, unter dem sie liegt.
 * Zusammen mit den Raute-basierten Deep-Links laeuft derselbe Build lokal,
 * unter https://<nutzer>.github.io/<repo>/ und auf jedem anderen statischen Host.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
