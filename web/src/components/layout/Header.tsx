"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
} from "lucide-react";
import { BackendStatus } from "@/types";
import { getSystemStatus } from "@/services/apiClient";
import { useAuth } from "@/context/AuthContext";

function togglePopoverFallback(el: HTMLElement | null) {
  if (!el) return;
  const supportsPopover =
    typeof HTMLElement !== "undefined" &&
    Object.hasOwn(HTMLElement.prototype, "popover");
  if (supportsPopover) return;
  const open = el.getAttribute("data-popover-open") === "true";
  if (open) {
    el.removeAttribute("data-popover-open");
  } else {
    el.setAttribute("data-popover-open", "true");
  }
}

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<BackendStatus | null>(null);

  const systemPopoverId = useId();
  const accountPopoverId = useId();
  const systemPopoverRef = useRef<HTMLDivElement | null>(null);
  const accountPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getSystemStatus()
      .then((res) => setStatus(res))
      .catch(() => setStatus(null));
  }, [pathname]);

  // Lightweight dismiss fallback only when native Popover API is unavailable
  useEffect(() => {
    if (
      typeof HTMLElement !== "undefined" &&
      Object.hasOwn(HTMLElement.prototype, "popover")
    ) {
      return;
    }

    const closeAll = () => {
      systemPopoverRef.current?.removeAttribute("data-popover-open");
      accountPopoverRef.current?.removeAttribute("data-popover-open");
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        systemPopoverRef.current?.contains(target) ||
        accountPopoverRef.current?.contains(target)
      ) {
        return;
      }
      const trigger = (target as HTMLElement).closest?.("[popovertarget]");
      if (trigger) return;
      closeAll();
    };

    document.addEventListener("keydown", handleKey);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const portalLabel =
    pathname === "/"
      ? "Minera"
      : pathname.startsWith("/proveedores")
      ? "Proveedores"
      : "Portal Web";

  const initials = (user?.full_name || "SM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const roleLabel =
    user?.role === "MINERA"
      ? "Administración Minera"
      : user?.role === "PROVEEDOR"
      ? "Empresa Contratista"
      : "";

  const isSystemOnline = Boolean(status);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Marca compacta y contexto de portal (sin <h1> duplicado) */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href={user?.role === "PROVEEDOR" ? "/proveedores" : "/"}
            className="inline-flex items-center gap-2 rounded-lg py-1 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              SafeMine
            </span>
          </Link>
          <span className="text-slate-300" aria-hidden="true">
            /
          </span>
          <span className="truncate text-sm font-medium text-slate-600">
            {portalLabel}
          </span>
        </div>

        {/* Controles bajo demanda en una sola fila */}
        <div className="flex items-center gap-2">
          {/* Popover: Estado del sistema e integraciones */}
          <button
            type="button"
            onClick={() => togglePopoverFallback(systemPopoverRef.current)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            {...({ popoverTarget: systemPopoverId } as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isSystemOnline ? "bg-emerald-500" : "bg-slate-300"
              }`}
              aria-hidden="true"
            />
            <Activity className="h-3.5 w-3.5 text-slate-500 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">Sistema</span>
          </button>

          <div
            ref={systemPopoverRef}
            id={systemPopoverId}
            className="sm-popover w-72"
            {...({ popover: "auto" } as React.HTMLAttributes<HTMLDivElement>)}
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  Estado de Integraciones
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {isSystemOnline ? "En línea" : "Sin conexión"}
                </span>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 px-4 py-1 text-xs">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">Gemini IA</dt>
                <dd className="font-medium text-slate-900">
                  {status?.gemini_mode === "REAL_CLOUD" ? "Cloud API" : "Simulación"}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">AWS Rekognition</dt>
                <dd className="font-medium text-slate-900">
                  {status?.aws_mode === "REAL_CLOUD" ? "Cloud API" : "Simulación"}
                </dd>
              </div>
              {typeof status?.active_ws_clients === "number" && (
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Clientes WebSocket</dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {status.active_ws_clients}
                  </dd>
                </div>
              )}
            </dl>

            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600">
                <Smartphone
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <p>
                  <strong className="font-medium text-slate-800">SafeMine Mobile:</strong>{" "}
                  El fotocheck QR de operarios y el escáner de garita operan en la app móvil.
                </p>
              </div>
            </div>
          </div>

          {/* Popover: Perfil de usuario y cierre de sesión */}
          {user ? (
            <>
              <button
                type="button"
                onClick={() => togglePopoverFallback(accountPopoverRef.current)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                {...({ popoverTarget: accountPopoverId } as React.ButtonHTMLAttributes<HTMLButtonElement>)}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700"
                >
                  {initials}
                </span>
                <span className="hidden max-w-[140px] truncate sm:inline">
                  {user.full_name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </button>

              <div
                ref={accountPopoverRef}
                id={accountPopoverId}
                className="sm-popover w-64"
                {...({ popover: "auto" } as React.HTMLAttributes<HTMLDivElement>)}
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {user.full_name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                    {user.company_name || user.email}
                  </div>
                  {roleLabel && (
                    <div className="mt-1.5 text-[11px] font-medium text-slate-600">
                      {roleLabel}
                    </div>
                  )}
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Iniciar sesión</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
