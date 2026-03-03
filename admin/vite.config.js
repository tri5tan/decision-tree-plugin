import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3737,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'src/index.jsx'),
        viewer: resolve(__dirname, 'src/viewer-entry.jsx'),
      },
      output: {
        // Force chunks into root dist/, not dist/assets/
        chunkFileNames: '[name]-[hash].js',
        // Predictable filenames
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // React Flow is large
    chunkSizeWarningLimit: 1000,
    target: 'es2015',
    cssCodeSplit: false,
  },
});
