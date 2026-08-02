import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@game': fileURLToPath(new URL('./src/game', import.meta.url)),
      '@map': fileURLToPath(new URL('./src/map', import.meta.url)),
      '@contracts': fileURLToPath(new URL('./src/contracts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
