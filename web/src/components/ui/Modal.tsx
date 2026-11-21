"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  /** Native <dialog closedby> policy: "any" (click outside + Esc), "closerequest" (Esc only), or "none". */
  closedBy?: "any" | "closerequest" | "none";
}

function isPointerOutsideDialog(e: PointerEvent, dialog: HTMLDialogElement): boolean {
  const rect = dialog.getBoundingClientRect();
  return (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-lg",
  closedBy = "any",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Native close/cancel sync + Safari fallback for closedby="any"
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onCloseRef.current();
    };

    const handleCancel = (e: Event) => {
      if (closedBy === "none") {
        e.preventDefault();
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);

    // Fallback light-dismiss where HTMLDialogElement.prototype.closedBy is unavailable (e.g. Safari)
    const needsLightDismissFallback =
      closedBy === "any" &&
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype);

    let pressedOutside = false;
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isPointerOutsideDialog(e, dialog);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isPointerOutsideDialog(e, dialog)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    if (needsLightDismissFallback) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
      if (needsLightDismissFallback) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
    };
  }, [closedBy]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      className={`sm-dialog ${maxWidthClass}`}
      {...({ closedby: closedBy } as React.DialogHTMLAttributes<HTMLDialogElement>)}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p id={subtitleId} className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar diálogo"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="sm-scroll overflow-y-auto p-6">{isOpen ? children : null}</div>
    </dialog>
  );
}
