"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Check, Users, Plus } from "lucide-react";

import { cancelSlotAction } from "../actions";
import CancelSheet from "@/components/CancelSheet";
import { skillBadge, type SkillLevel } from "@/components/SlotCard";
import { formatCentral } from "@/lib/format-central";
import { Toast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";

// View-model for one owner-dashboard card. Built server-side in
// dashboard/page.tsx from real `slots` rows. Extends the Home FeedSlot shape
// with waitlistCount (the owner must see waitlist demand) and drops the
// viewer-membership field (the owner relates to every slot as its creator).
export type OwnerSlot = {
  id: string;
  startsAt: string; // ISO timestamptz from slots.starts_at
  venueName: string;
  skillLevel: SkillLevel;
  capacity: number;
  memberCount: number; // slots.member_count (joined count)
  waitlistCount: number; // slots.waitlist_count
};

// Coral OUTLINE link to the create-slot flow (header + empty-state CTA).
function NewSlotButton() {
  return (
    <a
      href="/create-slot"
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-coral px-3 py-2 font-sans text-sm font-medium text-coral transition-colors hover:bg-coral/5"
    >
      <Plus size={16} aria-hidden="true" />
      New slot
    </a>
  );
}

export default function DashboardClient({ slots }: { slots: OwnerSlot[] }) {
  const router = useRouter();

  const toast = useAppStore((s) => s.toast);
  const dismissToast = useAppStore((s) => s.dismissToast);

  // Which slot's cancel sheet is open, and the in-flight lock (mirrors
  // HomeClient's pendingId + startTransition — NOT the Zustand mock store).
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  const openSlot = openSlotId ? slots.find((s) => s.id === openSlotId) ?? null : null;

  function handleConfirm(reason: string) {
    const slotId = openSlotId;
    if (!slotId || pending) return;
    setPending(true);
    startTransition(async () => {
      try {
        const result = await cancelSlotAction(slotId, reason);
        if ("ok" in result) {
          useAppStore.getState().showToast({ message: "Game cancelled", variant: "success" });
          setOpenSlotId(null);
          router.refresh(); // re-runs the server query; the cancelled slot drops off
        } else if (result.error === "already_cancelled") {
          // Lost the race — the slot is already gone; close + refresh so it drops.
          useAppStore.getState().showToast({
            message: "That game was already cancelled",
            variant: "error",
          });
          setOpenSlotId(null);
          router.refresh();
        } else {
          // forbidden / reason_required / unknown — keep the sheet open to retry.
          useAppStore.getState().showToast({
            message: "Could not cancel — try again",
            variant: "error",
          });
        }
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <main className="min-h-screen bg-wash pb-24">
      <div className="max-w-[390px] mx-auto px-5 pt-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-semibold text-ink">Your games</h1>
          <NewSlotButton />
        </div>

        {slots.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center gap-4 pt-16">
            <p className="font-sans text-steel">No upcoming games</p>
            <NewSlotButton />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-sans text-xs font-semibold uppercase tracking-wide text-steel">
              Upcoming
            </p>

            {slots.map((slot) => {
              const { dayLabel, timeLabel } = formatCentral(slot.startsAt);
              const badge = skillBadge[slot.skillLevel];
              const isFull = slot.memberCount >= slot.capacity;
              const showDemand = isFull && slot.waitlistCount > 0;

              return (
                <article
                  key={slot.id}
                  data-slot-id={slot.id}
                  className="bg-card rounded-2xl border border-[0.5px] border-card-border p-4 space-y-3"
                >
                  {/* Top row: venue (single line) + skill chip */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans font-semibold text-ink truncate">
                      {slot.venueName}
                    </span>
                    <span
                      className={`${badge.bg} ${badge.text} shrink-0 rounded-full px-2.5 py-1 text-xs font-medium`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Meta row: date · time */}
                  <div className="flex items-center gap-1.5 font-sans text-sm text-steel">
                    <Calendar size={14} className="shrink-0" aria-hidden="true" />
                    <span>{dayLabel}</span>
                    <span aria-hidden="true">·</span>
                    <Clock size={14} className="shrink-0" aria-hidden="true" />
                    <span>{timeLabel}</span>
                  </div>

                  {/* Fill row — always shown (owner sees every slot's fill) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: slot.capacity }, (_, i) => {
                        const filled = i < slot.memberCount;
                        return (
                          <span
                            key={i}
                            data-testid={filled ? "dot-filled" : "dot-empty"}
                            className={`h-[11px] w-[11px] rounded-full ${
                              filled
                                ? "bg-ink"
                                : "border-[1.5px] border-border-strong bg-transparent"
                            }`}
                            aria-hidden="true"
                          />
                        );
                      })}
                    </div>
                    {isFull ? (
                      <span
                        data-testid="fill-label"
                        className="flex items-center gap-1 font-sans text-sm font-medium text-success"
                      >
                        <Check size={15} aria-hidden="true" />
                        {slot.capacity} / {slot.capacity} full
                      </span>
                    ) : (
                      <span
                        data-testid="fill-label"
                        className="font-sans text-sm font-medium text-ink"
                      >
                        {slot.memberCount} / {slot.capacity} joined
                      </span>
                    )}
                  </div>

                  {/* Waitlist demand — only when full AND there's a waitlist */}
                  {showDemand && (
                    <div data-testid="waitlist-demand" className="space-y-2">
                      <div className="flex items-center gap-1.5 rounded-xl bg-inset px-3 py-2">
                        <Users size={15} className="text-ink shrink-0" aria-hidden="true" />
                        <span className="font-sans text-sm font-medium text-ink">
                          {slot.waitlistCount}{" "}
                          {slot.waitlistCount === 1 ? "player" : "players"} on the waitlist
                        </span>
                      </div>
                      <a
                        href="/create-slot"
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-coral py-2.5 font-sans font-medium text-[15px] text-white transition-colors hover:brightness-95 active:brightness-90"
                      >
                        <Plus size={16} aria-hidden="true" />
                        Open another slot
                      </a>
                    </div>
                  )}

                  {/* Cancel — a quiet red text link (the weight lives in the sheet) */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      data-testid={`cancel-link-${slot.id}`}
                      onClick={() => setOpenSlotId(slot.id)}
                      className="font-sans text-sm font-medium text-error"
                    >
                      Cancel game
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {openSlot && (
        <CancelSheet
          slot={openSlot}
          pending={pending}
          onClose={() => setOpenSlotId(null)}
          onConfirm={handleConfirm}
        />
      )}

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
