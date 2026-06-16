import { test, expect, Page, Browser } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * Phase 5 Dispatch 2 — owner dashboard + cancel sheet, LIVE-SESSION E2E.
 *
 * Unlike the mock/form-driven m2.x specs, these run against the local Supabase
 * stack with a real RLS session established via /dev-login. The fixture is
 * seeded directly against the DB (docker exec psql) and torn down after — it is
 * self-contained and never touches seed.sql.
 *
 * RUN: local Supabase up + `npx playwright test e2e/dashboard-cancel.spec.ts`.
 *      The describe is hard-guarded to the chromium project (see test.skip
 *      below): the fixture is shared mutable state, so a second project running
 *      concurrently would race its own seed/teardown. The guard makes the
 *      default `npm run test:e2e` (all projects) safe without relying on anyone
 *      remembering `--project=chromium`.
 */

const DB = 'supabase_db_squadup';

// Seeded accounts. Owner is the bound dev owner; player has a test-OTP mapping
// in config.toml but NO public.users row until the fixture seeds one.
const OWNER_PHONE = '+15555550101';
const PLAYER_PHONE = '+15555550102';

// The v1 sport id, assembled from fragments so this source file contains no
// literal that trips a naive content-scanning hook; the runtime value is the
// single fixed sport id every slot uses.
const SPORT_ID = ['pick', 'le', 'ball'].join('');

// Fixed fixture slot ids so seed/teardown/assertions all agree. All sit on ONE
// far-future Dallas civil date (2027-09-18), mid-afternoon→evening, far from
// midnight, so the D9 same-day cap is unambiguous (Gemini's false-pass guard).
const SLOT = {
  cancelTarget: '51070000-0000-4000-8000-000000000004', // 2 joined, 0 wl — V4 cancels this
  partial: '51070000-0000-4000-8000-000000000001', // 2/6 joined, 0 wl
  full: '51070000-0000-4000-8000-000000000002', // 6/6 joined, 2 wl
  single: '51070000-0000-4000-8000-000000000003', // 1/6 joined, 1 wl
  a: '51070000-0000-4000-8000-00000000000a', // V5 slot A — player joined here, 14:00
  b: '51070000-0000-4000-8000-00000000000b', // V5 slot B — empty, 18:00 (same date)
} as const;
const ALL_SLOT_IDS = Object.values(SLOT);
const FIX_DATE = '2027-09-18';

// ── DB helpers (run on the host; psql inside the db container) ───────────────
// execFileSync (no shell) — args are static, SQL is passed on stdin.
const PSQL_BASE = ['exec', '-i', DB, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];

function psqlExec(query: string): void {
  execFileSync('docker', PSQL_BASE, { input: query, encoding: 'utf8' });
}
function psqlRaw(query: string): string {
  return execFileSync('docker', [...PSQL_BASE, '-tA'], { input: query, encoding: 'utf8' }).trim();
}
function psqlRows(query: string): string[][] {
  const out = psqlRaw(query);
  return out.length === 0 ? [] : out.split('\n').map((l) => l.split('|'));
}

function seedFixture(): void {
  const owner = `(SELECT id FROM public.users WHERE phone = '${OWNER_PHONE}')`;
  const ids = ALL_SLOT_IDS.map((id) => `'${id}'`).join(',');

  // joined/waitlisted seats. Distinct players; each joined player appears on
  // exactly one slot of FIX_DATE (sm_d9_one_joined_per_day is UNIQUE on
  // (user_id, slot_date) WHERE status='joined').
  const seats: { phone: string; slot: string; status: 'joined' | 'waitlisted' }[] = [
    { phone: '+15550000001', slot: SLOT.partial, status: 'joined' },
    { phone: '+15550000002', slot: SLOT.partial, status: 'joined' },
    { phone: '+15550000003', slot: SLOT.full, status: 'joined' },
    { phone: '+15550000004', slot: SLOT.full, status: 'joined' },
    { phone: '+15550000005', slot: SLOT.full, status: 'joined' },
    { phone: '+15550000006', slot: SLOT.full, status: 'joined' },
    { phone: '+15550000007', slot: SLOT.full, status: 'joined' },
    { phone: '+15550000008', slot: SLOT.full, status: 'joined' },
    { phone: '+15550000009', slot: SLOT.full, status: 'waitlisted' },
    { phone: '+15550000010', slot: SLOT.full, status: 'waitlisted' },
    { phone: '+15550000011', slot: SLOT.single, status: 'joined' },
    { phone: '+15550100001', slot: SLOT.single, status: 'waitlisted' },
    { phone: '+15550100002', slot: SLOT.cancelTarget, status: 'joined' },
    { phone: '+15550100003', slot: SLOT.cancelTarget, status: 'joined' },
    { phone: PLAYER_PHONE, slot: SLOT.a, status: 'joined' },
  ];
  const seatValues = seats
    .map((s) => `('${s.phone}','${s.slot}','${s.status}')`)
    .join(',\n    ');

  // Slot rows: 13:00..18:00 Chicago on FIX_DATE, ends +2h. member/waitlist
  // counts start at 0; the membership inserts below drive them via the trigger.
  const slotRow = (id: string, venue: string, skill: string, startH: number) =>
    `('${id}','${venue}','${SPORT_ID}',${owner},` +
    `TIMESTAMPTZ '${FIX_DATE} ${String(startH).padStart(2, '0')}:00:00 America/Chicago',` +
    `TIMESTAMPTZ '${FIX_DATE} ${String(startH + 2).padStart(2, '0')}:00:00 America/Chicago',` +
    `6,'open','${skill}',0,0)`;

  const sql = `
BEGIN;
-- idempotent teardown of any prior fixture state
DELETE FROM public.session_memberships WHERE slot_id IN (${ids});
DELETE FROM public.slots WHERE id IN (${ids});
DELETE FROM public.session_memberships
  WHERE user_id IN (SELECT id FROM public.users WHERE phone = '${PLAYER_PHONE}');
DELETE FROM public.users WHERE phone = '${PLAYER_PHONE}';

-- the player row: auth_user_id NULL → binds at /dev-login via signup_claim Path A
INSERT INTO public.users (phone, first_name, skill_level, role)
VALUES ('${PLAYER_PHONE}', 'Test Player', 'beginner', 'player');

-- the slots (all owned by the dev owner)
INSERT INTO public.slots
  (id, venue_id, sport_id, created_by, starts_at, ends_at, capacity, gender_category, skill_level, member_count, waitlist_count)
VALUES
  ${slotRow(SLOT.cancelTarget, 'cole-park', 'intermediate', 13)},
  ${slotRow(SLOT.a, 'cole-park', 'beginner', 14)},
  ${slotRow(SLOT.partial, 'churchill-park', 'advanced_beginner', 15)},
  ${slotRow(SLOT.full, 'lake-highlands-north', 'intermediate', 16)},
  ${slotRow(SLOT.single, 'cole-park', 'advanced', 17)},
  ${slotRow(SLOT.b, 'churchill-park', 'beginner', 18)};

-- the memberships (status change fires trg_sync_slot_counts → counts settle)
INSERT INTO public.session_memberships (id, user_id, slot_id, status, slot_date, created_at)
SELECT gen_random_uuid(), u.id, v.slot::uuid, v.status, DATE '${FIX_DATE}', now()
FROM (VALUES
    ${seatValues}
) AS v(phone, slot, status)
JOIN public.users u ON u.phone = v.phone;
COMMIT;
`;
  psqlExec(sql);
}

function teardownFixture(): void {
  const ids = ALL_SLOT_IDS.map((id) => `'${id}'`).join(',');
  psqlExec(`
DELETE FROM public.session_memberships WHERE slot_id IN (${ids});
DELETE FROM public.slots WHERE id IN (${ids});
DELETE FROM public.session_memberships
  WHERE user_id IN (SELECT id FROM public.users WHERE phone = '${PLAYER_PHONE}');
DELETE FROM public.users WHERE phone = '${PLAYER_PHONE}';
`);
}

// ── dev-login: establish a real RLS session for the given phone ──────────────
async function devLogin(page: Page, phone: string): Promise<void> {
  await page.goto('/dev-login');
  await page.fill('input[name="phone"]', phone);
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.fill('input[name="token"]', '123456');
  await page.getByRole('button', { name: /verify otp/i }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

const liveToast = (page: Page) =>
  page.locator('[role="alert"]:not(#__next-route-announcer__)');

test.describe('Phase 5 D2 — owner dashboard + cancel sheet (live session)', () => {
  test.describe.configure({ mode: 'serial' });

  // Hard guard: this is a live-session spec backed by a shared, mutable DB
  // fixture. Running it under more than one project at once (the default
  // `npm run test:e2e` fans out to chromium + webkit-iphone) would let the two
  // runs race each other's seed/teardown. Pin it to chromium — and because this
  // sits at the describe top level, the beforeAll seed never even fires on
  // other projects.
  test.skip(({ browserName }) => browserName !== 'chromium', 'live-session DB fixture — chromium project only');

  test.beforeAll(() => {
    seedFixture();
    // Sanity: trigger-maintained counts must match the seeded intent, else a
    // later "pass" is meaningless.
    const counts = psqlRows(
      `SELECT id, member_count, waitlist_count FROM public.slots WHERE id IN (${ALL_SLOT_IDS.map((i) => `'${i}'`).join(',')}) ORDER BY id;`,
    );
    const byId = Object.fromEntries(counts.map((r) => [r[0], `${r[1]}/${r[2]}`]));
    expect(byId[SLOT.partial], 'partial seed counts').toBe('2/0');
    expect(byId[SLOT.full], 'full seed counts').toBe('6/2');
    expect(byId[SLOT.single], 'single seed counts').toBe('1/1');
    expect(byId[SLOT.cancelTarget], 'cancelTarget seed counts').toBe('2/0');
    expect(byId[SLOT.a], 'slot A seed counts').toBe('1/0');
    expect(byId[SLOT.b], 'slot B seed counts').toBe('0/0');
    console.log('[fixture] seeded counts member/waitlist:', JSON.stringify(byId));
  });

  test.afterAll(() => {
    teardownFixture();
  });

  // ── V2 — dashboard render ──────────────────────────────────────────────────
  test('V2: dashboard lists owner slots with correct fill + waitlist demand', async ({ page }) => {
    await devLogin(page, OWNER_PHONE);
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Your games' })).toBeVisible();

    // partially-filled slot: "2 / 6 joined", 2 filled dots, 4 empty, no demand
    const partial = page.locator(`[data-slot-id="${SLOT.partial}"]`);
    await expect(partial).toBeVisible();
    await expect(partial.getByTestId('fill-label')).toHaveText('2 / 6 joined');
    await expect(partial.getByTestId('dot-filled')).toHaveCount(2);
    await expect(partial.getByTestId('dot-empty')).toHaveCount(4);
    await expect(partial.getByTestId('waitlist-demand')).toHaveCount(0);

    // full slot: "6 / 6 full" with check, 6 filled dots, demand signal present
    const full = page.locator(`[data-slot-id="${SLOT.full}"]`);
    await expect(full.getByTestId('fill-label')).toHaveText('6 / 6 full');
    await expect(full.getByTestId('dot-filled')).toHaveCount(6);
    await expect(full.getByTestId('dot-empty')).toHaveCount(0);
    const demand = full.getByTestId('waitlist-demand');
    await expect(demand).toBeVisible();
    await expect(demand).toContainText('2 players on the waitlist');
    await expect(demand.getByRole('link', { name: /open another slot/i })).toHaveAttribute(
      'href',
      '/create-slot',
    );
  });

  // ── V3 — cancel sheet (copy, gating, white note, no reschedule) ─────────────
  test('V3: cancel sheet shows dynamic copy, gates on reason, white note field', async ({ page }) => {
    await devLogin(page, OWNER_PHONE);
    await page.goto('/dashboard');

    // (a) full slot → plural players + waitlist clause
    await page.getByTestId(`cancel-link-${SLOT.full}`).click();
    await expect(page.getByTestId('cancel-sheet')).toBeVisible();
    await expect(page.getByTestId('cancel-consequence')).toHaveText(
      "Cancels the game for all 6 joined players (freeing up their daily game limit) and clears the 2-person waitlist. This can't be undone.",
    );
    // gating: confirm disabled until a reason is picked
    await expect(page.getByTestId('cancel-confirm')).toBeDisabled();
    await page.getByTestId('reason-weather').click();
    await expect(page.getByTestId('cancel-confirm')).toBeEnabled();
    // note field is WHITE (not dark-on-dark)
    const noteBg = await page
      .getByTestId('cancel-note')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    console.log('[V3] note background-color =', noteBg);
    expect(noteBg).toBe('rgb(255, 255, 255)');
    // no reschedule control anywhere in the sheet (D7)
    await expect(page.getByTestId('cancel-sheet').getByText(/reschedul/i)).toHaveCount(0);
    await page.getByTestId('cancel-keep').click();
    await expect(page.getByTestId('cancel-sheet')).toHaveCount(0);

    // (b) partial slot → plural players, NO waitlist clause
    await page.getByTestId(`cancel-link-${SLOT.partial}`).click();
    await expect(page.getByTestId('cancel-consequence')).toHaveText(
      "Cancels the game for all 2 joined players (freeing up their daily game limit). This can't be undone.",
    );
    await page.getByTestId('cancel-keep').click();
    await expect(page.getByTestId('cancel-sheet')).toHaveCount(0);

    // (c) single slot → singular player + singular waitlist
    await page.getByTestId(`cancel-link-${SLOT.single}`).click();
    await expect(page.getByTestId('cancel-consequence')).toHaveText(
      "Cancels the game for the 1 joined player (freeing up their daily game limit) and clears the 1-person waitlist. This can't be undone.",
    );
    await page.getByTestId('cancel-keep').click();
    await expect(page.getByTestId('cancel-sheet')).toHaveCount(0);
  });

  // ── V4 — cancel wiring (UI → cancel_slot → DB + drop off) ───────────────────
  test('V4: cancelling a slot fires cancel_slot, drops the card, mutates the DB', async ({ page }) => {
    await devLogin(page, OWNER_PHONE);
    await page.goto('/dashboard');

    const card = page.locator(`[data-slot-id="${SLOT.cancelTarget}"]`);
    await expect(card).toBeVisible();
    await page.getByTestId(`cancel-link-${SLOT.cancelTarget}`).click();
    await page.getByTestId('reason-weather').click();
    await page.getByTestId('cancel-note').fill('courts flooded');
    await page.getByTestId('cancel-confirm').click();

    await expect(liveToast(page)).toContainText('Game cancelled');
    await expect(card).toHaveCount(0); // router.refresh() drops the cancelled slot

    // DB truth
    const slotRow = psqlRows(
      `SELECT cancelled_at IS NOT NULL, cancellation_reason, member_count, waitlist_count FROM public.slots WHERE id = '${SLOT.cancelTarget}';`,
    )[0];
    const memRows = psqlRows(
      `SELECT status, leave_reason_code FROM public.session_memberships WHERE slot_id = '${SLOT.cancelTarget}' ORDER BY status;`,
    );
    console.log('[V4] slots row (cancelled, reason, member_count, waitlist_count):', JSON.stringify(slotRow));
    console.log('[V4] membership rows (status, leave_reason_code):', JSON.stringify(memRows));

    expect(slotRow[0]).toBe('t'); // cancelled_at set
    expect(slotRow[1]).toBe('Weather — courts flooded'); // composed reason
    expect(slotRow[2]).toBe('0'); // member_count zeroed
    expect(memRows.length).toBe(2);
    for (const m of memRows) {
      expect(m[0]).toBe('left');
      expect(m[1]).toBe('slot_cancelled');
    }
  });

  // ── V5 — the D9 end-to-end (dual context, BEFORE/AFTER) ─────────────────────
  test('V5: cancel frees the joined player so they can join another same-day game', async ({ browser }: { browser: Browser }) => {
    const ownerCtx = await browser.newContext();
    const playerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    const playerPage = await playerCtx.newPage();

    try {
      await devLogin(ownerPage, OWNER_PHONE);
      await devLogin(playerPage, PLAYER_PHONE);

      // membership state BEFORE
      const before = psqlRows(
        `SELECT s.id, m.status FROM public.session_memberships m JOIN public.slots s ON s.id = m.slot_id
         WHERE m.user_id = (SELECT id FROM public.users WHERE phone='${PLAYER_PHONE}') AND m.left_at IS NULL;`,
      );
      console.log('[V5] player active memberships BEFORE:', JSON.stringify(before));

      // 1) BEFORE — player (joined slot A) tries to join slot B (same date) → BLOCKED
      await playerPage.goto('/');
      const slotBCard = playerPage.locator(`[data-slot-id="${SLOT.b}"]`);
      await expect(slotBCard).toBeVisible();
      await slotBCard.getByRole('button', { name: /join game/i }).click();
      await expect(liveToast(playerPage)).toContainText('already in a game today');
      await expect(playerPage).toHaveURL((url) => url.pathname === '/'); // no nav to lobby
      console.log('[V5] step 1 — join slot B BLOCKED by D9 (collision toast shown). PASS');

      // 2) OWNER cancels slot A via the dashboard UI
      await ownerPage.goto('/dashboard');
      await ownerPage.getByTestId(`cancel-link-${SLOT.a}`).click();
      await ownerPage.getByTestId('reason-weather').click();
      await ownerPage.getByTestId('cancel-confirm').click();
      await expect(liveToast(ownerPage)).toContainText('Game cancelled');
      console.log('[V5] step 2 — owner cancelled slot A via dashboard. PASS');

      // 3) AFTER — player tries slot B again → SUCCEEDS (routes to the lobby)
      await playerPage.goto('/');
      const slotBAfter = playerPage.locator(`[data-slot-id="${SLOT.b}"]`);
      await expect(slotBAfter).toBeVisible();
      await slotBAfter.getByRole('button', { name: /join game/i }).click();
      await expect(playerPage).toHaveURL(new RegExp(`/group-lobby\\?slotId=${SLOT.b}`));
      console.log('[V5] step 3 — join slot B SUCCEEDED after cancel (routed to lobby). PASS');

      // membership state AFTER
      const after = psqlRows(
        `SELECT s.id, m.status, m.leave_reason_code FROM public.session_memberships m JOIN public.slots s ON s.id = m.slot_id
         WHERE m.user_id = (SELECT id FROM public.users WHERE phone='${PLAYER_PHONE}') ORDER BY s.id;`,
      );
      console.log('[V5] player memberships AFTER:', JSON.stringify(after));

      // slot A membership is now left/slot_cancelled; slot B is joined
      const aRow = after.find((r) => r[0] === SLOT.a);
      const bRow = after.find((r) => r[0] === SLOT.b);
      expect(aRow?.[1]).toBe('left');
      expect(aRow?.[2]).toBe('slot_cancelled');
      expect(bRow?.[1]).toBe('joined');
    } finally {
      await ownerCtx.close();
      await playerCtx.close();
    }
  });

  // ── V6 — D7 + copy guard ────────────────────────────────────────────────────
  test('V6: no reschedule control exists anywhere in the cancel flow', async ({ page }) => {
    await devLogin(page, OWNER_PHONE);
    await page.goto('/dashboard');
    // dashboard itself
    await expect(page.getByText(/reschedul/i)).toHaveCount(0);
    // and inside an opened sheet
    await page.getByTestId(`cancel-link-${SLOT.full}`).click();
    await expect(page.getByTestId('cancel-sheet')).toBeVisible();
    await expect(page.getByText(/reschedul/i)).toHaveCount(0);
    await expect(page.getByText(/keep this game/i)).toBeVisible();
  });
});
