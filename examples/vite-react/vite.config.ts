import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Monorepo dev: resolve to source for HMR
      // Not needed when installed from npm
      'spark-banana': path.resolve(__dirname, '../../packages/overlay/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
