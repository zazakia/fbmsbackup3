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
    include: [
      'lucide-react',
      'zustand',
      'date-fns',
      'recharts',
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/realtime-js',
      '@supabase/storage-js',
      '@supabase/auth-js'
    ],
    esbuildOptions: { mainFields: ['browser', 'module', 'main'] }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('zustand')) {
              return 'vendor-store';
            }
            if (id.includes('date-fns')) {
              return 'vendor-utils';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            return 'vendor-misc';
          }

          // Application chunks
          if (id.includes('src/components/bir/')) {
            return 'chunk-bir';
          }
          if (id.includes('src/components/admin/')) {
            return 'chunk-admin';
          }
          if (id.includes('src/components/accounting/')) {
            return 'chunk-accounting';
          }
          if (id.includes('src/components/reports/')) {
            return 'chunk-reports';
          }
          if (id.includes('src/api/')) {
            return 'chunk-api';
          }
          if (id.includes('src/utils/')) {
            return 'chunk-utils';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500, // Reduced from 1000 to catch large chunks
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    reportCompressedSize: true
  },
  esbuild: {
    drop: ['console', 'debugger'], // Remove console logs in production
    legalComments: 'none' // Remove legal comments to reduce size
  },

  define: {
    global: 'globalThis', // Fix global is not defined error
    'process.env': {} // Fix process is not defined error
  },
  ssr: {
    noExternal: ['@supabase/supabase-js']
  },
  resolve: {
    alias: {
      '@supabase/node-fetch': '@supabase/node-fetch/browser.js',
      '@supabase/node-fetch/lib/index.js': '@supabase/node-fetch/browser.js',
      '@supabase/node-fetch/lib/index.mjs': '@supabase/node-fetch/browser.js',
      '@supabase/node-fetch/lib/index.es.js': '@supabase/node-fetch/browser.js'
    },
    mainFields: ['browser', 'module', 'main'],
    conditions: ['browser', 'import', 'module', 'default']
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
    },
    define: {
      'import.meta.env.TEST': true
    }
  }
});