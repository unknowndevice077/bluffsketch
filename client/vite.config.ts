import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devServerTarget = env.DEV_SERVER_TARGET || 'http://localhost:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Consume shared TypeScript source directly so edits hot-reload.
        '@bluffsketch/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Same-origin in dev: lets phones on your LAN play via http://<your-ip>:5173.
        '/socket.io': { target: devServerTarget, ws: true, changeOrigin: true },
      },
    },
    build: {
      target: 'es2020',
      sourcemap: true,
    },
  };
});
