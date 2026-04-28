"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

import Greeting from "@/components/Greeting";
import HeroText from "@/components/HeroText";
import SocialProofStrip from "@/components/SocialProofStrip";
import OnboardingBanner from "@/components/OnboardingBanner";
import SlotCard from "@/components/SlotCard";
import BottomTabBar from "@/components/BottomTabBar";
import { Toast } from "@/components/Toast";

import {
  assertSeedConsistency,
  seedUser,
  sortSlotsForHome,
  getVenueById,
  getUserById,
  type Slot,
} from "@/lib/mockData";
import { useAppStore } from "@/lib/store";

function dayLabelFor(dow: Slot["day_of_week"]): string {
  const map: Record<Slot["day_of_week"], string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };
  return map[dow];
}

const STRIP_AVATAR_COLORS = ["#1A3650", "#3A7CB8", "#5A9FD4", "#7FA8C9"];

// Default avatar color for currentUser when their User object has no avatar_color.
// Form-submitted users get seedUser's avatar_color (#3A7CB8) set in onboarding/page.tsx.
const CURRENT_USER_AVATAR_FALLBACK = "#3A7CB8";

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentUser = useAppStore((s) => s.currentUser);
  const storeSlots = useAppStore((s) => s.slots);
  const toast = useAppStore((s) => s.toast);
  const dismissToast = useAppStore((s) => s.dismissToast);

  useEffect(() => {
    assertSeedConsistency();
  }, []);

  // Dev-only demo toggle: ?onboarded=1 seeds the store with the canned demo
  // identity, but only when the store is empty (never clobbers a real submitted user).
  useEffect(() => {
    if (searchParams.get("onboarded") === "1" && useAppStore.getState().currentUser === null) {
      useAppStore.getState().setUser(seedUser);
    }
  }, [searchParams]);

  const slots = sortSlotsForHome(Object.values(storeSlots));

  return (
    <main className="min-h-screen bg-wash pb-24">
      <div className="max-w-[390px] mx-auto px-5 pt-6 space-y-5">
        <Greeting name={currentUser?.onboarded ? currentUser.name : null} />

        <HeroText />

        <SocialProofStrip
          avatarColors={STRIP_AVATAR_COLORS}
          message="12 players active in Dallas this week"
        />

        {!currentUser?.onboarded && (
          <OnboardingBanner onClick={() => router.push("/onboarding")} />
        )}

        <div className="space-y-3">
          {slots.map((slot) => {
            const fillCount = slot.opted_in_user_ids.length;
            const isFull = fillCount >= slot.capacity;
            const isJoined = currentUser
              ? slot.opted_in_user_ids.includes(currentUser.id)
              : false;

            // Resolve avatar objects from the store slot's opted_in_user_ids.
            // currentUser (id = 'user-self') is not in the static users array,
            // so they get a special-cased fallback. joinSlot appends user.id
            // LAST, so their avatar is naturally rightmost in the stack.
            const optedInUsers = slot.opted_in_user_ids
              .map((id) => {
                if (currentUser && id === currentUser.id) {
                  return {
                    id: currentUser.id,
                    avatar_color: currentUser.avatar_color ?? CURRENT_USER_AVATAR_FALLBACK,
                  };
                }
                const u = getUserById(id);
                return u ? { id: u.id, avatar_color: u.avatar_color } : null;
              })
              .filter((u): u is { id: string; avatar_color: string } => u !== null);

            return (
              <SlotCard
                key={slot.id}
                slotId={slot.id}
                sport={slot.sport}
                skillLevel={slot.skill_level}
                dayLabel={dayLabelFor(slot.day_of_week)}
                timeLabel={slot.time_label}
                venueName={getVenueById(slot.venueId).name}
                fillCount={fillCount}
                capacity={slot.capacity}
                isJoined={isJoined}
                isFull={isFull}
                optedInUsers={optedInUsers}
                onJoin={() => {
                  if (!currentUser) {
                    // Unauthenticated tap: route to onboarding.
                    // M4 (D2) revisits this with SMS OTP / view-first auth.
                    router.push("/onboarding");
                    return;
                  }
                  useAppStore.getState().joinSlot(slot.id);
                }}
                onJoinWaitlist={() => {
                  useAppStore.getState().showToast({
                    message: "On the waitlist — we'll text you",
                    variant: "success",
                  });
                }}
              />
            );
          })}
        </div>
      </div>

      <BottomTabBar activeTab="home" />

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
