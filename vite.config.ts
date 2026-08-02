import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@contracts': fileURLToPath(new URL('./src/contracts', import.meta.url)),
      '@game': fileURLToPath(new URL('./src/game', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
      '@map': fileURLToPath(new URL('./src/map', import.meta.url)),
      '@storage': fileURLToPath(new URL('./src/storage', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    target: 'es2022',
  },
  server: {
    fs: { strict: true },
  },
});
