// Phase 1 verification script — raw terminal output.
// Run: node scripts/verify-phase1.mjs
// Requires: local Supabase stack running with updated config (stop+start done).

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const URL          = 'http://127.0.0.1:54321';
const ANON         = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SVC          = '***PURGED***';
const OWNER_PHONE  = '+15555550101';
const PLAYER_PHONE = '+15555550102';
const OTP          = '123456';

const psql = (sql) =>
  execSync(
    `docker exec -i supabase_db_squadup psql -U postgres postgres -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' }
  ).trim();

// ─── Rule 6 pre-check: venues SELECT via authenticated session ───────────────
console.log('\n=== RULE 6: venues SELECT (authenticated) ===');

// Re-authenticate dev owner (session may have expired after restart)
const ownerBootstrap = createClient(URL, ANON, { auth: { persistSession: false } });
const { error: otpErr1 } = await ownerBootstrap.auth.signInWithOtp({ phone: OWNER_PHONE });
console.log('signInWithOtp (owner):', otpErr1 ? `ERROR — ${otpErr1.message}` : 'OK');

const { data: ownerVerify, error: verifyErr1 } = await ownerBootstrap.auth.verifyOtp({
  phone: OWNER_PHONE, token: OTP, type: 'sms',
});
if (verifyErr1 || !ownerVerify?.session) {
  console.log('Owner auth failed:', verifyErr1?.message ?? 'no session');
  process.exit(1);
}
const ownerToken = ownerVerify.session.access_token;
console.log('Owner session established, uid:', ownerVerify.session.user.id);

const authedOwner = createClient(URL, ANON, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${ownerToken}` } },
});

const { data: venues, error: venuesErr } = await authedOwner.from('venues').select('id, name').order('name');
console.log('venues SELECT as authed owner:', venuesErr
  ? `ERROR — ${venuesErr.message}`
  : `OK — ${venues?.length} rows: ${venues?.map(v => v.name).join(', ')}`);

// ─── CHECKPOINT 1: owner creates a slot ─────────────────────────────────────
console.log('\n=== CHECKPOINT 1: owner creates a slot ===');

const { data: ownerPublicId, error: cidErr } = await authedOwner.rpc('current_user_id');
console.log('current_user_id():', cidErr ? `ERROR — ${cidErr.message}` : ownerPublicId);

// Known Dallas CDT slot: 2026-07-15 18:00–20:00 (July = CDT = UTC-5)
const SLOT_DATE      = '2026-07-15';
const SLOT_START     = '18:00';
const SLOT_END       = '20:00';
const EXPECTED_UTC_H = 23; // 18:00 CDT = 23:00 UTC

const { data: slot, error: insertErr } = await authedOwner
  .from('slots')
  .insert({
    venue_id:        'cole-park',
    sport_id:        'pickleball',
    created_by:      ownerPublicId,
    starts_at:       `${SLOT_DATE} ${SLOT_START}:00 America/Chicago`,
    ends_at:         `${SLOT_DATE} ${SLOT_END}:00 America/Chicago`,
    capacity:        6,
    gender_category: 'open',
    skill_level:     'intermediate',
  })
  .select()
  .single();

if (insertErr) {
  console.log('INSERT error:', insertErr.message);
  process.exit(1);
}
console.log('Slot row:');
console.log('  id           :', slot.id);
console.log('  created_by   :', slot.created_by, '(expected dev owner public.users.id)');
console.log('  sport_id     :', slot.sport_id);
console.log('  capacity     :', slot.capacity);
console.log('  gender_cat   :', slot.gender_category);
console.log('  skill_level  :', slot.skill_level);
console.log('  member_count :', slot.member_count);
console.log('  starts_at    :', slot.starts_at);
console.log('  ends_at      :', slot.ends_at);

// Verify created_by matches the owner's public.users.id
const ownerMatch = slot.created_by === ownerPublicId;
console.log('created_by === current_user_id():', ownerMatch ? 'MATCH ✓' : `MISMATCH — got ${slot.created_by}`);

// ─── CHECKPOINT 2: timezone proof ───────────────────────────────────────────
console.log('\n=== CHECKPOINT 2: TZ proof (R2) ===');
console.log(`Entered: ${SLOT_DATE} ${SLOT_START} Dallas local. Expected UTC hour: ${EXPECTED_UTC_H}:00`);

const tzSql = `
  SELECT
    starts_at,
    (starts_at AT TIME ZONE 'America/Chicago')       AS dallas_local,
    (starts_at AT TIME ZONE 'America/Chicago')::date AS civil_date
  FROM public.slots WHERE id = '${slot.id}';
`.replace(/\n/g, ' ').trim();

try {
  const tzResult = psql(tzSql);
  console.log(tzResult);
} catch (e) {
  console.log('psql error:', e.message);
}

// ─── CHECKPOINT 3: player INSERT rejected by RLS ────────────────────────────
console.log('\n=== CHECKPOINT 3: non-owner INSERT rejected ===');

// Authenticate player phone
const playerBootstrap = createClient(URL, ANON, { auth: { persistSession: false } });
const { error: otpErr2 } = await playerBootstrap.auth.signInWithOtp({ phone: PLAYER_PHONE });
console.log('signInWithOtp (player):', otpErr2 ? `ERROR — ${otpErr2.message}` : 'OK');

const { data: playerVerify, error: pVerifyErr } = await playerBootstrap.auth.verifyOtp({
  phone: PLAYER_PHONE, token: OTP, type: 'sms',
});
if (pVerifyErr || !playerVerify?.session) {
  console.log('Player auth failed:', pVerifyErr?.message ?? 'no session');
  process.exit(1);
}
const playerToken = playerVerify.session.access_token;
const playerAuthUid = playerVerify.session.user.id;
console.log('Player session established, auth uid:', playerAuthUid);

// Bind player via signup_claim (creates the public.users row as role=player)
const authedPlayer = createClient(URL, ANON, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${playerToken}` } },
});
const { data: playerPublicId, error: claimErr } = await authedPlayer.rpc('signup_claim', {
  p_phone:        PLAYER_PHONE,
  p_auth_user_id: playerAuthUid,
  p_first_name:   'TestPlayer',
  p_skill_level:  'beginner',
});
console.log('signup_claim (player):', claimErr ? `ERROR — ${claimErr.message}` : `public.users.id=${playerPublicId}`);
const { data: playerIsOwner } = await authedPlayer.rpc('is_owner');
console.log('is_owner() as player:', playerIsOwner, '(expected: false)');

// Attempt slot INSERT as player — must be rejected
const { data: badSlot, error: rjErr } = await authedPlayer
  .from('slots')
  .insert({
    venue_id:        'cole-park',
    sport_id:        'pickleball',
    created_by:      playerPublicId,
    starts_at:       '2026-07-16 18:00:00 America/Chicago',
    ends_at:         '2026-07-16 20:00:00 America/Chicago',
    capacity:        6,
    gender_category: 'open',
    skill_level:     'beginner',
  })
  .select()
  .single();

console.log('Player INSERT result:');
if (rjErr) {
  console.log('  REJECTED ✓ —', rjErr.message, `(code: ${rjErr.code})`);
} else {
  console.log('  UNEXPECTED SUCCESS — slot id:', badSlot?.id, '← RLS gap!');
}

// ─── CHECKPOINT 4: anon filter (not vacuous — slot now exists) ───────────────
console.log('\n=== CHECKPOINT 4: anon filter with real slot ===');

const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const { data: anonSlots, error: anonErr } = await anon.from('slots').select('id');
console.log('anon SELECT slots :', anonErr
  ? `ERROR — ${anonErr.message}`
  : `${anonSlots?.length ?? 0} rows (expected 0 — RLS filters anon)`);

const { data: ownerSlots, error: ownerSlotsErr } = await authedOwner.from('slots').select('id');
console.log('owner SELECT slots:', ownerSlotsErr
  ? `ERROR — ${ownerSlotsErr.message}`
  : `${ownerSlots?.length ?? 0} rows (expected ≥1)`);

const { data: preview, error: previewErr } = await anon.rpc('slot_share_preview', {
  target_slot: slot.id,
});
console.log('anon slot_share_preview:', previewErr
  ? `ERROR — ${previewErr.message}`
  : `OK — ${preview?.length ?? 0} rows`);
if (preview?.length) {
  console.log('  Preview row:', JSON.stringify(preview[0], null, 2));
}

console.log('\n=== Done ===\n');
