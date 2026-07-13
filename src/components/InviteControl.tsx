"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";

// The lobby's "Invite a friend" island (v1's final feature). The SERVER
// (group-lobby/page.tsx) composes every string and generates the QR SVG, then
// passes them as props — this island only owns the sheet open/close and the
// browser share/clipboard calls. Rendered for the owner + any active member
// (the only viewers who reach the lobby); anon never gets here.
//
// - `qrSvg`     server-generated SVG of `url` (ink #14304D on white, quiet zone)
// - `url`       absolute /slot/<id> link — the receiving end (unfurl already exists)
// - `shareText` voucher text, already MASKED via spotsClause (no raw sub-50% count)
// - `subtitle`  member-facing button subtitle (always true; shows the real count)
export type InviteControlProps = {
  qrSvg: string;
  url: string;
  shareText: string;
  subtitle: string;
};

export default function InviteControl({ qrSvg, url, shareText, subtitle }: InviteControlProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  // Feature-detect navigator.share on the client only (SSR-safe: server + first
  // client render agree on `false`, the effect reveals Share after mount). When
  // unavailable, Copy is the primary action and Share hides (per dispatch).
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Slide up from below the viewport on open (LeaveSheet / CancelSheet pattern).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  function close() {
    setVisible(false);
    setOpen(false);
  }

  async function handleShare() {
    try {
      await navigator.share({ text: shareText, url });
    } catch {
      // User-cancelled (AbortError) or unsupported mid-call → silent no-op.
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (rare) → no-op.
    }
  }

  // Inline data-URI so the server-generated SVG renders as an inert image (no
  // dangerouslySetInnerHTML; the <img> sandbox keeps the SVG non-executing). The
  // `#` in the ink color must be percent-encoded, which encodeURIComponent does.
  const qrSrc = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`;

  return (
    <>
      {/* Entry point: below the roster, above the wall. Coral primary, >=44px. */}
      <div className="mt-6">
        <button
          type="button"
          data-testid="invite-open"
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-coral font-sans text-[15px] font-semibold text-white transition-[filter] hover:brightness-95 active:brightness-90"
        >
          <Share2 size={18} aria-hidden="true" />
          Invite a friend
        </button>
        <p className="mt-1.5 text-center font-sans text-[13px] text-steel">{subtitle}</p>
      </div>

      {open && (
        <>
          {/* Dim scrim — tap to dismiss. */}
          <div
            data-testid="invite-backdrop"
            className="fixed inset-0 z-40 bg-ink/40"
            onClick={close}
            aria-hidden="true"
          />

          {/* Sheet panel */}
          <div
            data-testid="invite-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Invite a friend"
            className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] rounded-t-3xl bg-card transition-transform duration-200 ${
              visible ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          >
            <div className="px-5 pt-3 space-y-4">
              {/* Grab handle + close */}
              <div className="relative">
                <div className="mx-auto h-1 w-10 rounded-full bg-muted" aria-hidden="true" />
                <button
                  type="button"
                  data-testid="invite-close"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-0 top-0 -mt-2 flex h-11 w-11 items-center justify-center text-steel"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <h2 className="font-serif text-2xl font-semibold text-ink">Invite a friend</h2>

              {/* QR of the game link — server-generated SVG as an inert data-URI
                  image; the alt gives the accessible name the dispatch requires. */}
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-testid="invite-qr"
                  src={qrSrc}
                  alt="QR code linking to this game"
                  className="h-44 w-44 rounded-2xl border border-card-border bg-white p-3"
                />
              </div>

              {/* The link in a copyable pill (display; the Copy button copies). */}
              <div className="flex items-center rounded-xl bg-inset px-3 py-2.5">
                <span
                  data-testid="invite-link"
                  className="truncate font-sans text-[13px] text-steel"
                >
                  {url}
                </span>
              </div>

              {/* Actions: Share (primary when available) + Copy. Copy becomes the
                  primary when navigator.share is unavailable. */}
              <div className="space-y-2 pt-1">
                {canShare && (
                  <button
                    type="button"
                    data-testid="invite-share"
                    onClick={handleShare}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-coral font-sans text-[15px] font-semibold text-white transition-[filter] hover:brightness-95 active:brightness-90"
                  >
                    <Share2 size={18} aria-hidden="true" />
                    Share
                  </button>
                )}
                <button
                  type="button"
                  data-testid="invite-copy"
                  onClick={handleCopy}
                  className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl font-sans text-[15px] font-semibold transition-[filter] hover:brightness-95 active:brightness-90 ${
                    canShare
                      ? "border border-card-border bg-card text-ink"
                      : "bg-coral text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={18} aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={18} aria-hidden="true" />
                      Copy link
                    </>
                  )}
                </button>
              </div>

              <p className="text-center font-sans text-[13px] text-steel">
                They see the game before signing in
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
