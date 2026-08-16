import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasm()],
  server: {
    port: 3000,
    open: true,
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['quickjs-emscripten'],
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
