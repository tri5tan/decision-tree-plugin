import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.jsx'),
      name: 'CTDecisionTreeAdmin',
      formats: ['iife'],
      fileName: () => 'admin.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'admin-[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist/ between builds
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    target: 'es2015',
  },
});
