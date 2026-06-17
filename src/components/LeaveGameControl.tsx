"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { leaveSlotAction, type LeaveReasonCode } from "@/app/actions";
import LeaveSheet from "@/components/LeaveSheet";
import { type SkillLevel } from "@/components/SlotCard";
import { Toast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";

// View-model for the lobby leave control. Built server-side in
// group-lobby/page.tsx from the real `slots` row (member_count + the
// trigger-managed waitlist_count) + the slot_share_preview header data. Mirrors
// DashboardClient's OwnerSlot shape, scoped to the one slot the player is in.
export type LeaveSlot = {
  id: string;
  startsAt: string; // ISO timestamptz from slots.starts_at
  venueName: string;
  skillLevel: SkillLevel;
  capacity: number;
  memberCount: number; // slots.member_count (joined count)
  waitlistCount: number; // slots.waitlist_count (trigger-managed)
};

// The lobby's client island for the player-leave flow (D16). The server lobby
// (group-lobby/page.tsx) renders this ONLY for the viewing player's own joined
// membership AND only while starts_at > now() (strict — no owner 2h grace).
// The destructive weight lives in the sheet, so the entry point is a quiet,
// demoted red text link (per D15's cancel demotion).
export default function LeaveGameControl({ slot }: { slot: LeaveSlot }) {
  const router = useRouter();

  const toast = useAppStore((s) => s.toast);
  const dismissToast = useAppStore((s) => s.dismissToast);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  // Mirrors DashboardClient.handleConfirm: server client RPC, RAISE→typed
  // result, source-of-truth router.refresh() (NO optimistic mutation). The
  // chip code and the note are passed SEPARATELY to the action.
  function handleConfirm(reasonCode: LeaveReasonCode, note: string) {
    if (pending) return;
    setPending(true);
    startTransition(async () => {
      try {
        const result = await leaveSlotAction(slot.id, reasonCode, note);
        // ok OR not_joined (already resolved server-side) → done: toast, close,
        // refresh. The re-run lobby reflects the left membership + any promotion.
        if ("ok" in result || result.error === "not_joined") {
          useAppStore.getState().showToast({
            message: "You've left the game",
            variant: "success",
          });
          setOpen(false);
          router.refresh();
        } else {
          // not_found / invalid_reason / unknown — keep the sheet open to retry.
          useAppStore.getState().showToast({
            message: "Could not leave — try again",
            variant: "error",
          });
        }
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <>
      <div className="mt-4 text-center">
        <button
          type="button"
          data-testid={`leave-link-${slot.id}`}
          onClick={() => setOpen(true)}
          className="font-sans text-sm font-medium text-error"
        >
          Leave game
        </button>
      </div>

      {open && (
        <LeaveSheet
          slot={slot}
          pending={pending}
          onClose={() => setOpen(false)}
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
    </>
  );
}
