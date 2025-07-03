import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
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
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/'
      ]
    }
  }
});