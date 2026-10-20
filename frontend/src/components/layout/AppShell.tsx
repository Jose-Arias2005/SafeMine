"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Rutas públicas que no requieren autenticación
    const isPublic = pathname === "/login" || pathname === "/kiosco";

    // 1. Si NO ha iniciado sesión y quiere entrar a rutas protegidas
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }

    // 2. Si YA ha iniciado sesión
    if (user) {
      // Si está en /login, redirigir según su rol
      if (pathname === "/login") {
        if (user.role === "MINERA") router.replace("/");
        else if (user.role === "PROVEEDOR") router.replace("/proveedores");
        else if (user.role === "TRABAJADOR") router.replace("/trabajadores");
        return;
      }

      // 3. Aislamiento estricto de vistas por rol
      if (user.role === "MINERA") {
        // Minera solo accede a / y /kiosco
        if (pathname.startsWith("/proveedores") || pathname.startsWith("/trabajadores")) {
          router.replace("/");
        }
      } else if (user.role === "PROVEEDOR") {
        // Proveedor solo accede a /proveedores
        if (pathname !== "/proveedores") {
          router.replace("/proveedores");
        }
      } else if (user.role === "TRABAJADOR") {
        // Trabajador solo accede a /trabajadores
        if (pathname !== "/trabajadores") {
          router.replace("/trabajadores");
        }
      }
    }
  }, [user, isLoading, pathname, router]);

  // Pantalla de carga mientras se verifica la sesión en localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg mb-4 animate-pulse">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>Iniciando SafeMine AI...</span>
        </div>
      </div>
    );
  }

  // La pantalla de login se muestra en pantalla completa limpia sin sidebar ni header
  if (pathname === "/login") {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
  }

  // Si no está autenticado y está en kiosco, se permite modo pantalla completa o con header básico
  const isKioscoStandalone = pathname === "/kiosco" && !user;

  if (isKioscoStandalone) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-white">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Layout normal con Sidebar y Header para usuarios autenticados
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
