import { test, expect } from '@playwright/test';
import { SMS_CONSENT_LINE } from '../src/lib/consent';

// Twilio 10DLC readiness — runs against the PRODUCTION server (npm run start)
// at the 390×844 viewport the carrier screenshot will be taken on.
test.use({ viewport: { width: 390, height: 844 } });

const SHOTS = 'test-results/twilio';

test('phone-entry: consent block + submit visible in ONE frame, consent line is byte-exact', async ({ page }) => {
  await page.goto('/auth');

  // The locked consent line, asserted character-for-character against the
  // single source of truth (src/lib/consent.ts) — catches any typo.
  const consent = page.getByTestId('sms-consent');
  await expect(consent).toBeVisible();
  expect(await consent.textContent()).toBe(SMS_CONSENT_LINE);

  // Terms + Privacy links sit on a separate line and point at the routes.
  await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');

  // The submit action must share the frame with the consent line (that is
  // exactly what the Twilio screenshot has to show). Assert the button's
  // bottom edge falls inside the 390×844 viewport.
  const submit = page.getByRole('button', { name: /send code/i });
  await expect(submit).toBeVisible();
  const box = await submit.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);

  await page.screenshot({ path: `${SHOTS}/auth-consent.png` });
});

test('/privacy is public and renders', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page).toHaveURL(/\/privacy$/); // no redirect to /auth → public
  await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/privacy.png` });
});

test('/terms is public and renders', async ({ page }) => {
  await page.goto('/terms');
  await expect(page).toHaveURL(/\/terms$/); // no redirect to /auth → public
  await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/terms.png` });
});
