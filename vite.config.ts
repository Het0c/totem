import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const octoprintUrl = env.OCTOPRINT_URL?.trim().replace(/\/+$/, '');
  const apiKey = env.OCTOPRINT_API_KEY?.trim();

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 1420,
      strictPort: true,
      proxy: octoprintUrl ? {
        '/octoprint': {
          target: octoprintUrl,
          changeOrigin: true,
          headers: apiKey ? { 'X-Api-Key': apiKey } : undefined,
          rewrite: (path) => path.replace(/^\/octoprint/, ''),
        },
      } : undefined,
    },
  };
});
