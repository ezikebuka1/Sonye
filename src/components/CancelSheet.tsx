"use client";

import { useState, useEffect } from "react";
import { MapPin, Check } from "lucide-react";
import type { OwnerSlot } from "@/app/dashboard/DashboardClient";
import { formatCentral } from "@/lib/format-central";

// There is no Modal/Dialog/BottomSheet primitive in the app. This sheet is
// modeled on Toast.tsx's overlay mechanics: a fixed full-screen scrim + a fixed
// slide-up panel, mounted via requestAnimationFrame, animated translate-y-full
// → translate-y-0, safe-area inset on the bottom. (D7: ONE reason question, no
// reschedule control anywhere.)

type CancelSheetProps = {
  slot: OwnerSlot;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  pending: boolean;
};

// The four cancel reasons. The composed cancellation_reason uses the LABEL.
const REASONS: { value: string; label: string }[] = [
  { value: "weather", label: "Weather" },
  { value: "not_enough", label: "Not enough players" },
  { value: "venue", label: "Venue issue" },
  { value: "other", label: "Other" },
];

export default function CancelSheet({ slot, onClose, onConfirm, pending }: CancelSheetProps) {
  const [visible, setVisible] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Slide up from below the viewport on mount (Toast.tsx pattern).
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { dayLabel, timeLabel } = formatCentral(slot.startsAt);
  const m = slot.memberCount;
  const w = slot.waitlistCount;

  // Composed reason: the chip label, plus the note when non-empty. cancel_slot
  // stores this single free-text cancellation_reason.
  const chipLabel = REASONS.find((r) => r.value === selectedValue)?.label ?? "";
  const composedReason = note.trim() ? `${chipLabel} — ${note.trim()}` : chipLabel;

  const canConfirm = selectedValue !== null && !pending;

  // Dynamic consequence copy from memberCount + waitlistCount. Cancellation
  // FREES the joined players' daily game limit and CLEARS the waitlist — it was
  // never capped. Bold: the joined-players phrase, the waitlist phrase, and the
  // final "This can't be undone."; the parenthetical is steel.
  const playerBold =
    m === 1
      ? "Cancels the game for the 1 joined player"
      : `Cancels the game for all ${m} joined players`;
  const waitlistBold =
    w === 0
      ? null
      : w === 1
        ? " and clears the 1-person waitlist"
        : ` and clears the ${w}-person waitlist`;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(composedReason);
  }

  return (
    <>
      {/* Dim scrim — tap = "Keep this game". */}
      <div
        data-testid="cancel-backdrop"
        className="fixed inset-0 z-40 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        data-testid="cancel-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Cancel this game?"
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
            Cancel this game?
          </h2>

          {/* Game info */}
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-steel shrink-0" aria-hidden="true" />
            <span className="font-sans text-sm text-steel">
              {slot.venueName} · {dayLabel} · {timeLabel}
            </span>
          </div>

          {/* Consequence copy (dynamic) */}
          <p
            data-testid="cancel-consequence"
            className="font-sans text-[15px] leading-relaxed text-ink"
          >
            {m === 0 ? (
              <>
                Cancels the game. <strong>{"This can't be undone."}</strong>
              </>
            ) : (
              <>
                <strong>{playerBold}</strong>{" "}
                <span className="text-steel">(freeing up their daily game limit)</span>
                {waitlistBold ? (
                  <>
                    <strong>{waitlistBold}</strong>
                  </>
                ) : null}
                {". "}
                <strong>{"This can't be undone."}</strong>
              </>
            )}
          </p>

          {/* Reason picker (required) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-medium text-ink">
                Why are you cancelling?
              </span>
              <span className="rounded-full bg-inset px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel">
                Required
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => {
                const selected = selectedValue === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    data-testid={`reason-${r.value}`}
                    onClick={() => setSelectedValue(r.value)}
                    aria-pressed={selected}
                    className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors ${
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

          {/* Optional note — WHITE field, steel placeholder (never dark) */}
          <textarea
            data-testid="cancel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note (optional) — e.g. courts flooded"
            className="w-full rounded-xl border border-card-border bg-card p-3 text-sm text-ink placeholder:text-steel resize-none focus:outline-none focus:border-border-strong"
          />

          {/* Actions */}
          <div className="space-y-1 pt-1">
            <button
              type="button"
              data-testid="cancel-confirm"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full rounded-xl bg-error py-2.5 font-sans font-medium text-[15px] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Cancelling…" : "Cancel game"}
            </button>
            <button
              type="button"
              data-testid="cancel-keep"
              onClick={onClose}
              className="w-full py-2.5 text-center font-sans font-medium text-[15px] text-ink"
            >
              Keep this game
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
