"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { joinSlotAction } from "./actions";
import Greeting from "@/components/Greeting";
import HeroText from "@/components/HeroText";
import SocialProofStrip from "@/components/SocialProofStrip";
import OnboardingBanner from "@/components/OnboardingBanner";
import SlotCard from "@/components/SlotCard";
import BottomTabBar from "@/components/BottomTabBar";
import { Toast } from "@/components/Toast";

import { useAppStore } from "@/lib/store";
import { formatCentral } from "@/lib/format-central";

// View-model for one Home-feed card. Built server-side in page.tsx from real
// `slots` rows (D13 — all-server feed). HomeClient renders; it never fetches.
export type FeedSlot = {
  id: string;
  startsAt: string; // ISO timestamptz from slots.starts_at
  venueName: string;
  skillLevel: "beginner" | "advanced_beginner" | "intermediate" | "advanced";
  capacity: number;
  fillCount: number; // slots.member_count (joined count)
  genderCategory: "open" | "women" | "men";
  membershipStatus: "joined" | "waitlisted" | null; // viewer's ACTIVE row, else null
};

const STRIP_AVATAR_COLORS = ["#1A3650", "#3A7CB8", "#5A9FD4", "#7FA8C9"];

export default function HomeClient({
  slots,
  firstName,
  isOwner = false,
}: {
  slots: FeedSlot[];
  firstName: string | null; // viewer's public.users.first_name (D13 — server-fetched), null if unset
  isOwner?: boolean; // M5 rider — gates the owner-only Dashboard nav entry
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toast = useAppStore((s) => s.toast);
  const dismissToast = useAppStore((s) => s.dismissToast);

  // Per-card join state (Dispatch 2, D13). `pendingId` = the one card whose
  // join_slot Server Action is in flight (others unaffected); `cancelledIds` =
  // cards join_slot reported as cancelled, locked in place this session.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  // Read ?toast= params from Server Action redirects (join / onboarding) and
  // dispatch to the toast store, then clean the URL so it doesn't re-fire.
  useEffect(() => {
    const toastKey = searchParams.get("toast");
    if (!toastKey) return;

    const slotDesc = searchParams.get("slot") ?? "your game";
    const decoded = decodeURIComponent(slotDesc);

    const TOAST_MAP: Record<string, { message: string; variant: "success" | "error" }> = {
      joined:     { message: `you're in — ${decoded}`, variant: "success" },
      waitlisted: { message: "On the waitlist — we'll text you", variant: "success" },
      welcomed:   { message: "you're all set — find your game", variant: "success" },
      cancelled:  { message: "That game was cancelled", variant: "error" },
      d9:         { message: "You're already in a game today. Leave that one or complete it to join another.", variant: "error" },
    };

    const entry = TOAST_MAP[toastKey];
    if (entry) {
      useAppStore.getState().showToast({ message: entry.message, variant: entry.variant });
    }

    router.replace("/");
  }, [searchParams, router]);

  // Single join flow for both buttons — join_slot decides joined-vs-waitlisted
  // (D13). Maps the five locked outcomes: JOINED redirects server-side to the
  // lobby (no toast); WAITLISTED → success toast + router.refresh() flips the
  // card to "On the waitlist"; COLLISION → error toast, button returns pre-tap;
  // CANCELLED → error toast + the card locks to a disabled "Cancelled", no nav.
  const handleJoin = useCallback(
    (slotId: string) => {
      if (pendingId) return; // one join in flight at a time
      setPendingId(slotId);
      startTransition(async () => {
        try {
          const result = await joinSlotAction(slotId);
          // 'joined' (and route-only edge cases) redirect server-side — we only
          // reach here when the outcome stays on Home, so result is defined.
          if (result && "status" in result && result.status === "waitlisted") {
            useAppStore.getState().showToast({
              message: "On the waitlist — we'll text you",
              variant: "success",
            });
            router.refresh(); // re-fetch the real membership → "On the waitlist"
          } else if (result && "error" in result) {
            if (result.error === "collision") {
              useAppStore.getState().showToast({
                message:
                  "You're already in a game today. Leave that one or complete it to join another.",
                variant: "error",
              });
            } else if (result.error === "cancelled") {
              useAppStore.getState().showToast({
                message: "That game was cancelled",
                variant: "error",
              });
              setCancelledIds((prev) => new Set(prev).add(slotId));
            }
          }
        } finally {
          setPendingId(null);
        }
      });
    },
    [pendingId, router],
  );

  return (
    <main className="min-h-screen bg-wash pb-24">
      <div className="max-w-[390px] mx-auto px-5 pt-6 space-y-5">
        <Greeting name={firstName} />

        <HeroText />

        <SocialProofStrip
          avatarColors={STRIP_AVATAR_COLORS}
          message="12 players active in Dallas this week"
        />

        {!firstName && (
          <OnboardingBanner onClick={() => router.push("/onboarding")} />
        )}

        <div className="space-y-3">
          {slots.map((slot) => {
            const { dayLabel, timeLabel } = formatCentral(slot.startsAt);
            const isFull = slot.fillCount >= slot.capacity;

            // Neutral fill dots (D8.1): opaque keys only — no identities, no
            // gender color on the Home feed. Count feeds the existing rule.
            const optedInUsers = Array.from({ length: slot.fillCount }, (_, i) => ({
              id: `${slot.id}-fill-${i}`,
            }));

            return (
              <SlotCard
                key={slot.id}
                slotId={slot.id}
                skillLevel={slot.skillLevel}
                dayLabel={dayLabel}
                timeLabel={timeLabel}
                venueName={slot.venueName}
                fillCount={slot.fillCount}
                capacity={slot.capacity}
                membershipStatus={slot.membershipStatus}
                isFull={isFull}
                optedInUsers={optedInUsers}
                genderCategory={slot.genderCategory}
                pending={pendingId === slot.id}
                cancelled={cancelledIds.has(slot.id)}
                onJoin={handleJoin}
                onJoinWaitlist={handleJoin}
              />
            );
          })}
        </div>
      </div>

      <BottomTabBar activeTab="home" isOwner={isOwner} />

      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          variant={toast.variant}
          onDismiss={dismissToast}
        />
      )}
    </main>
  );
}
