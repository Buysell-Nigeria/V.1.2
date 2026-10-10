import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // This monorepo also installs Vite 7 for the legacy app; avoid mixing its\n  // incompatible Rollup typings with this standalone Vite 8 plugin.\n  plugins: [react() as any],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://buysell-api-v2.onrender.com',
        secure: true,
        changeOrigin: true,
      },
    },
  },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
