import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Node environment for API route + library tests
    environment: 'node',

    // Global test APIs (describe, test, expect) without imports
    globals: true,

    // Test file patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Setup files (runs before each test file)
    setupFiles: ['./vitest.setup.ts'],

    // Timeout for async tests (Shamir stress test needs extra time)
    testTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/__tests__/**',
        'node_modules/**',
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
