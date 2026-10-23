import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // SPA ходить на /api/*, Vite проксює на бекенд без префікса: CORS у розробці не потрібен
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
