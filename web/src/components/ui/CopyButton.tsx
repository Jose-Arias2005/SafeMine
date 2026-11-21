"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";

interface CopyButtonProps {
  value: string;
  /** Accessible name describing what is copied (required when icon-only). */
  label: string;
  /** Optional visible button text; when present, serves as the accessible name. */
  visibleLabel?: string;
  /** Hide visually until hovered or focused on pointer devices (always visible on touch). */
  revealOnHover?: boolean;
  className?: string;
}

let lastCopyAnnouncement = "";

function legacyCopy(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
  document.body.append(field);
  field.select();
  try {
    return document.execCommand("copy");
  } finally {
    field.remove();
  }
}

export function CopyButton({
  value,
  label,
  visibleLabel,
  revealOnHover = false,
  className = "",
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [announcement, setAnnouncement] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const report = (ok: boolean) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    let message = ok ? "Copiado" : "No se pudo copiar";
    // Ensure repeated identical messages are still announced by VoiceOver
    if (message === lastCopyAnnouncement) {
      message += "\u00A0";
    }
    lastCopyAnnouncement = message;

    setState(ok ? "copied" : "failed");
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));

    timerRef.current = window.setTimeout(() => {
      setState("idle");
      setAnnouncement("");
      timerRef.current = null;
    }, 2000);
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (!legacyCopy(value)) {
        throw new Error("Copy failed");
      }
      report(true);
    } catch {
      try {
        if (legacyCopy(value)) {
          report(true);
          return;
        }
      } catch {
        // ignore fallback failure
      }
      report(false);
    }
  };

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={visibleLabel ? undefined : label}
        data-copied={state === "copied" ? "" : undefined}
        data-failed={state === "failed" ? "" : undefined}
        className={`sm-copy-btn inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
          revealOnHover ? "sm-copy-reveal" : ""
        } ${className}`}
      >
        {state === "copied" ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        ) : state === "failed" ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        )}
        {visibleLabel && <span>{visibleLabel}</span>}
      </button>

      {/* Live region kept outside the button so screen readers reliably announce it */}
      <span
        role="status"
        data-visible={state !== "idle" ? "true" : "false"}
        className={`sm-copy-tip pointer-events-none absolute bottom-full right-0 mb-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium shadow-sm ${
          state === "failed"
            ? "bg-red-700 text-white"
            : "bg-slate-900 text-white"
        }`}
      >
        {announcement}
      </span>
    </span>
  );
}
