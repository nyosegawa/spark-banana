import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // workspace-level config
    include: ['packages/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
