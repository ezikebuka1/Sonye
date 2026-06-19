"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, MoreHorizontal, Send } from "lucide-react";

import {
  postLobbyMessageAction,
  removeLobbyMessageAction,
} from "@/app/actions";
import { CANNED_MESSAGES } from "@/lib/wall";
import { smsHref } from "@/lib/phone";
import { Toast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";

// D10-B lobby wall. Rendered ONLY for joined members + host (the server lobby
// excludes waitlisters) and ONLY while ends_at + 2h is in the future. Authors
// are resolved server-side via slot_wall(); this client never sees user_id —
// it receives the already-resolved name + avatar colors + flags.
//
// Colors (per the pre-flight token check):
//   • canned-chip check icon → text-success (#4BAE78 exists — reused, no new token)
//   • host Remove            → text-error  (#D64B4B exists — the established
//                              destructive red, same as LeaveSheet/cancel)
//   • coral (bg-coral)       → ONLY the Send button
// Everything else rides existing neutral tokens / D8.2 hexes already on screen.

export type WallMessageVM = {
  id: string;
  body: string;
  name: string; // "You" for self, else first name (or "Player" if unresolved)
  initial: string;
  avatarBg: string;
  avatarFg: string;
  time: string; // pre-formatted Central time, e.g. "6:14 PM"
  isSelf: boolean;
  isHost: boolean;
};

type LobbyWallProps = {
  slotId: string;
  closed: boolean;
  capacity: number;
  playerCount: number;
  messages: WallMessageVM[];
  messageCount: number; // closed-state recap only
  canPost: boolean; // viewer === 'joined' (RLS only lets joined members insert)
  canRemove: boolean; // is_owner() — host-only delete
  supportPhone: string | null;
  venueName: string;
  dayLabel: string;
};

function SelfBadge() {
  return (
    <span className="flex-shrink-0 rounded-full bg-[#E6F0FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#5E80A3]">
      you
    </span>
  );
}

function HostTag() {
  return (
    <span className="flex-shrink-0 rounded-full bg-[#DCEBFF] px-1.5 py-0.5 text-[10px] font-semibold text-[#15457B]">
      host
    </span>
  );
}

// Per-message action sheet — "…"/long-press → bottom sheet, modeled on
// LeaveSheet's overlay (fixed scrim + slide-up panel, rAF mount). Report shows
// for everyone; Remove only for the host.
function WallMessageSheet({
  message,
  canRemove,
  supportPhone,
  venueName,
  dayLabel,
  pending,
  onRemove,
  onClose,
}: {
  message: WallMessageVM;
  canRemove: boolean;
  supportPhone: string | null;
  venueName: string;
  dayLabel: string;
  pending: boolean;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Reuse the existing support contact (NEXT_PUBLIC_SUPPORT_PHONE via smsHref) —
  // omit the link entirely if unset (never sms:undefined). Copy says it goes to
  // Sonye (NOT a "safety team").
  const reportHref = supportPhone
    ? smsHref(
        supportPhone,
        `Reporting a message from the ${venueName} game on ${dayLabel}: "${message.body}"`,
      )
    : null;

  return (
    <>
      <div
        data-testid="wall-sheet-backdrop"
        className="fixed inset-0 z-40 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Message options"
        data-testid="wall-msg-sheet"
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] rounded-t-3xl bg-card transition-transform duration-200 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div className="px-5 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#9DB8D2]" aria-hidden="true" />
          <p className="truncate py-2 text-[12px] text-[#9DB8D2]">
            {message.name}: {message.body}
          </p>

          {reportHref && (
            <a
              href={reportHref}
              data-testid="wall-report"
              className="block border-t border-[#CFE0F4] py-3 text-[15px] font-medium text-[#14304D]"
            >
              Report
              <span className="block text-[12px] font-normal text-[#9DB8D2]">
                Sends it to Sonye
              </span>
            </a>
          )}

          {canRemove && (
            <button
              type="button"
              data-testid="wall-remove"
              disabled={pending}
              onClick={onRemove}
              className="block w-full border-t border-[#CFE0F4] py-3 text-left text-[15px] font-medium text-error disabled:opacity-50"
            >
              {pending ? "Removing…" : "Remove"}
            </button>
          )}

          <button
            type="button"
            data-testid="wall-sheet-cancel"
            onClick={onClose}
            className="block w-full border-t border-[#CFE0F4] py-3 text-center text-[15px] font-medium text-[#5E80A3]"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

export default function LobbyWall(props: LobbyWallProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [composerText, setComposerText] = useState("");
  const [sheetFor, setSheetFor] = useState<WallMessageVM | null>(null);

  const toast = useAppStore((s) => s.toast);
  const dismissToast = useAppStore((s) => s.dismissToast);

  // Single post path for the composer AND the canned chips. Canned chips submit
  // on tap with NO Send button; the composer clears its field on success. Both
  // settle via router.refresh() → the re-run server lobby re-fetches slot_wall.
  function post(body: string, isComposer: boolean) {
    const text = body.trim();
    if (!text || isPending) return;
    startTransition(async () => {
      const result = await postLobbyMessageAction(props.slotId, text);
      if ("ok" in result) {
        if (isComposer) setComposerText("");
        router.refresh();
      } else {
        useAppStore.getState().showToast({
          message:
            result.error === "closed"
              ? "Chat's closed for this game"
              : "Couldn't send — try again",
          variant: "error",
        });
      }
    });
  }

  function remove(messageId: string) {
    if (isPending) return;
    startTransition(async () => {
      const result = await removeLobbyMessageAction(messageId);
      if ("ok" in result) {
        setSheetFor(null);
        router.refresh();
      } else {
        useAppStore.getState().showToast({
          message: "Couldn't remove — try again",
          variant: "error",
        });
      }
    });
  }

  // ── CLOSED: ends_at + 2h has passed. No message content was fetched — only a
  // recap count. ───────────────────────────────────────────────────────────
  if (props.closed) {
    const closedReportHref = props.supportPhone
      ? smsHref(
          props.supportPhone,
          `Reporting something from the ${props.venueName} game on ${props.dayLabel}:`,
        )
      : null;
    return (
      <section className="mt-6" data-testid="wall-closed">
        <div className="rounded-2xl border border-[#CFE0F4] bg-white px-5 py-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F0FF] text-[#5E80A3]">
            <Lock size={18} aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-[16px] font-bold text-[#14304D]">
            Chat&apos;s wrapped up
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-[#5E80A3]">
            This game&apos;s chat closed 2 hours after game time.
          </p>
          <p
            data-testid="wall-recap"
            className="mt-3 text-[12px] font-semibold text-[#5E80A3] [font-variant-numeric:tabular-nums]"
          >
            {props.playerCount} {props.playerCount === 1 ? "player" : "players"} ·{" "}
            {props.messageCount} {props.messageCount === 1 ? "message" : "messages"}
          </p>
          {closedReportHref && (
            <a
              href={closedReportHref}
              data-testid="wall-closed-report"
              className="mt-4 inline-block text-[12px] text-[#5E80A3] underline underline-offset-2"
            >
              Report something from this game
            </a>
          )}
          <p className="mt-3 text-[11px] leading-snug text-[#9DB8D2]">
            Messages are kept privately for safety, not shown again.
          </p>
        </div>
      </section>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  return (
    <section className="mt-6" data-testid="wall-active">
      <h2 className="text-[16px] font-bold text-[#14304D]">Game chat</h2>
      <p className="mt-1 flex items-center gap-1 text-[12px] text-[#5E80A3]">
        <Lock size={11} aria-hidden="true" />
        Only the {props.capacity} of you · closes 2h after
      </p>

      {/* Message list */}
      <div
        data-testid="wall-list"
        className="mt-3 overflow-hidden rounded-2xl border border-[#CFE0F4] bg-white"
      >
        {props.messages.length === 0 ? (
          <p className="px-4 py-5 text-center text-[13px] text-[#9DB8D2]">
            No messages yet{props.canPost ? " — say you’re on your way 👋" : ""}
          </p>
        ) : (
          <div className="divide-y divide-[#CFE0F4]">
            {props.messages.map((m) => (
              <div
                key={m.id}
                data-testid="wall-message"
                className="flex items-start gap-3 px-4 py-3"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                  style={{ backgroundColor: m.avatarBg, color: m.avatarFg }}
                >
                  {m.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-[#14304D]">
                      {m.name}
                    </span>
                    {m.isSelf && <SelfBadge />}
                    {m.isHost && <HostTag />}
                    <span className="ml-auto flex-shrink-0 text-[11px] text-[#9DB8D2] [font-variant-numeric:tabular-nums]">
                      {m.time}
                    </span>
                  </div>
                  <p className="mt-0.5 break-words text-[14px] leading-snug text-[#14304D]">
                    {m.body}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Message options"
                  data-testid={`wall-msg-menu-${m.id}`}
                  onClick={() => setSheetFor(m)}
                  className="-mr-1 -mt-1 flex-shrink-0 p-1 text-[#9DB8D2]"
                >
                  <MoreHorizontal size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer — joined members only (RLS only lets joined members insert) */}
      {props.canPost && (
        <>
          <div data-testid="wall-canned" className="mt-3 flex flex-wrap gap-2">
            {CANNED_MESSAGES.map((c) => (
              <button
                key={c.key}
                type="button"
                data-testid={`wall-canned-${c.key}`}
                disabled={isPending}
                onClick={() => post(c.body, false)}
                className="flex items-center gap-1.5 rounded-full border border-[#CFE0F4] bg-white px-3 py-1.5 text-[13px] font-medium text-[#14304D] disabled:opacity-50"
              >
                <Check size={13} className="text-success" aria-hidden="true" />
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  post(composerText, true);
                }
              }}
              placeholder="Message the group…"
              maxLength={2000}
              data-testid="wall-composer-input"
              className="min-w-0 flex-1 rounded-xl border border-[#CFE0F4] bg-white px-3 py-2.5 text-[14px] text-[#14304D] placeholder:text-[#9DB8D2] focus:border-[#B7D2EE] focus:outline-none"
            />
            <button
              type="button"
              data-testid="wall-composer-send"
              disabled={isPending || composerText.trim().length === 0}
              onClick={() => post(composerText, true)}
              className="flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-coral px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              <Send size={14} aria-hidden="true" />
              Send
            </button>
          </div>
        </>
      )}

      <p
        data-testid="wall-footer"
        className="mt-3 text-center text-[11px] leading-snug text-[#9DB8D2]"
      >
        Sonye won&apos;t text you about chat — peek in when you head over.
      </p>

      {sheetFor && (
        <WallMessageSheet
          message={sheetFor}
          canRemove={props.canRemove}
          supportPhone={props.supportPhone}
          venueName={props.venueName}
          dayLabel={props.dayLabel}
          pending={isPending}
          onRemove={() => remove(sheetFor.id)}
          onClose={() => setSheetFor(null)}
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
    </section>
  );
}
