import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    open: true,
    hmr: {
      clientPort: 3000
    }
  },
  optimizeDeps: {
    include: ['lucide-react', 'zustand', 'date-fns'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          charts: ['recharts'],
          store: ['zustand'],
          utils: ['date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './src/__tests__/utils/TestEnvironment.ts'],
    testTimeout: 30000, // 30 seconds timeout per test
    hookTimeout: 10000, // 10 seconds timeout for setup/teardown hooks
    teardownTimeout: 5000, // 5 seconds for teardown
    // Enhanced test configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.git/',
      'src/test/manual/',
      'src/test/examples/'
    ],
    // Coverage configuration with enhanced settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      reportOnFailure: true,
      all: true,
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 75,
        statements: 80
      },
      // Enhanced exclusion patterns
      exclude: [
        'node_modules/',
        'src/test/',
        'src/demo/',
        'src/__tests__/examples/',
        'src/__tests__/manual/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
        '**/*.stories.{js,ts,jsx,tsx}',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        'src/types/',
        'src/utils/constants.ts',
        'src/main.tsx'
      ],
      // Include specific patterns for better coverage
      include: [
        'src/api/**',
        'src/components/**',
        'src/services/**',
        'src/store/**',
        'src/utils/**',
        'src/hooks/**'
      ]
    },
    // Environment variables for testing
    define: {
      'import.meta.env.TEST': true,
      'import.meta.env.VITE_SUPABASE_URL': '"http://localhost:54321"',
      'import.meta.env.VITE_SUPABASE_ANON_KEY': '"test-key"'
    },
    // Test reporters
    reporters: ['verbose', 'json', 'html'],
    // Global test setup
    globalSetup: './src/__tests__/config/globalSetup.ts',
    // Enhanced watch mode
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.log'
    ],
    // Retry configuration for flaky tests
    retry: 2,
    // Bail on first failure in CI
    bail: process.env.CI ? 1 : 0
  }
});