import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~bootstrap': resolve(__dirname, 'node_modules/bootstrap'),
      '~tabler': resolve(__dirname, 'node_modules/@tabler/core'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Tabler is imported via custom.scss
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/gamehub': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
