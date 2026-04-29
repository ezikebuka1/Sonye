"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ToastProps {
  message: string;
  action?: { label: string; onClick: () => void };
  variant: "error" | "success";
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

// Accent color per variant. #88D7A0 (success green) is hardcoded at M2.2 —
// no D8 token exists yet. See D5 doc for when to add it.
const ACCENT: Record<"error" | "success", string> = {
  error: "#D4724A",
  success: "#88D7A0",
};

export function Toast({ message, action, variant, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // Slide down from above viewport on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-dismiss after 5s
  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [onDismiss]);

  function handleAction() {
    action?.onClick();
    onDismiss();
  }

  return (
    <>
      {/* Transparent backdrop — tap anywhere outside toast to dismiss */}
      <div
        className="fixed inset-0 z-40"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Toast panel */}
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed left-4 right-4 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg
          bg-ink text-white
          transition-transform duration-200
          ${visible ? "translate-y-0" : "-translate-y-full"}`}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        {/* Variant dot */}
        <div
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: ACCENT[variant] }}
          aria-hidden="true"
        />

        {/* Message */}
        <span className="flex-1 font-sans text-sm font-medium">{message}</span>

        {/* Action */}
        {action && (
          <button
            type="button"
            onClick={handleAction}
            className="font-sans text-sm font-semibold underline shrink-0"
            style={{ color: ACCENT[variant] }}
          >
            {action.label}
          </button>
        )}

        {/* Dismiss X */}
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-white/70 hover:text-white"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    </>
  );
}
