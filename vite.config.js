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
    rollupOptions: {
      input: {
        main: 'index.html'
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