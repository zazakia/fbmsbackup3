import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/regression/**/*.test.ts'],
    environment: 'node',
    setupFiles: [],
    globals: false,
    pool: 'threads',
    reporters: 'verbose',
    // keep runs deterministic and fast
    watch: false,
    isolate: true,
  },
});

