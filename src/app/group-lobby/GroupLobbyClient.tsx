"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import LobbyHeader from "@/components/LobbyHeader";
import CommitmentTracker from "@/components/CommitmentTracker";
import MemberAvatarStack from "@/components/MemberAvatarStack";
import ChatMessageList from "@/components/ChatMessageList";

import {
  assertSeedConsistency,
  getLockedSessionForDemo,
  getSessionMembers,
  getMessagesForSession,
  getSlotForSession,
  getVenueById,
  getUserById,
} from "@/lib/mockData";

type SkillStyle = "beg" | "advbeg" | "int" | "adv";

const SKILL_LEVEL_MAP: Record<string, { label: string; style: SkillStyle }> = {
  beginner:          { label: "Beginner",         style: "beg" },
  advanced_beginner: { label: "Adv. Beginner",    style: "advbeg" },
  intermediate:      { label: "Intermediate",     style: "int" },
  advanced:          { label: "Advanced",         style: "adv" },
};

const DAY_LABEL: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export default function GroupLobbyClient() {
  const router = useRouter();

  useEffect(() => {
    assertSeedConsistency();
  }, []);

  // Resolve data — all pure helpers, no mutations.
  const session = getLockedSessionForDemo();

  if (!session) {
    return (
      <main className="min-h-screen bg-wash flex items-center justify-center">
        <p className="font-sans text-sm text-ink-soft">No session found.</p>
      </main>
    );
  }

  const slot = getSlotForSession(session);
  if (!slot) return null;

  const venue = getVenueById(slot.venueId);
  const members = getSessionMembers(session.id);
  const skill = SKILL_LEVEL_MAP[slot.skill_level] ?? { label: slot.skill_level, style: "beg" as SkillStyle };

  const resolvedMessages = getMessagesForSession(session.id).map((msg) => {
    const author = getUserById(msg.userId);
    return {
      id: msg.id,
      author: {
        id: msg.userId,
        name: author?.name ?? "Unknown",
        avatar_color: author?.avatar_color ?? "#1A3650",
      },
      text: msg.text,
      timestamp: msg.timestamp,
    };
  });

  return (
    <main className="min-h-screen bg-wash pb-8">
      <div className="max-w-[390px] mx-auto px-5 pt-6 space-y-5">
        <LobbyHeader
          venueName={venue.name}
          venueNeighborhood={venue.neighborhood}
          dayLabel={DAY_LABEL[slot.day_of_week] ?? slot.day_of_week}
          timeLabel={slot.time_label}
          skillLabel={skill.label}
          skillStyle={skill.style}
          onBack={() => router.push("/")}
        />

        <CommitmentTracker filled={members.length} capacity={slot.capacity} />

        <MemberAvatarStack
          members={members.map((u) => ({
            id: u.id,
            name: u.name,
            avatar_color: u.avatar_color,
          }))}
        />

        <div>
          <h2 className="font-sans text-sm font-medium text-ink-soft mb-3">Chat</h2>
          <ChatMessageList messages={resolvedMessages} />
        </div>

        <button
          type="button"
          onClick={() => {
            console.log("[lobby] leave session — M5 wires reason prompt");
          }}
          className="w-full mt-4 bg-card border border-card-border text-ink-soft font-sans font-medium py-3 rounded-xl hover:bg-inset transition-colors"
        >
          Leave session
        </button>
      </div>
    </main>
  );
}
