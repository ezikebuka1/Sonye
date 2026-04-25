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

import {
  assertSeedConsistency,
  seedUser,
  getSlotsForHome,
  getVenueById,
  getUsersForSlot,
  getFillRatio,
  type Slot,
} from "@/lib/mockData";
import { useAppStore } from "@/lib/store";

// Maps the 3-letter day_of_week abbreviation to a display string.
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

// Blue-palette avatar colors for the social proof strip.
const STRIP_AVATAR_COLORS = ["#1A3650", "#3A7CB8", "#5A9FD4", "#7FA8C9"];

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAppStore((s) => s.currentUser);

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

  const slots = getSlotsForHome();

  return (
    <main className="min-h-screen bg-wash pb-24">
      <div className="max-w-[390px] mx-auto px-5 pt-6 space-y-5">
        <Greeting name={currentUser?.onboarded ? currentUser.name : null} />

        <HeroText />

        <SocialProofStrip
          avatarColors={STRIP_AVATAR_COLORS}
          message="12 players active in Dallas this week"
        />

        {/* Onboarding banner — visible only until the user completes D7 7-field form */}
        {!currentUser?.onboarded && (
          <OnboardingBanner onClick={() => router.push("/onboarding")} />
        )}

        {/* Slot card list */}
        <div className="space-y-3">
          {slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slotId={slot.id}
              sport={slot.sport}
              skillLevel={slot.skill_level}
              dayLabel={dayLabelFor(slot.day_of_week)}
              timeLabel={slot.time_label}
              venueName={getVenueById(slot.venueId).name}
              fillRatio={getFillRatio(slot)}
              optedInUsers={getUsersForSlot(slot.id).map((u) => ({
                id: u.id,
                avatar_color: u.avatar_color,
              }))}
              capacity={slot.capacity}
              onJoin={(id) => console.log("join", id)} // TODO: D1 — wire real opt-in once state management is decided
            />
          ))}
        </div>
      </div>

      <BottomTabBar activeTab="home" />
    </main>
  );
}
