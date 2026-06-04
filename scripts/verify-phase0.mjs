// Phase 0 verification script — raw terminal output, no browser needed.
// Run: node scripts/verify-phase0.mjs

import { createClient } from '@supabase/supabase-js';

const URL     = 'http://127.0.0.1:54321';
const ANON    = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SVC     = '***PURGED***';
const PHONE   = '+15555550101';
const OTP     = '123456';

// ─── CHECKPOINT 1: OTP login ────────────────────────────────────────────────
console.log('\n=== CHECKPOINT 1: signInWithOtp + verifyOtp ===');

const anonClient = createClient(URL, ANON, { auth: { persistSession: false } });

const { error: otpErr } = await anonClient.auth.signInWithOtp({ phone: PHONE });
console.log('signInWithOtp:', otpErr ? `ERROR — ${otpErr.message}` : 'OK (no error)');

const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
  phone: PHONE, token: OTP, type: 'sms',
});
console.log('verifyOtp:', verifyErr ? `ERROR — ${verifyErr.message}` : 'OK');
if (verifyData?.session) {
  console.log('  session.user.id  :', verifyData.session.user.id);
  console.log('  access_token[0:40]:', verifyData.session.access_token.slice(0, 40));
} else {
  console.log('  NO SESSION — aborting further checks');
  process.exit(1);
}

const uid   = verifyData.session.user.id;
const token = verifyData.session.access_token;

const authed = createClient(URL, ANON, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
});

// ─── BIND: signup_claim phone-unclaimed path ─────────────────────────────────
console.log('\n=== BIND: signup_claim (phone-unclaimed path) ===');
const { data: claimId, error: claimErr } = await authed.rpc('signup_claim', {
  p_phone:       PHONE,
  p_auth_user_id: uid,
  p_first_name:  'Dev Owner',
  p_skill_level: 'advanced',
});
console.log('signup_claim:', claimErr ? `ERROR — ${claimErr.message}` : `returned user_id=${claimId}`);

// ─── CHECKPOINT 2: Identity check ───────────────────────────────────────────
console.log('\n=== CHECKPOINT 2: current_user_id() + is_owner() ===');
const { data: curId,   error: curIdErr }   = await authed.rpc('current_user_id');
const { data: ownerFl, error: ownerFlErr } = await authed.rpc('is_owner');
console.log('current_user_id():', curIdErr   ? `ERROR — ${curIdErr.message}`   : curId);
console.log('is_owner()       :', ownerFlErr ? `ERROR — ${ownerFlErr.message}` : ownerFl);

// ─── CHECKPOINT 3: RLS checks ───────────────────────────────────────────────
console.log('\n=== CHECKPOINT 3: RLS checks ===');

const { data: authSlots, error: authSlotsErr } = await authed.from('slots').select('id');
console.log('authed SELECT slots:', authSlotsErr
  ? `ERROR — ${authSlotsErr.message}`
  : `OK — ${authSlots?.length ?? 0} rows`);

const anon2 = createClient(URL, ANON, { auth: { persistSession: false } });

const { data: anonSlots, error: anonSlotsErr } = await anon2.from('slots').select('id');
console.log('anon   SELECT slots:', anonSlotsErr
  ? `BLOCKED — ${anonSlotsErr.message}`
  : `${anonSlots?.length ?? 0} rows (0 = RLS held)`);

const DUMMY_SLOT = '00000000-0000-0000-0000-000000000000';
const { data: preview, error: previewErr } = await anon2.rpc('slot_share_preview', {
  target_slot: DUMMY_SLOT,
});
console.log('anon slot_share_preview:', previewErr
  ? `ERROR — ${previewErr.message}`
  : `OK — ${preview?.length ?? 0} rows (empty = correct, no slot exists)`);

// ─── CHECKPOINT 4: public.users row after bind ──────────────────────────────
console.log('\n=== CHECKPOINT 4: public.users row after bind ===');
const svc = createClient(URL, SVC, { auth: { persistSession: false } });
const { data: row, error: rowErr } = await svc
  .from('users')
  .select('id, phone, first_name, role, auth_user_id')
  .eq('phone', PHONE)
  .single();
console.log('Dev owner row:', rowErr ? `ERROR — ${rowErr.message}` : JSON.stringify(row, null, 2));

console.log('\n=== Done ===\n');
