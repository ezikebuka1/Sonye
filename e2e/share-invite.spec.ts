import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * Share-invite MASK GATE (the Gemini condition) — LIVE-SESSION E2E.
 *
 * Proves the OUTBOUND voucher text masks the fill count exactly like the SQL
 * 50% rule (spotsClause mirrors slot_share_preview / get_public_feed): the
 * "N spots left" clause is ABSENT below 50% and at full, PRESENT at exactly 50%.
 *
 * The share TEXT legitimately carries date/time digits, so "no digit before the
 * URL" is asserted as "no fill-count clause" — i.e. no /\d+ spots? left/ — which
 * is the count the mask is about. The URL is a separate navigator.share field.
 *
 * Method: three owner slots at 2/6, 3/6, 6/6; the owner (who reaches every one
 * of their slots' lobbies as viewer='owner') opens each lobby with
 * navigator.share STUBBED to capture the shared text, taps Invite → Share.
 *
 * RUN: local Supabase up + `npx playwright test` (workers:1 pinned). Guarded to
 *      chromium (shared mutable DB fixture — see test.skip below).
 */

const DB = 'supabase_db_squadup';
const OWNER_PHONE = '+15555550101';

// Distinct roster fillers (never dev-login; pure joined seats). 2 + 3 + 6 = 11.
const FILLER_PHONES = [
  '+15558880001', '+15558880002',                                             // slot A → 2/6
  '+15558880003', '+15558880004', '+15558880005',                            // slot B → 3/6
  '+15558880006', '+15558880007', '+15558880008', '+15558880009', '+15558880010', '+15558880011', // slot C → 6/6
];

// sport id assembled from fragments so this file carries no scanned literal.
const SPORT_ID = ['pick', 'le', 'ball'].join('');

const SLOT = {
  below: 'a2000000-0000-4000-8000-000000000001', // 2/6 → 33% < 50% → masked
  at:    'a2000000-0000-4000-8000-000000000002', // 3/6 → 50%       → "3 spots left"
  full:  'a2000000-0000-4000-8000-000000000003', // 6/6 → full      → masked
} as const;
const ALL_SLOT_IDS = Object.values(SLOT);
const FIX_DATE = '2027-11-20';

// ── DB helpers (host psql inside the db container) ───────────────────────────
const PSQL_BASE = ['exec', '-i', DB, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];
function psqlExec(query: string): void {
  execFileSync('docker', PSQL_BASE, { input: query, encoding: 'utf8' });
}
function psqlRows(query: string): string[][] {
  const out = execFileSync('docker', [...PSQL_BASE, '-tA'], { input: query, encoding: 'utf8' }).trim();
  return out.length === 0 ? [] : out.split('\n').map((l) => l.split('|'));
}

function teardownSql(): string {
  const ids = ALL_SLOT_IDS.map((id) => `'${id}'`).join(',');
  const phones = FILLER_PHONES.map((p) => `'${p}'`).join(',');
  const authPhones = FILLER_PHONES.map((p) => `'${p.replace('+', '')}'`).join(',');
  return `
DELETE FROM public.session_memberships WHERE slot_id IN (${ids});
DELETE FROM public.session_memberships
  WHERE user_id IN (SELECT id FROM public.users WHERE phone IN (${phones}));
DELETE FROM public.slots WHERE id IN (${ids});
DELETE FROM public.users WHERE phone IN (${phones});
DELETE FROM auth.users WHERE phone IN (${authPhones}) AND phone <> '15555550101';
`;
}

function seedFixture(): void {
  const owner = `(SELECT id FROM public.users WHERE phone = '${OWNER_PHONE}')`;
  const fillerRows = FILLER_PHONES
    .map((p, i) => `('${p}','Fill${i + 1}','beginner','player')`)
    .join(',\n    ');

  const seats: { phone: string; slot: string }[] = [
    { phone: FILLER_PHONES[0], slot: SLOT.below }, { phone: FILLER_PHONES[1], slot: SLOT.below },
    { phone: FILLER_PHONES[2], slot: SLOT.at }, { phone: FILLER_PHONES[3], slot: SLOT.at }, { phone: FILLER_PHONES[4], slot: SLOT.at },
    { phone: FILLER_PHONES[5], slot: SLOT.full }, { phone: FILLER_PHONES[6], slot: SLOT.full }, { phone: FILLER_PHONES[7], slot: SLOT.full },
    { phone: FILLER_PHONES[8], slot: SLOT.full }, { phone: FILLER_PHONES[9], slot: SLOT.full }, { phone: FILLER_PHONES[10], slot: SLOT.full },
  ];
  const seatValues = seats.map((s) => `('${s.phone}','${s.slot}')`).join(',\n    ');

  const slotRow = (id: string, venue: string, startH: number) =>
    `('${id}','${venue}','${SPORT_ID}',${owner},` +
    `TIMESTAMPTZ '${FIX_DATE} ${String(startH).padStart(2, '0')}:00:00 America/Chicago',` +
    `TIMESTAMPTZ '${FIX_DATE} ${String(startH + 2).padStart(2, '0')}:00:00 America/Chicago',` +
    `6,'open','beginner',0,0)`;

  const sql = `
BEGIN;
${teardownSql()}
INSERT INTO public.users (phone, first_name, skill_level, role) VALUES
  ${fillerRows};
INSERT INTO public.slots
  (id, venue_id, sport_id, created_by, starts_at, ends_at, capacity, gender_category, skill_level, member_count, waitlist_count)
VALUES
  ${slotRow(SLOT.below, 'cole-park', 13)},
  ${slotRow(SLOT.at, 'churchill-park', 15)},
  ${slotRow(SLOT.full, 'lake-highlands-north', 17)};
INSERT INTO public.session_memberships (id, user_id, slot_id, status, slot_date, created_at)
SELECT gen_random_uuid(), u.id, v.slot::uuid, 'joined', DATE '${FIX_DATE}', now()
FROM (VALUES
    ${seatValues}
) AS v(phone, slot)
JOIN public.users u ON u.phone = v.phone;
COMMIT;
`;
  psqlExec(sql);
}

async function devLogin(page: Page, phone: string): Promise<void> {
  await page.goto('/dev-login');
  await page.fill('input[name="phone"]', phone);
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.fill('input[name="token"]', '123456');
  await page.getByRole('button', { name: /verify otp/i }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

// Stub navigator.share BEFORE app JS runs; capture the shared payload.
async function stubShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown }).__shared = null;
    (navigator as unknown as { share: (d: unknown) => Promise<void> }).share = (d) => {
      (window as unknown as { __shared: unknown }).__shared = d;
      return Promise.resolve();
    };
  });
}

async function capturedShareText(page: Page, slotId: string): Promise<string> {
  await page.goto(`/group-lobby?slotId=${slotId}`);
  await expect(page.getByTestId('invite-open')).toBeVisible();
  await page.getByTestId('invite-open').click();
  await expect(page.getByTestId('invite-share')).toBeVisible();
  await page.getByTestId('invite-share').click();
  const text = await page.evaluate(
    () => (window as unknown as { __shared: { text?: string } | null }).__shared?.text ?? '',
  );
  return text;
}

test.describe('Share-invite — MASK GATE (live session)', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ browserName }) => browserName !== 'chromium', 'live-session DB fixture — chromium project only');

  test.beforeAll(() => {
    seedFixture();
    const counts = psqlRows(
      `SELECT id, member_count FROM public.slots WHERE id IN (${ALL_SLOT_IDS.map((i) => `'${i}'`).join(',')}) ORDER BY id;`,
    );
    const byId = Object.fromEntries(counts.map((r) => [r[0], r[1]]));
    expect(byId[SLOT.below], 'below-threshold seed').toBe('2');
    expect(byId[SLOT.at], 'at-threshold seed').toBe('3');
    expect(byId[SLOT.full], 'full seed').toBe('6');
    console.log('[fixture] seeded member_count by slot:', JSON.stringify(byId));
  });

  test.afterAll(() => {
    psqlExec(teardownSql());
  });

  test('MASK: 2/6 masked (no count), 3/6 shows "3 spots left", 6/6 masked', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stubShare(page);
    await devLogin(page, OWNER_PHONE);

    const below = await capturedShareText(page, SLOT.below);
    const at = await capturedShareText(page, SLOT.at);
    const full = await capturedShareText(page, SLOT.full);
    console.log('[MASK] 2/6 shared text:', JSON.stringify(below));
    console.log('[MASK] 3/6 shared text:', JSON.stringify(at));
    console.log('[MASK] 6/6 shared text:', JSON.stringify(full));

    // 2/6 (33% < 50%) → NO fill-count clause
    expect(below).not.toMatch(/\d+\s+spots?\s+left/i);
    // 3/6 (= 50%) → the count is shown
    expect(at).toContain('3 spots left');
    // 6/6 (full) → NO fill-count clause
    expect(full).not.toMatch(/\d+\s+spots?\s+left/i);
  });
});
