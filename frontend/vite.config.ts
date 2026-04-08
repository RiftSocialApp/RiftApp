import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';

const vendorChunks: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom'],
  'vendor-motion': ['framer-motion'],
  'vendor-livekit': ['livekit-client'],
  'vendor-misc': ['zustand', 'date-fns'],
};

const electronEmbed = process.env.VITE_ELECTRON_EMBED === '1';
const deployedAt = new Date().toISOString();
const frontendPackage = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf8'),
) as { version?: string };
const frontendVersion = typeof frontendPackage.version === 'string' ? frontendPackage.version : '0.0.0';

export default defineConfig({
  base: electronEmbed ? './' : '/',
  define: {
    __RIFT_DEPLOYED_AT__: JSON.stringify(deployedAt),
    __RIFT_FRONTEND_VERSION__: JSON.stringify(frontendVersion),
    __RIFT_FRONTEND_BUILD_ID__: JSON.stringify(deployedAt),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          for (const [chunk, deps] of Object.entries(vendorChunks)) {
            if (deps.some((dep) => id.includes(`/node_modules/${dep}/`))) {
              return chunk;
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
