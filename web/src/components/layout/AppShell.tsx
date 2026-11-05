"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg mb-4 animate-pulse">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>Iniciando SafeMine AI Organizacional...</span>
        </div>
      </div>
    );
  }

  if (pathname === "/login") {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="lg:pl-64 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
