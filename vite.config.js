import { defineConfig } from 'vite'

export default defineConfig({
  // Development server config
  server: {
    port: 3000,
    open: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        // Preserve file names for CSV/JSON files for easier debugging
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.csv') || assetInfo.name?.endsWith('.json')) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  
  // Public directory for static assets (CSV, JSON data files)
  publicDir: 'public',
  
  // Base path for deployment (GitHub Pages)
  base: './',
  
  // Asset handling
  assetsInclude: ['**/*.csv', '**/*.json']
})