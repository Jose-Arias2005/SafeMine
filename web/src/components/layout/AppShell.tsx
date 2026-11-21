"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "./Header";
import { ToastProvider } from "@/components/ui/Toast";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isLogin = pathname === "/login";

    if (!user && !isLogin) {
      router.replace("/login");
      return;
    }

    if (user) {
      // El rol operativo TRABAJADOR pertenece exclusivamente a SafeMine Mobile
      if (user.role === "TRABAJADOR") {
        logout();
        return;
      }

      if (isLogin) {
        if (user.role === "MINERA") router.replace("/");
        else if (user.role === "PROVEEDOR") router.replace("/proveedores");
        return;
      }

      if (user.role === "MINERA" && pathname !== "/") {
        router.replace("/");
      } else if (user.role === "PROVEEDOR" && pathname !== "/proveedores") {
        router.replace("/proveedores");
      }
    }
  }, [user, isLoading, pathname, router, logout]);

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-700"
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" />
          <span>Cargando SafeMine...</span>
        </div>
      </div>
    );
  }

  if (pathname === "/login") {
    return (
      <ToastProvider>
        <main className="min-h-screen bg-slate-50 text-slate-900">{children}</main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <a
          href="#page-heading"
          className="visually-hidden fixed left-3 top-3 z-50 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-md focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
        >
          Saltar al contenido principal
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
