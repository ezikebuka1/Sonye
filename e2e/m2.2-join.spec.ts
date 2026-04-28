import { test, expect, Page } from '@playwright/test';

/**
 * Helper: fill and submit the onboarding form with the given name.
 * Identical to the helper in m2.1-store.spec.ts — repeated here so each
 * spec file is self-contained and readable out of order.
 */
async function submitOnboarding(page: Page, name: string) {
  await page.goto('/onboarding');
  await page.getByPlaceholder('Jordan').fill(name);
  await page.getByPlaceholder('(214) 555-0123').fill('5125550123');
  await page.getByRole('button', { name: /^beginner$/i }).click();
  await page.getByRole('button', { name: /weekday evenings/i }).click();
  await page.getByRole('button', { name: /cole park/i }).click();
  await page.getByRole('button', { name: /get matched/i }).click();
  await expect(page).toHaveURL('/');
}

/**
 * Slot reference (from mockData seed):
 *   slot_a = Saturday  8:00 AM  1/6   Cole Park        intermediate
 *   slot_b = Saturday  5:00 PM  3/6   Churchill Park   advanced_beginner
 *   slot_c = Sunday    9:00 AM  5/6   Fretz Park       beginner
 *   slot_d = Sunday    4:00 PM  6/6   Cole Park        advanced   ← full
 */

test.describe('M2.2 — onJoin wiring + optimistic state', () => {

  test('AC1: unauthenticated tap on Join routes to /onboarding', async ({ page }) => {
    await page.goto('/');
    // slot_a is not full — aria-label includes "Join game on Saturday 8:00 AM"
    await page.getByRole('button', { name: /join game on saturday 8:00 am/i }).click();
    await expect(page).toHaveURL('/onboarding');
  });

  test('AC2: join a 1/6 slot → Joined button; no social proof (2/6 is still < 50%)', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');

    await page.getByRole('button', { name: /join game on saturday 8:00 am/i }).click();

    // Optimistic update fires within one frame — Joined aria-label must appear fast
    await expect(page.getByRole('button', { name: /already joined/i }).first()).toBeVisible({ timeout: 300 });

    // Simulated async resolves at ~600ms — state stays Joined
    await page.waitForTimeout(800);
    await expect(page.getByRole('button', { name: /already joined/i }).first()).toBeVisible();

    // slot_a was 1/6; after join it's 2/6 = 33% — below 50% threshold.
    // Social proof row must NOT appear.
    await expect(page.locator('text=2/6 spots filled')).not.toBeVisible();
  });

  test('AC3: join a 3/6 slot → 4/6 count shown with avatars, Joined button', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');

    // slot_b is 3/6 = 50% — social proof already visible on load.
    // After join it's 4/6 with user's avatar rightmost.
    await page.getByRole('button', { name: /join game on saturday 5:00 pm/i }).click();

    // Wait for the simulated async to settle (~600ms) plus 200ms fade-in buffer
    await page.waitForTimeout(900);

    // Count updates to 4/6
    await expect(page.locator('text=4/6 spots filled').first()).toBeVisible();

    // Button is now Joined
    await expect(page.getByRole('button', { name: /already joined/i }).first()).toBeVisible();
  });

  test('AC4: Join waitlist on a 6/6 slot → success toast appears', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');

    // slot_d is already 6/6 — button reads "Join waitlist"
    await page.getByRole('button', { name: /join waitlist for sunday 4:00 pm/i }).click();

    // Exclude Next.js's internal __next-route-announcer__ which also has role="alert".
    const toast = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('On the waitlist');
    await expect(toast).toContainText("we'll text you");
  });

  test('AC5 [LOAD-BEARING]: simulateFailure=1 → optimistic flip then rollback + error toast with Retry', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');

    // SPA-navigate to add ?simulateFailure=1 WITHOUT wiping the Zustand store.
    // page.goto() is a hard navigation — it resets the store, making joinSlot
    // a no-op (no currentUser). pushState + popstate preserves the JS context
    // while updating window.location.search, which joinSlot reads to decide
    // shouldFail. Same pattern proven in M2.1 deliberate-regression check.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/?simulateFailure=1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(100);

    await page.getByRole('button', { name: /join game on saturday 5:00 pm/i }).click();

    // Optimistic update fires immediately — button should flip to Joined
    await expect(page.getByRole('button', { name: /already joined/i }).first()).toBeVisible({ timeout: 300 });

    // After ~600ms the simulated failure fires → rollback
    await page.waitForTimeout(800);

    // "Join game" button returns (rollback succeeded)
    await expect(page.getByRole('button', { name: /join game on saturday 5:00 pm/i })).toBeVisible();

    // Error toast with Retry action — exclude Next.js route announcer (same role="alert")
    const toast = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Couldn't save that");
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('AC6: toast auto-dismisses after 5 seconds', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');

    await page.getByRole('button', { name: /join waitlist for sunday 4:00 pm/i }).click();

    // Exclude Next.js route announcer (same role="alert")
    const toast = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(toast).toBeVisible();

    // 5s auto-dismiss + 500ms buffer
    await page.waitForTimeout(5500);
    await expect(toast).not.toBeVisible();
  });

  test('AC7: hard refresh after join wipes in-memory state', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');

    await page.getByRole('button', { name: /join game on saturday 8:00 am/i }).click();
    // Wait for optimistic update to register
    await expect(page.getByRole('button', { name: /already joined/i }).first()).toBeVisible({ timeout: 800 });

    // Hard reload wipes the store entirely
    await page.reload();

    // Back to unauthenticated — banner visible, slot back to "Join game"
    await expect(page.getByTestId('onboarding-banner')).toBeVisible();
    await expect(page.getByRole('button', { name: /join game on saturday 8:00 am/i })).toBeVisible();
  });

});
