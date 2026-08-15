import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            'codemirror',
            '@codemirror/lang-javascript',
            '@codemirror/theme-one-dark',
            '@codemirror/state',
            '@codemirror/view',
          ],
          parser: ['acorn'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
