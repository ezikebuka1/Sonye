import { test, expect, Page } from '@playwright/test';

/**
 * Helper: fill and submit the onboarding form with the given name.
 * Uses placeholder selectors because the form labels are not programmatically
 * associated with inputs via htmlFor/id (chip buttons matched by visible text).
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

test.describe('M2.1 — Zustand store + name threading', () => {

  test('AC1: fresh / shows unauthenticated greeting and onboarding banner', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('onboarding-banner')).toBeVisible();
    await expect(page.locator('body')).toContainText('Hey there');
    await expect(page.locator('body')).not.toContainText('Hey Jordan');
  });

  test('AC2: submitting form threads name to home greeting', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');
    await expect(page.locator('body')).toContainText('Hey Marcus');
    await expect(page.getByTestId('onboarding-banner')).not.toBeVisible();
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('AC3: hard refresh after submit reverts to unauthenticated (in-memory store)', async ({ page }) => {
    await submitOnboarding(page, 'Marcus');
    await expect(page.locator('body')).toContainText('Hey Marcus');

    await page.reload();

    await expect(page.locator('body')).toContainText('Hey there');
    await expect(page.locator('body')).not.toContainText('Hey Marcus');
    await expect(page.getByTestId('onboarding-banner')).toBeVisible();
  });

  test('AC4: ?onboarded=1 on fresh load seeds Jordan from seedUser', async ({ page }) => {
    await page.goto('/?onboarded=1');
    await expect(page.locator('body')).toContainText('Hey Jordan');
    await expect(page.getByTestId('onboarding-banner')).not.toBeVisible();
  });

  test('AC5 [LOAD-BEARING]: ?onboarded=1 does not clobber real submitted user via SPA navigation', async ({ page }) => {
    // Submit as Alex — store now holds a real user (currentUser !== null)
    await submitOnboarding(page, 'Alex');
    await expect(page.locator('body')).toContainText('Hey Alex');

    // SPA-navigate to /?onboarded=1 via pushState + popstate.
    // This preserves the JS context (and thus the Zustand store) while
    // triggering Next.js useSearchParams to re-resolve and the
    // HomeClient useEffect to re-fire — proven via deliberate-regression
    // check during M2.1 verification: commenting out the `currentUser === null`
    // guard causes this test to fail (Alex flips to Jordan), restoring it makes
    // it pass again. page.goto() is wrong here — it hard-navigates, wiping
    // the store before the guard can run, which would test nothing.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/?onboarded=1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Guard (currentUser === null check) must block seedUser from overwriting Alex.
    await expect(page.locator('body')).toContainText('Hey Alex');
    await expect(page.locator('body')).not.toContainText('Hey Jordan');
    expect(page.url()).toContain('?onboarded=1');
  });

});
