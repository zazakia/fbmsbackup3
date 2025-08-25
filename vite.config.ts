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
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000, // 30 seconds timeout per test
    hookTimeout: 10000, // 10 seconds timeout for setup/teardown hooks
    teardownTimeout: 5000, // 5 seconds for teardown
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/'
      ]
    },
    define: {
      'import.meta.env.TEST': true
    }
  }
});