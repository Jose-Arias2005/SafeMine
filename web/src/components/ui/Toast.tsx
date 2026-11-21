"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = "neutral" | "success" | "error";

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

declare global {
  interface Document {
    ariaNotify?: (announcement: string, options?: { priority?: "normal" | "high" }) => void;
  }
}

function isModalDialogOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector("dialog[open]"));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, number>>(new Map());
  const pendingRef = useRef<ToastItem[]>([]);
  const isFocusedRef = useRef(false);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const announce = useCallback((text: string) => {
    if (typeof document !== "undefined" && typeof document.ariaNotify === "function") {
      document.ariaNotify(text);
      return;
    }
    setLiveAnnouncement("");
    requestAnimationFrame(() => setLiveAnnouncement(text));
  }, []);

  const clearTimer = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (next.length === 0 && isFocusedRef.current) {
          isFocusedRef.current = false;
          requestAnimationFrame(() => {
            lastFocusRef.current?.focus();
          });
        }
        return next;
      });
    },
    [clearTimer]
  );

  const scheduleAutoDismiss = useCallback(
    (item: ToastItem) => {
      if (item.durationMs <= 0) return;
      clearTimer(item.id);
      const timer = window.setTimeout(() => {
        if (!isFocusedRef.current) {
          dismissToast(item.id);
        }
      }, item.durationMs);
      timersRef.current.set(item.id, timer);
    },
    [clearTimer, dismissToast]
  );

  const enqueueVisibleToast = useCallback(
    (item: ToastItem) => {
      setToasts((prev) => [...prev.slice(-2), item]);
      announce(item.message);
      scheduleAutoDismiss(item);
    },
    [announce, scheduleAutoDismiss]
  );

  const showToast = useCallback(
    ({ message, variant = "success", durationMs = 4500 }: ToastInput) => {
      const item: ToastItem = {
        id: nextIdRef.current++,
        message,
        variant,
        durationMs,
      };
      // Suppress toasts while a modal <dialog> is open; flush once the dialog closes.
      if (isModalDialogOpen()) {
        pendingRef.current.push(item);
        return;
      }
      enqueueVisibleToast(item);
    },
    [enqueueVisibleToast]
  );

  // Flush queued toasts when a modal dialog closes
  useEffect(() => {
    const handleDialogClose = () => {
      if (isModalDialogOpen() || pendingRef.current.length === 0) return;
      const queued = pendingRef.current.splice(0, pendingRef.current.length);
      queued.forEach((item) => enqueueVisibleToast(item));
    };

    document.addEventListener("close", handleDialogClose, true);
    return () => document.removeEventListener("close", handleDialogClose, true);
  }, [enqueueVisibleToast]);

  // Sync top-layer manual popover state
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    const supportsPopover =
      typeof HTMLElement !== "undefined" &&
      Object.hasOwn(HTMLElement.prototype, "popover");

    if (toasts.length > 0) {
      if (supportsPopover) {
        try {
          if (!el.matches(":popover-open")) {
            el.showPopover();
          }
        } catch {
          el.setAttribute("data-popover-open", "true");
        }
      } else {
        el.setAttribute("data-popover-open", "true");
      }
    } else {
      if (supportsPopover) {
        try {
          if (el.matches(":popover-open")) {
            el.hidePopover();
          }
        } catch {
          el.removeAttribute("data-popover-open");
        }
      } else {
        el.removeAttribute("data-popover-open");
      }
    }
  }, [toasts.length]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const handleRegionFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!isFocusedRef.current && e.relatedTarget instanceof HTMLElement) {
      lastFocusRef.current = e.relatedTarget;
    }
    isFocusedRef.current = true;
    toasts.forEach((t) => clearTimer(t.id));
  };

  const handleRegionBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    isFocusedRef.current = false;
    toasts.forEach((t) => scheduleAutoDismiss(t));
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      {/* Fallback live region for browsers without document.ariaNotify */}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <div
        ref={popoverRef}
        role="region"
        aria-label="Notificaciones"
        className="sm-toast"
        onFocus={handleRegionFocus}
        onBlur={handleRegionBlur}
        {...({ popover: "manual" } as React.HTMLAttributes<HTMLDivElement>)}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2.5 rounded-xl border bg-white px-3.5 py-2.5 text-xs shadow-md ${
              toast.variant === "error"
                ? "border-red-200 text-slate-900"
                : toast.variant === "success"
                ? "border-slate-200 text-slate-900"
                : "border-slate-200 text-slate-800"
            }`}
          >
            {toast.variant === "error" ? (
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
            ) : toast.variant === "success" ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
            ) : (
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
            )}
            <p className="flex-1 leading-relaxed text-slate-800">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar notificación"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return ctx;
}
