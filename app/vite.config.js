import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Compila directament a l'arrel del repo (GitHub Pages serveix la branca main /).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '..', emptyOutDir: false, chunkSizeWarningLimit: 1200 },
});
