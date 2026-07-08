import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Pinned to 1 UNCONDITIONALLY (2026-07-08). The live-session specs share a
  // single local Supabase DB and reuse throwaway phones across files
  // (+15555550102 / +15555550199 / +15555550198). Parallel workers let two
  // files seed/teardown that shared state at the same time → duplicate-key +
  // FK-teardown collisions. Serial execution makes each file seed → run →
  // tear down before the next starts; the bare `npx playwright test` is now
  // THE documented invocation (no --workers flag, no per-file dance).
  workers: 1,
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
