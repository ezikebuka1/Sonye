import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAvatar } from "@/lib/avatar";
import BottomTabBar from "@/components/BottomTabBar";
import { signOutAction } from "./actions";

// The account screen is per-request (live session + own-row state) — never
// cached. Mirrors page.tsx / dashboard's force-dynamic.
export const dynamic = "force-dynamic";

// "Member since July 2025" — month + year in Dallas civil time (R2). Same
// module-level Intl pattern as lib/format-central.ts.
const MEMBER_SINCE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "America/Chicago",
});

// Mask in the SERVER render — the full number appears nowhere in the payload.
function maskPhone(phone: string | null): string {
  const last4 = (phone ?? "").replace(/\D/g, "").slice(-4);
  return last4.length === 4 ? `+1 (•••) •••-${last4}` : "—";
}

type ProfileRow = {
  first_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();

  // Auth gate — logged-out viewers hit the login wall (mirrors
  // onboarding/page.tsx).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // The viewer's public.users.id — current_user_id(), NOT auth.uid() (same
  // resolution page.tsx uses). Authed but row-less (abandoned cold signup)
  // → onboarding, the surface that creates the row.
  const { data: uidData } = await supabase.rpc("current_user_id");
  const uid = (uidData as string | null) ?? null;
  if (!uid) redirect("/onboarding");

  // Own row only. The explicit self-pin is REQUIRED: the owner satisfies
  // is_owner(), so users_select_self_or_owner would otherwise return every
  // row (same trap page.tsx documents).
  const { data: profile } = await supabase
    .from("users")
    .select("first_name, phone, role, created_at")
    .eq("id", uid)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  const row = profile as ProfileRow;
  const rawName = (row.first_name ?? "").trim();
  const firstName = rawName !== "" ? rawName : "Player";
  // null gender → blue family always: gender-derived color is lobby-only
  // (D7.3); the viewer's stable users.id picks the shade.
  const avatar = getAvatar(null, uid);
  const maskedPhone = maskPhone(row.phone);
  const memberSince = MEMBER_SINCE_FMT.format(new Date(row.created_at));

  return (
    <main className="min-h-screen bg-wash">
      <div className="max-w-[390px] mx-auto px-5 pt-10 pb-36 flex flex-col gap-4">
        {/* Identity card */}
        <section className="bg-card border border-card-border rounded-2xl px-5 py-6 flex flex-col items-center text-center gap-1">
          <span
            className="w-16 h-16 rounded-full flex items-center justify-center text-[24px] font-semibold mb-2"
            style={{ backgroundColor: avatar.bg, color: avatar.fg }}
            aria-hidden="true"
          >
            {firstName.charAt(0).toUpperCase()}
          </span>
          <h1 className="font-serif text-[26px] font-bold text-ink leading-tight">
            {firstName}
          </h1>
          <p className="font-sans text-[14px] text-steel">{maskedPhone}</p>
          <p className="font-sans text-[12px] text-muted">
            Member since {memberSince}
          </p>
        </section>

        {/* Owner-only dashboard entry — outside the /dashboard route itself,
            this row is the app's ONLY owner-dashboard entry point (D16
            consolidation; the route re-gates on is_owner()). */}
        {row.role === "owner" && (
          <Link
            href="/dashboard"
            data-testid="profile-owner-dashboard"
            className="bg-card border border-card-border rounded-2xl px-5 min-h-[44px] flex items-center justify-between"
          >
            <span className="font-sans text-[15px] font-medium text-ink py-3">
              Owner dashboard
            </span>
            <ChevronRight size={18} className="text-steel" aria-hidden="true" />
          </Link>
        )}

        {/* Sign out — neutral outlined, ink text (no coral, no red) */}
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full min-h-[44px] rounded-xl bg-card border border-border-strong font-sans text-[15px] font-semibold text-ink"
          >
            Sign out
          </button>
        </form>

        {/* Footer links */}
        <p className="font-sans text-[13px] text-steel text-center pt-2">
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy
          </Link>
          <span className="mx-2 text-muted">·</span>
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>
        </p>
      </div>

      <BottomTabBar activeTab="profile" />
    </main>
  );
}
