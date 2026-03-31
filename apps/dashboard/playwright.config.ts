import { defineConfig, devices } from '@playwright/test';

/**
 * Project Truth — Playwright E2E Configuration
 *
 * Faz 0 setup: Chromium only, headless, dev server on port 3000.
 * WebServer auto-starts `next dev` if not already running.
 *
 * Run: npm run test:e2e
 * Run with UI: npm run test:e2e:ui
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Global setup/teardown
  globalSetup: './e2e/global-setup.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI (resource constraints)
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  // Shared settings for all projects
  use: {
    // Base URL — Next.js dev server
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Timeout per action (click, fill, etc.)
    actionTimeout: 10_000,

    // Locale
    locale: 'en-US',
  },

  // Global timeout per test
  timeout: 30_000,

  // Expect timeout
  expect: {
    timeout: 10_000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit can be added later for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // Mobile viewport test
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Run local dev server before starting tests
  // IMPORTANT: Start `npm run dev` in a separate terminal BEFORE running tests.
  // Playwright will reuse the existing server (reuseExistingServer: true).
  // On CI, it starts its own `next start` (requires pre-built with `npm run build`).
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000/en/landing',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
