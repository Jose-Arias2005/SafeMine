"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Briefcase,
  HardHat,
  Camera,
  Cpu,
  Radio,
  ShieldCheck,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { BackendStatus } from "@/types";
import { getSystemStatus } from "@/services/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    getSystemStatus()
      .then((res) => setStatus(res))
      .catch(() => setStatus(null));
  }, [pathname]);

  const getModuleTitle = () => {
    if (pathname === "/") return "Portal de Administración — Minera";
    if (pathname.startsWith("/proveedores"))
      return "Portal de Empresas Contratistas — Proveedores";
    if (pathname.startsWith("/trabajadores"))
      return "Portal de Acreditación del Operario — Trabajadores";
    if (pathname.startsWith("/kiosco"))
      return "Control de Acceso en Garita — Kiosco IA & Arduino";
    return "SafeMine AI";
  };

  const getMobileLinks = () => {
    if (!user) {
      return [{ href: "/kiosco", label: "Kiosco Garita", icon: Camera }];
    }
    if (user.role === "MINERA") {
      return [
        { href: "/", label: "Panel Minera", icon: Building2 },
        { href: "/kiosco", label: "Kiosco Garita", icon: Camera },
      ];
    }
    if (user.role === "PROVEEDOR") {
      return [{ href: "/proveedores", label: "Portal Proveedor", icon: Briefcase }];
    }
    if (user.role === "TRABAJADOR") {
      return [{ href: "/trabajadores", label: "Portal Trabajador", icon: HardHat }];
    }
    return [];
  };

  const mobileLinks = getMobileLinks();

  const renderRoleBadge = () => {
    if (!user) return null;
    if (user.role === "MINERA") {
      return (
        <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
          MINERA
        </span>
      );
    }
    if (user.role === "PROVEEDOR") {
      return (
        <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
          PROVEEDOR
        </span>
      );
    }
    if (user.role === "TRABAJADOR") {
      return (
        <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
          TRABAJADOR
        </span>
      );
    }
    return null;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h1 className="text-sm sm:text-base font-semibold text-slate-900">
            {getModuleTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Indicadores de IA y Cloud */}
          <div className="hidden xl:flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-600" />
              <span>Gemini IA:</span>
              <strong className="text-slate-900">
                {status?.gemini_mode === "REAL_CLOUD" ? "Cloud API" : "Simulación"}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-emerald-600" />
              <span>AWS Rekognition:</span>
              <strong className="text-slate-900">
                {status?.aws_mode === "REAL_CLOUD" ? "Cloud API" : "Simulación"}
              </strong>
            </span>
          </div>

          {/* Datos de Sesión del Usuario Autenticado & Botón Logout */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {user.full_name}
                  </span>
                  {renderRoleBadge()}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  {user.company_name || (user.dni ? `DNI: ${user.dni}` : user.email)}
                </div>
              </div>

              {/* Botón Cerrar Sesión */}
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors shadow-2xs"
                title="Cerrar sesión actual"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Iniciar Sesión</span>
            </Link>
          )}
        </div>
      </div>

      {/* Navegación móvil aislada por rol */}
      <div className="flex lg:hidden border-t border-slate-100 bg-slate-50 px-3 py-2 items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {mobileLinks.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {user && (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
        )}
      </div>
    </header>
  );
}
