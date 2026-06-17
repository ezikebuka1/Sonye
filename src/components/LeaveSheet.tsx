"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Check } from "lucide-react";
import type { LeaveReasonCode } from "@/app/actions";
import type { LeaveSlot } from "./LeaveGameControl";
import { skillBadge } from "@/components/SlotCard";
import { formatCentral } from "@/lib/format-central";

// M5 (D16) — a JOINED player leaves their own game. Modeled EXACTLY on
// CancelSheet.tsx's Toast-based overlay (no Modal/Dialog primitive exists): a
// fixed dim scrim + a fixed slide-up panel, mounted via requestAnimationFrame,
// animated translate-y-full → translate-y-0, safe-area inset on the bottom.
//
// Two deliberate departures from CancelSheet:
//   1. The reason picker is a TRUE single-select RADIOGROUP (role="radiogroup"
//      / role="radio" / aria-checked, arrow-key navigation) — NOT aria-pressed
//      toggles. There is ZERO aria-pressed in this component.
//   2. The chip code and the optional note are kept SEPARATE (the code → the
//      coded p_leave_reason_code, the note → the free-text p_leave_reason_note)
//      — NOT composed into one string like cancel_slot's cancellation_reason.

type LeaveSheetProps = {
  slot: LeaveSlot;
  onClose: () => void;
  onConfirm: (reasonCode: LeaveReasonCode, note: string) => void;
  pending: boolean;
};

// The five leave reasons → the live leave_slot allow-list codes. DOM order is
// the radiogroup traversal order; the grid places found_other_game full-width.
const REASONS: { code: LeaveReasonCode; label: string }[] = [
  { code: "schedule_conflict", label: "Schedule conflict" },
  { code: "injured", label: "Injured or sick" },
  { code: "found_other_game", label: "Switching to another game" },
  { code: "no_longer_available", label: "Can't make it anymore" },
  { code: "other", label: "Other" },
];

export default function LeaveSheet({ slot, onClose, onConfirm, pending }: LeaveSheetProps) {
  const [visible, setVisible] = useState(false);
  const [selectedCode, setSelectedCode] = useState<LeaveReasonCode | null>(null);
  const [note, setNote] = useState("");
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Slide up from below the viewport on mount (Toast.tsx / CancelSheet pattern).
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { dayLabel, timeLabel } = formatCentral(slot.startsAt);
  const badge = skillBadge[slot.skillLevel];
  const w = slot.waitlistCount;

  const canConfirm = selectedCode !== null && !pending;

  // Dynamic consequence copy from waitlist_count (JOINED-leaver). NOT "this
  // can't be undone" — a player leave is recoverable (owner-cancel kills the
  // slot; a leave just frees the seat). The lost-seat cost IS the D9 friction.
  const consequenceBold =
    w > 0
      ? "Your spot will go to the next player on the waitlist."
      : "Your spot will open up for someone else.";

  function handleConfirm() {
    if (!canConfirm || selectedCode === null) return;
    onConfirm(selectedCode, note);
  }

  // Radiogroup keyboard model: roving selection. Arrow keys move to the
  // next/prev radio (wrapping), selecting AND focusing it; Space/Enter select
  // the focused radio. Only the selected radio (or the first, when none is
  // selected) sits in the tab order.
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = REASONS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      next = index === last ? 0 : index + 1;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      next = index === 0 ? last : index - 1;
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setSelectedCode(REASONS[index].code);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setSelectedCode(REASONS[next].code);
      radioRefs.current[next]?.focus();
    }
  }

  function rovingTabIndex(index: number): 0 | -1 {
    if (selectedCode === null) return index === 0 ? 0 : -1;
    return REASONS[index].code === selectedCode ? 0 : -1;
  }

  return (
    <>
      {/* Dim scrim — tap = "Keep my spot". */}
      <div
        data-testid="leave-backdrop"
        className="fixed inset-0 z-40 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        data-testid="leave-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Leave this game?"
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] rounded-t-3xl bg-card
          transition-transform duration-200
          ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div className="px-5 pt-3 space-y-4">
          {/* Grab handle */}
          <div className="mx-auto h-1 w-10 rounded-full bg-muted" aria-hidden="true" />

          {/* Heading */}
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Leave this game?
          </h2>

          {/* Game info: map-pin + venue (truncate) · skill chip · time */}
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-steel shrink-0" aria-hidden="true" />
            <span className="font-sans text-sm text-steel truncate">
              {slot.venueName}
            </span>
            <span
              className={`${badge.bg} ${badge.text} shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium`}
            >
              {badge.label}
            </span>
            <span className="font-sans text-sm text-steel shrink-0" aria-hidden="true">·</span>
            <span className="font-sans text-sm text-steel shrink-0">
              {dayLabel} · {timeLabel}
            </span>
          </div>

          {/* Consequence copy (dynamic on waitlist_count) */}
          <p
            data-testid="leave-consequence"
            className="font-sans text-[15px] leading-relaxed text-ink"
          >
            <strong>{consequenceBold}</strong>{" "}
            <span className="text-steel">
              {"You may not get it back, but you'll be free to join another game today."}
            </span>
          </p>

          {/* Reason picker — REQUIRED, single-select RADIOGROUP (no aria-pressed) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span id="leave-reason-label" className="font-sans text-sm font-medium text-ink">
                Why are you leaving?
              </span>
              <span className="rounded-full bg-inset px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">
                Required
              </span>
            </div>

            <div
              role="radiogroup"
              aria-labelledby="leave-reason-label"
              data-testid="leave-reason-group"
              className="grid grid-cols-2 gap-2"
            >
              {REASONS.map((r, i) => {
                const selected = selectedCode === r.code;
                return (
                  <button
                    key={r.code}
                    ref={(el) => {
                      radioRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={rovingTabIndex(i)}
                    data-testid={`reason-${r.code}`}
                    onClick={() => setSelectedCode(r.code)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-border-strong ${
                      r.code === "found_other_game" ? "col-span-2" : ""
                    } ${
                      selected
                        ? "bg-sky border border-border-strong text-ink"
                        : "bg-card border border-card-border text-ink"
                    }`}
                  >
                    {selected && <Check size={14} aria-hidden="true" />}
                    <span className="whitespace-nowrap">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional note — SEPARATE free-text param. WHITE field, steel
              placeholder (never dark-on-dark). */}
          <textarea
            data-testid="leave-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note (optional)"
            className="w-full rounded-xl border border-card-border bg-card p-3 text-sm text-ink placeholder:text-steel resize-none focus:outline-none focus:border-border-strong"
          />

          {/* Actions */}
          <div className="space-y-1 pt-1">
            <button
              type="button"
              data-testid="leave-confirm"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full rounded-xl bg-error py-2.5 font-sans font-medium text-[15px] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Leaving…" : "Leave game"}
            </button>
            <button
              type="button"
              data-testid="leave-keep"
              onClick={onClose}
              className="w-full py-2.5 text-center font-sans font-medium text-[15px] text-steel"
            >
              Keep my spot
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
