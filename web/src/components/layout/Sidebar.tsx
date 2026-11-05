"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Briefcase,
  LogOut,
  KeyRound,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getNavItems = () => {
    if (!user) {
      return [
        {
          href: "/login",
          label: "Iniciar Sesión",
          description: "Acceso corporativo",
          icon: KeyRound,
        },
      ];
    }

    if (user.role === "MINERA") {
      return [
        {
          href: "/",
          label: "Dashboard Minera",
          description: "Convocatorias y Evaluación SSO",
          icon: Building2,
        },
      ];
    }

    if (user.role === "PROVEEDOR") {
      return [
        {
          href: "/proveedores",
          label: "Portal Contratista",
          description: "Postulación, Nómina y Reportes",
          icon: Briefcase,
        },
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  const getRoleBadge = (role?: string) => {
    if (role === "MINERA") {
      return (
        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
          MINERA ADMIN
        </span>
      );
    }
    if (role === "PROVEEDOR") {
      return (
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
          PROVEEDOR
        </span>
      );
    }
    return null;
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-slate-900">
            SafeMine <span className="text-blue-600">Web</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            Portal Organizacional SSO
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-5 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {user ? `Consola Corporativa (${user.role})` : "Acceso Administrativo"}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              />
              <div className="leading-tight">
                <div>{item.label}</div>
                <div
                  className={`text-[11px] font-normal ${
                    isActive ? "text-blue-600/80" : "text-slate-400"
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Aviso de separación Web / Mobile */}
      <div className="px-3 pb-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
            <Smartphone className="h-3.5 w-3.5 text-blue-600" />
            <span>SafeMine Mobile App</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            La acreditación de operarios (Fotocheck QR) y el escáner de Garita operan desde el cliente móvil.
          </p>
        </div>
      </div>

      {/* Perfil del Usuario Autenticado & Cierre de Sesión */}
      {user && (
        <div className="border-t border-slate-200 p-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between mb-1.5">
              {getRoleBadge(user.role)}
              <button
                type="button"
                onClick={logout}
                title="Cerrar Sesión"
                className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
              >
                <LogOut className="h-3 w-3" />
                <span>Salir</span>
              </button>
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {user.full_name}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {user.company_name || user.email}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="border-t border-slate-100 p-3">
        <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-200/60 text-[10px] text-slate-500 leading-relaxed text-center">
          Google Gemini IA · AWS Rekognition · Arduino
        </div>
      </div>
    </aside>
  );
}
