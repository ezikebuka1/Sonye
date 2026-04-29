import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // WebKit / iPhone 14 — catches iOS Safari-specific event-handling
      // bugs that Chromium/Blink silently hides (e.g. type="submit" outside
      // a form, touch event pipeline differences). Added after M2.2 device
      // bug where all 12 Chromium tests passed but Join button was silent
      // on a real iPhone. Run: npx playwright test --project=webkit-iphone
      name: 'webkit-iphone',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
