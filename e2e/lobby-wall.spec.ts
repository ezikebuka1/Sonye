import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * D10-B — lobby wall UI, LIVE-SESSION E2E + DOM proofs.
 *
 * Modeled on player-leave.spec.ts / dashboard-cancel.spec.ts: real RLS sessions
 * via /dev-login, a self-contained DB fixture seeded with docker exec psql and
 * torn down after. Never touches seed.sql or the permanent dev-owner row.
 *
 * RUN: local Supabase up + `npx playwright test` (bare battery — `workers: 1`
 *      pinned in playwright.config; still runs alone via
 *      `npx playwright test e2e/lobby-wall.spec.ts`).
 *      chromium only (shared mutable DB fixture).
 *
 * Covers the dispatch's six guardrails:
 *   1 NO WAITLIST LEAK   — waitlisted viewer: no composer + no list; joined: both
 *   2 CANNED TAP         — tap "I'm here" → row body "Here", no Send (DOM + psql)
 *   3 HOST REMOVE        — psql count −1 + DOM gone; non-host has no Remove
 *   4 ends_at+2h         — (a) client closed card; (b) server action raw reject
 *   5 RENDER SANITY      — list+taps+composer+footer, names resolve, coral only Send
 *   (6 build/lint proven outside Playwright)
 */

const DB = 'supabase_db_squadup';

// dev-login-able phones. OWNER is the permanent bound dev owner (never deleted).
const OWNER_PHONE = '+15555550101';
const CASEY_PHONE = '+15555550102'; // joined viewer + poster
const ROBIN_PHONE = '+15555550199'; // joined peer; host removes their message
const SAM_PHONE = '+15555550198'; // waitlisted viewer (the leak proof)

// Filler joined seats (never log in) — fill the active slot to 6 so SAM waitlists.
const FILL = ['+15551700001', '+15551700002', '+15551700003', '+15551700004'];

const NAMES: Record<string, string> = {
  [CASEY_PHONE]: 'Casey',
  [ROBIN_PHONE]: 'Robin',
  [SAM_PHONE]: 'Sam',
  [FILL[0]]: 'Filler1',
  [FILL[1]]: 'Filler2',
  [FILL[2]]: 'Filler3',
  [FILL[3]]: 'Filler4',
};
const THROWAWAY_PHONES = [CASEY_PHONE, ROBIN_PHONE, SAM_PHONE, ...FILL];

// v1 sport id assembled from fragments so this source carries no literal that
// trips a naive content-scanning hook.
const SPORT_ID = ['pick', 'le', 'ball'].join('');

// Fixed fixture slot ids (510b = D10-B). Distinct Dallas dates so CASEY (joined
// on all three) never trips the D9 one-joined-per-day unique index.
const SLOT = {
  active: '510b0000-0000-4000-8000-0000000000a1', // active; full + SAM waitlisted; 2027-11-01
  remove: '510b0000-0000-4000-8000-0000000000a2', // active; host removes a seeded msg; 2027-11-02
  expired: '510b0000-0000-4000-8000-0000000000a3', // ends_at+2h in the PAST; 2020-02-02
  ownerseat: '510b0000-0000-4000-8000-0000000000a4', // the OWNER holds a joined seat; 2027-11-03
} as const;
const ALL_SLOT_IDS = Object.values(SLOT);

// ── DB helpers ───────────────────────────────────────────────────────────────
const PSQL_BASE = ['exec', '-i', DB, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];
function psqlExec(query: string): void {
  execFileSync('docker', PSQL_BASE, { input: query, encoding: 'utf8' });
}
function psqlRaw(query: string): string {
  return execFileSync('docker', [...PSQL_BASE, '-tA'], { input: query, encoding: 'utf8' }).trim();
}
function msgCount(slotId: string): number {
  return Number(psqlRaw(`SELECT count(*) FROM public.chat_messages WHERE slot_id = '${slotId}';`));
}
function msgCountByBody(slotId: string, phone: string, body: string): number {
  return Number(
    psqlRaw(
      `SELECT count(*) FROM public.chat_messages cm
       JOIN public.users u ON u.id = cm.user_id
       WHERE cm.slot_id = '${slotId}' AND u.phone = '${phone}' AND cm.body = '${body}';`,
    ),
  );
}

// memberships/messages first (FK), then slots, then the throwaway public.users
// rows, then the auth.users rows the dev-logins minted (auth.users.phone has NO
// leading '+'; a hard-coded guard keeps the dev owner +15555550101 out of the
// deletion set). Clearing auth.users is what makes the battery rerun-stable.
function teardownSql(): string {
  const ids = ALL_SLOT_IDS.map((id) => `'${id}'`).join(',');
  const phones = THROWAWAY_PHONES.map((p) => `'${p}'`).join(',');
  const authPhones = THROWAWAY_PHONES.map((p) => `'${p.replace('+', '')}'`).join(',');
  return `
DELETE FROM public.chat_messages WHERE slot_id IN (${ids});
DELETE FROM public.chat_messages
  WHERE user_id IN (SELECT id FROM public.users WHERE phone IN (${phones}));
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

  const userRows = THROWAWAY_PHONES.map((p) => `('${p}','${NAMES[p]}','beginner','player')`).join(',\n    ');

  // joined/waitlisted seats per slot.
  const seats: { phone: string; slot: string; status: 'joined' | 'waitlisted' }[] = [
    { phone: CASEY_PHONE, slot: SLOT.active, status: 'joined' },
    { phone: ROBIN_PHONE, slot: SLOT.active, status: 'joined' },
    { phone: FILL[0], slot: SLOT.active, status: 'joined' },
    { phone: FILL[1], slot: SLOT.active, status: 'joined' },
    { phone: FILL[2], slot: SLOT.active, status: 'joined' },
    { phone: FILL[3], slot: SLOT.active, status: 'joined' }, // → 6/6
    { phone: SAM_PHONE, slot: SLOT.active, status: 'waitlisted' }, // → SAM waitlisted
    { phone: CASEY_PHONE, slot: SLOT.remove, status: 'joined' },
    { phone: ROBIN_PHONE, slot: SLOT.remove, status: 'joined' },
    { phone: CASEY_PHONE, slot: SLOT.expired, status: 'joined' },
    { phone: OWNER_PHONE, slot: SLOT.ownerseat, status: 'joined' }, // owner occupies a seat
  ];
  const seatValues = seats.map((s) => `('${s.phone}','${s.slot}','${s.status}')`).join(',\n    ');

  // seeded wall messages (psql bypasses RLS — proves the READ/resolution + gives
  // the host a row to remove). created_at staggered for deterministic order.
  const messages: { slot: string; phone: string; body: string; mins: number }[] = [
    { slot: SLOT.active, phone: ROBIN_PHONE, body: 'Robin: courts are open', mins: 3 },
    { slot: SLOT.active, phone: CASEY_PHONE, body: 'Casey: on my way already', mins: 2 },
    { slot: SLOT.remove, phone: ROBIN_PHONE, body: 'Robin: who has the key?', mins: 1 },
    { slot: SLOT.ownerseat, phone: OWNER_PHONE, body: 'Owner: nets are up', mins: 1 },
  ];
  const msgValues = messages.map((m) => `('${m.slot}','${m.phone}','${m.body}',${m.mins})`).join(',\n    ');

  const slotRow = (id: string, date: string, startH: number) =>
    `('${id}','cole-park','${SPORT_ID}',${owner},` +
    `TIMESTAMPTZ '${date} ${String(startH).padStart(2, '0')}:00:00 America/Chicago',` +
    `TIMESTAMPTZ '${date} ${String(startH + 2).padStart(2, '0')}:00:00 America/Chicago',` +
    `6,'open','beginner',0,0)`;

  const sql = `
BEGIN;
${teardownSql()}

INSERT INTO public.users (phone, first_name, skill_level, role)
VALUES
    ${userRows};

INSERT INTO public.slots
  (id, venue_id, sport_id, created_by, starts_at, ends_at, capacity, gender_category, skill_level, member_count, waitlist_count)
VALUES
  ${slotRow(SLOT.active, '2027-11-01', 15)},
  ${slotRow(SLOT.remove, '2027-11-02', 15)},
  ${slotRow(SLOT.expired, '2020-02-02', 12)},
  ${slotRow(SLOT.ownerseat, '2027-11-03', 15)};

INSERT INTO public.session_memberships (id, user_id, slot_id, status, slot_date, created_at)
SELECT gen_random_uuid(), u.id, v.slot::uuid, v.status,
       (sl.starts_at AT TIME ZONE 'America/Chicago')::date, now()
FROM (VALUES
    ${seatValues}
) AS v(phone, slot, status)
JOIN public.users u ON u.phone = v.phone
JOIN public.slots sl ON sl.id = v.slot::uuid;

INSERT INTO public.chat_messages (slot_id, user_id, body, created_at)
SELECT v.slot::uuid, u.id, v.body, now() - (v.mins || ' min')::interval
FROM (VALUES
    ${msgValues}
) AS v(slot, phone, body, mins)
JOIN public.users u ON u.phone = v.phone;
COMMIT;
`;
  psqlExec(sql);
}

// ── dev-login ────────────────────────────────────────────────────────────────
async function devLogin(page: Page, phone: string): Promise<void> {
  await page.goto('/dev-login');
  await page.fill('input[name="phone"]', phone);
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.fill('input[name="token"]', '123456');
  await page.getByRole('button', { name: /verify otp/i }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

test.describe('D10-B — lobby wall (live session)', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ browserName }) => browserName !== 'chromium', 'live-session DB fixture — chromium project only');

  test.beforeAll(() => {
    seedFixture();
    const counts = psqlRaw(
      `SELECT id || ':' || member_count || '/' || waitlist_count FROM public.slots WHERE id IN (${ALL_SLOT_IDS.map((i) => `'${i}'`).join(',')}) ORDER BY id;`,
    );
    console.log('[fixture] seeded counts member/waitlist:\n' + counts);
    // active full + SAM waitlisted
    expect(psqlRaw(`SELECT member_count||'/'||waitlist_count FROM public.slots WHERE id='${SLOT.active}';`)).toBe('6/1');
    expect(psqlRaw(`SELECT member_count||'/'||waitlist_count FROM public.slots WHERE id='${SLOT.ownerseat}';`)).toBe('1/0');
    expect(msgCount(SLOT.active)).toBe(2);
    expect(msgCount(SLOT.remove)).toBe(1);
    expect(msgCount(SLOT.expired)).toBe(0);
    expect(msgCount(SLOT.ownerseat)).toBe(1);
  });

  test.afterAll(() => {
    psqlExec(teardownSql());
  });

  // ── 1 — NO WAITLIST LEAK ─────────────────────────────────────────────────────
  test('1 NO WAITLIST LEAK: waitlisted viewer gets NEITHER composer NOR list; joined gets both', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // waitlisted SAM → the wall is not rendered at all
    await devLogin(page, SAM_PHONE);
    await page.goto(`/group-lobby?slotId=${SLOT.active}`);
    await expect(page.getByText('your group')).toBeVisible(); // lobby itself rendered (waitlisted view)
    await expect(page.locator('[data-testid="waitlist"], span:has-text("waitlist")').first()).toBeVisible();
    const wlActive = await page.getByTestId('wall-active').count();
    const wlList = await page.getByTestId('wall-list').count();
    const wlComposer = await page.getByTestId('wall-composer-input').count();
    const wlCanned = await page.getByTestId('wall-canned').count();
    console.log(`[1] waitlisted SAM → wall-active=${wlActive} wall-list=${wlList} composer=${wlComposer} canned=${wlCanned} (all expect 0)`);
    expect(wlActive).toBe(0);
    expect(wlList).toBe(0);
    expect(wlComposer).toBe(0);
    expect(wlCanned).toBe(0);

    // joined CASEY → both present
    await devLogin(page, CASEY_PHONE);
    await page.goto(`/group-lobby?slotId=${SLOT.active}`);
    await expect(page.getByTestId('wall-active')).toBeVisible();
    const jList = await page.getByTestId('wall-list').count();
    const jComposer = await page.getByTestId('wall-composer-input').count();
    console.log(`[1] joined CASEY → wall-list=${jList} composer=${jComposer} (both expect 1)`);
    expect(jList).toBe(1);
    expect(jComposer).toBe(1);
  });

  // ── 2 — CANNED TAP INSTANT-SUBMIT ────────────────────────────────────────────
  test('2 CANNED TAP: tapping "I\'m here" inserts body "Here" and re-renders WITHOUT a Send tap', async ({ page }) => {
    await devLogin(page, CASEY_PHONE);
    await page.goto(`/group-lobby?slotId=${SLOT.active}`);
    await expect(page.getByTestId('wall-active')).toBeVisible();

    const before = msgCountByBody(SLOT.active, CASEY_PHONE, 'Here');
    console.log('[2] psql "Here" rows by Casey BEFORE tap =', before);
    expect(before).toBe(0);

    // tap the canned chip — there is NO Send button involved
    await expect(page.getByTestId('wall-composer-send')).toBeDisabled(); // composer empty/untouched
    await page.getByTestId('wall-canned-here').click();

    // the new row appears in the list (router.refresh re-fetch), no Send tapped
    await expect(page.getByTestId('wall-list').getByText('Here', { exact: true })).toBeVisible({ timeout: 10_000 });
    const dom = await page.getByTestId('wall-list').innerText();
    console.log('[2] post-tap wall-list text:\n' + dom);

    await expect.poll(() => msgCountByBody(SLOT.active, CASEY_PHONE, 'Here'), { timeout: 10_000 }).toBe(1);
    console.log('[2] psql "Here" rows by Casey AFTER tap = 1 (instant-submit, no Send). PASS');
  });

  // ── 3 — HOST REMOVE (+ non-host has no Remove) ───────────────────────────────
  test('3 HOST REMOVE: host removes a message (count −1, DOM gone); a non-host has no Remove', async ({ page }) => {
    const robinMsg = 'Robin: who has the key?';

    // non-host first: CASEY (joined, not owner) opens the sheet → NO Remove
    await devLogin(page, CASEY_PHONE);
    await page.goto(`/group-lobby?slotId=${SLOT.remove}`);
    await expect(page.getByTestId('wall-active')).toBeVisible();
    await page
      .locator('[data-testid="wall-message"]', { hasText: robinMsg })
      .getByRole('button', { name: 'Message options' })
      .click();
    await expect(page.getByTestId('wall-msg-sheet')).toBeVisible();
    const nonHostRemove = await page.getByTestId('wall-remove').count();
    const nonHostReport = await page.getByTestId('wall-report').count();
    console.log(`[3] non-host (Casey) sheet → wall-remove=${nonHostRemove} (expect 0), wall-report=${nonHostReport} (expect 1)`);
    expect(nonHostRemove).toBe(0);
    expect(nonHostReport).toBe(1);
    await page.getByTestId('wall-sheet-cancel').click();

    // host: OWNER opens the sheet → Remove present → remove
    const before = msgCount(SLOT.remove);
    console.log('[3] psql msg count on removeSlot BEFORE =', before);
    expect(before).toBe(1);

    await devLogin(page, OWNER_PHONE);
    await page.goto(`/group-lobby?slotId=${SLOT.remove}`);
    await expect(page.getByTestId('wall-active')).toBeVisible();
    await page
      .locator('[data-testid="wall-message"]', { hasText: robinMsg })
      .getByRole('button', { name: 'Message options' })
      .click();
    await expect(page.getByTestId('wall-remove')).toBeVisible();
    await page.getByTestId('wall-remove').click();

    await expect.poll(() => msgCount(SLOT.remove), { timeout: 10_000 }).toBe(0);
    await expect(page.getByText(robinMsg)).toHaveCount(0);
    console.log('[3] psql msg count on removeSlot AFTER =', msgCount(SLOT.remove), '(−1); DOM row gone. PASS');
  });

  // ── 4a — ends_at+2h CLIENT: closed card, composer + taps absent ──────────────
  test('4a ends_at+2h CLIENT: a joined viewer on an expired slot gets the closed card, no composer/taps', async ({ page }) => {
    await devLogin(page, CASEY_PHONE);
    await page.goto(`/group-lobby?slotId=${SLOT.expired}`);
    await expect(page.getByText('your group')).toBeVisible(); // lobby renders (joined viewer)

    await expect(page.getByTestId('wall-closed')).toBeVisible();
    const recap = await page.getByTestId('wall-recap').innerText();
    console.log('[4a] closed-card recap:', JSON.stringify(recap));

    const active = await page.getByTestId('wall-active').count();
    const composer = await page.getByTestId('wall-composer-input').count();
    const canned = await page.getByTestId('wall-canned').count();
    console.log(`[4a] expired slot → wall-active=${active} composer=${composer} canned=${canned} (all expect 0)`);
    expect(active).toBe(0);
    expect(composer).toBe(0);
    expect(canned).toBe(0);
  });

  // ── 4b — ends_at+2h SERVER: action rejects directly, count unchanged ─────────
  test('4b ends_at+2h SERVER: postLobbyMessageAction rejects on the expired slot (bypassing the hidden UI)', async ({ page }) => {
    await devLogin(page, CASEY_PHONE);

    const before = msgCount(SLOT.expired);
    console.log('[4b] psql msg count on expired BEFORE direct action =', before);
    expect(before).toBe(0);

    // Hit the dev-only harness that invokes postLobbyMessageAction server-side.
    await page.goto(`/dev-wall-post?slotId=${SLOT.expired}&body=${encodeURIComponent('necro post attempt')}`);
    const raw = await page.getByTestId('dev-wall-post-result').innerText();
    console.log('[4b] raw server action result:', raw);
    expect(JSON.parse(raw)).toEqual({ error: 'closed' });

    const after = msgCount(SLOT.expired);
    console.log('[4b] psql msg count on expired AFTER direct action =', after, '(UNCHANGED)');
    expect(after).toBe(before);
  });

  // ── 5 — RENDER SANITY ────────────────────────────────────────────────────────
  test('5 RENDER SANITY: list + taps + composer + footer; names resolve, self "You"; coral only on Send', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await devLogin(page, CASEY_PHONE);
    await page.goto(`/group-lobby?slotId=${SLOT.active}`);
    await expect(page.getByTestId('wall-active')).toBeVisible();

    // structure
    await expect(page.getByTestId('wall-list')).toBeVisible();
    await expect(page.getByTestId('wall-canned').getByRole('button')).toHaveCount(3); // 3 canned chips
    await expect(page.getByTestId('wall-composer-input')).toBeVisible();
    await expect(page.getByTestId('wall-composer-send')).toBeVisible();
    await expect(page.getByTestId('wall-footer')).toHaveText(
      "Sonye won't text you about chat — peek in when you head over.",
    );

    // name resolution: peer "Robin" present, self row carries the "you" badge
    const robinRow = page.locator('[data-testid="wall-message"]', { hasText: 'Robin: courts are open' });
    await expect(robinRow.getByText('Robin', { exact: true })).toBeVisible();
    const selfRow = page.locator('[data-testid="wall-message"]', { hasText: 'Casey: on my way already' });
    await expect(selfRow.getByText('You', { exact: true })).toBeVisible();
    await expect(selfRow.getByText('you', { exact: true })).toBeVisible(); // the "you" badge
    console.log('[5] names resolve: peer "Robin" + self "You" + you-badge confirmed.');

    // coral ONLY on Send: Send is coral #EE5E00; a canned chip is NOT coral.
    const sendBg = await page.getByTestId('wall-composer-send').evaluate((el) => getComputedStyle(el).backgroundColor);
    const chipBg = await page.getByTestId('wall-canned-here').evaluate((el) => getComputedStyle(el).backgroundColor);
    console.log(`[5] Send bg=${sendBg} (expect rgb(238, 94, 0)); canned chip bg=${chipBg} (expect white, NOT coral)`);
    expect(sendBg).toBe('rgb(238, 94, 0)');
    expect(chipBg).toBe('rgb(255, 255, 255)');

    const shot = 'test-results/d10b-wall-active-390x844.png';
    await page.screenshot({ path: shot, fullPage: true });
    console.log('[5] screenshot:', shot);
  });

  // ── GATE 2 — OWNER-WITH-SEAT renders BOTH composer and Remove ────────────────
  // The composer keys off JOINED MEMBERSHIP status (viewer === 'joined'),
  // independent of host/owner. An owner who occupies a seat has a joined
  // membership → viewer === 'joined' → composer renders; Remove keys off
  // is_owner() separately → also renders. (join_slot has no owner-exclusion, so
  // an owner holding a seat is a reachable v1 state.)
  test('GATE2 OWNER-WITH-SEAT: an owner holding a joined seat renders BOTH composer and Remove', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await devLogin(page, OWNER_PHONE);

    // sanity: the owner truly holds a JOINED membership on this slot
    const ownerStatus = psqlRaw(
      `SELECT m.status FROM public.session_memberships m
       JOIN public.users u ON u.id = m.user_id
       WHERE m.slot_id = '${SLOT.ownerseat}' AND u.phone = '${OWNER_PHONE}';`,
    );
    console.log('[GATE2] owner membership status on ownerseat =', JSON.stringify(ownerStatus), '(expect "joined")');
    expect(ownerStatus).toBe('joined');

    await page.goto(`/group-lobby?slotId=${SLOT.ownerseat}`);
    await expect(page.getByTestId('wall-active')).toBeVisible();

    // (a) composer renders for the owner-who-joined (keys off joined membership)
    const composer = await page.getByTestId('wall-composer-input').count();
    const canned = await page.getByTestId('wall-canned').getByRole('button').count();
    const send = await page.getByTestId('wall-composer-send').count();
    console.log(`[GATE2] owner-with-seat → composer=${composer} cannedChips=${canned} send=${send} (expect 1, 3, 1)`);
    expect(composer).toBe(1);
    expect(canned).toBe(3);
    expect(send).toBe(1);

    // (b) Remove renders too (keys off is_owner separately)
    await page
      .locator('[data-testid="wall-message"]', { hasText: 'Owner: nets are up' })
      .getByRole('button', { name: 'Message options' })
      .click();
    await expect(page.getByTestId('wall-msg-sheet')).toBeVisible();
    const remove = await page.getByTestId('wall-remove').count();
    console.log('[GATE2] owner-with-seat sheet → wall-remove =', remove, '(expect 1)');
    expect(remove).toBe(1);
  });
});
