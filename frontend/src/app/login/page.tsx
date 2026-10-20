"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  HardHat,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { DemoAccount } from "@/types";

export default function LoginPage() {
  const { login, registerProvider, user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Formulario Login
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulario Registro Proveedor
  const [regCompany, setRegCompany] = useState("");
  const [regRuc, setRegRuc] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Cuentas demo
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    // Si ya está autenticado, redirigir
    if (user) {
      if (user.role === "MINERA") router.replace("/");
      else if (user.role === "PROVEEDOR") router.replace("/proveedores");
      else if (user.role === "TRABAJADOR") router.replace("/trabajadores");
    }
  }, [user, router]);

  useEffect(() => {
    authService
      .getDemoAccounts()
      .then((res) => setDemoAccounts(res.accounts))
      .catch(() => {
        // Fallback demo accounts si la red falla
        setDemoAccounts([
          {
            id: 1,
            email: "minera@safemine.pe",
            username: "minera",
            password: "minera123",
            role: "MINERA",
            full_name: "Ing. Roberto Vargas (Gerencia SSO Minera)",
            company_name: "Compañía Minera SafeMine Andes S.A.A.",
          },
          {
            id: 2,
            email: "proveedor@contratistasperu.pe",
            username: "proveedor",
            password: "proveedor123",
            role: "PROVEEDOR",
            full_name: "Ing. Elena Salazar (Gerente de Operaciones)",
            company_name: "Contratistas Mineros del Sur S.A.C.",
          },
          {
            id: 3,
            email: "carlos.mendoza@contratistasperu.pe",
            username: "op.45891021",
            password: "mina1021",
            role: "TRABAJADOR",
            full_name: "Carlos Mendoza Prado",
            dni: "45891021",
          },
          {
            id: 4,
            email: "jorge.quispe@contratistasperu.pe",
            username: "op.46102938",
            password: "mina2938",
            role: "TRABAJADOR",
            full_name: "Jorge Quispe Rojas",
            dni: "46102938",
          },
        ]);
      });
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoginLoading(true);

    try {
      const loggedUser = await login(identifier, password);
      if (loggedUser.role === "MINERA") {
        router.replace("/");
      } else if (loggedUser.role === "PROVEEDOR") {
        router.replace("/proveedores");
      } else if (loggedUser.role === "TRABAJADOR") {
        router.replace("/trabajadores");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Credenciales inválidas. Por favor verifique sus datos."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRegLoading(true);

    try {
      const loggedUser = await registerProvider({
        company_name: regCompany,
        ruc: regRuc,
        full_name: regFullName,
        email: regEmail,
        password: regPassword,
      });
      router.replace("/proveedores");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Error al registrar la cuenta de proveedor."
      );
    } finally {
      setRegLoading(false);
    }
  };

  const handleAutofill = (identVal: string, pwdVal: string) => {
    setIdentifier(identVal);
    setPassword(pwdVal);
    setActiveTab("login");
    setErrorMsg(null);
  };

  // Filtrar cuentas de trabajadores demo
  const workerDemos = demoAccounts
    .filter((a) => a.role === "TRABAJADOR" && a.username && a.password)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo & Marca */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              SafeMine <span className="text-blue-500">AI</span>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Control de Acceso &amp; Acreditación SSO
            </div>
          </div>
        </div>

        <h2 className="mt-5 text-center text-xl font-bold tracking-tight text-white">
          Acceso al Sistema por Rol
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Inicia sesión con tu cuenta corporativa asignada o crea una nueva cuenta de Proveedor.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/10">
          {/* Selector de Pestaña: Iniciar Sesión vs Crear Cuenta Proveedor */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "login"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "register"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Registro Proveedor</span>
            </button>
          </div>

          {/* Banner de error */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORMULARIO 1: INICIO DE SESIÓN */}
          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Usuario, Correo Corporativo o DNI
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ej. minera@safemine.pe o op.45891021"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 focus:outline-none disabled:opacity-50 transition-all"
              >
                {loginLoading ? (
                  <span>Verificando credenciales...</span>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* FORMULARIO 2: REGISTRO DE NUEVO PROVEEDOR */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Empresa Contratista
                </label>
                <input
                  type="text"
                  required
                  value={regCompany}
                  onChange={(e) => setRegCompany(e.target.value)}
                  placeholder="ej. Mineros del Altiplano S.A.C."
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    RUC (11 dígitos)
                  </label>
                  <input
                    type="text"
                    value={regRuc}
                    onChange={(e) => setRegRuc(e.target.value)}
                    placeholder="20601234567"
                    maxLength={11}
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Representante / Contacto
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ing. Carlos Pérez"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Correo Electrónico Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="contacto@empresa.pe"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Crea una contraseña segura"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 focus:outline-none disabled:opacity-50 transition-all"
              >
                {regLoading ? (
                  <span>Registrando cuenta...</span>
                ) : (
                  <>
                    <span>Crear Cuenta de Proveedor</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ASISTENTE DISCRETO DE CREDENCIALES DEMO (EVALUACIÓN EN CLASE) */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Asistente de Credenciales Demo (1 Clic)</span>
            </div>

            <div className="space-y-2">
              {/* Demo Minera */}
              <div
                onClick={() => handleAutofill("minera@safemine.pe", "minera123")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-blue-500/50 hover:bg-blue-950/20 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-blue-300">
                      Cuenta Minera (Admin)
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      minera@safemine.pe · minera123
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                  Rellenar
                </span>
              </div>

              {/* Demo Proveedor */}
              <div
                onClick={() =>
                  handleAutofill("proveedor@contratistasperu.pe", "proveedor123")
                }
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-amber-500/50 hover:bg-amber-950/20 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30">
                    <Briefcase className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      Cuenta Proveedor Contratista
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      proveedor@contratistasperu.pe · proveedor123
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  Rellenar
                </span>
              </div>

              {/* Demo Trabajadores dinámicos */}
              {workerDemos.map((w) => (
                <div
                  key={w.id}
                  onClick={() => handleAutofill(w.username, w.password)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-emerald-950/20 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                      <HardHat className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                        {w.full_name} ({w.role})
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {w.username} · {w.password}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Rellenar
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">
              * Al aceptar una propuesta en el Panel de la Minera, se crean automáticamente las 10 cuentas de trabajador (<span className="font-mono text-slate-300">op.&lt;DNI&gt;</span> / <span className="font-mono text-slate-300">mina&lt;4 últimos dígitos&gt;</span>).
            </p>
          </div>
        </div>

        {/* Enlace discreto al Kiosco de Garita sin login */}
        <div className="mt-5 text-center">
          <Link
            href="/kiosco"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors py-1 px-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60"
          >
            <Camera className="h-3.5 w-3.5 text-blue-400" />
            <span>Abrir Kiosco de Garita (Cámara &amp; Arduino)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
