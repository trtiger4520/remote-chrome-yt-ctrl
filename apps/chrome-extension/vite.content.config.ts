import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../../artifacts/chrome-extension',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content-script.ts'),
      formats: ['iife'],
      name: 'RemoteYouTubeContentScript',
      fileName: () => 'content-script.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
