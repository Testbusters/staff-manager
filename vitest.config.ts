import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    exclude: ['e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/route.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/**/*.spec.ts',
        'lib/**/*.d.ts',
        'lib/supabase/**',
      ],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 8,
        statements: 7,
        functions: 11,
        branches: 5,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
