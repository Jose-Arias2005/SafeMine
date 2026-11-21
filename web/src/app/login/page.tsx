"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { clearStoredSession } from "@/services/apiClient";

export default function LoginPage() {
  const { login, registerProvider, user, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Formulario Login Administrativo
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
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === "MINERA") {
      router.replace("/");
    } else if (user.role === "PROVEEDOR") {
      router.replace("/proveedores");
    } else if (user.role === "TRABAJADOR") {
      logout();
    }
  }, [user, router, logout]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoginLoading(true);

    try {
      const loggedUser = await login(identifier, password);
      if (loggedUser.role === "TRABAJADOR") {
        clearStoredSession();
        logout();
        setErrorMsg(
          "Esta plataforma web es exclusiva para Minera y Proveedores. Los operarios y personal de garita ingresan desde SafeMine Mobile."
        );
        return;
      }

      if (loggedUser.role === "MINERA") {
        router.replace("/");
      } else if (loggedUser.role === "PROVEEDOR") {
        router.replace("/proveedores");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Credenciales inválidas. Verifica tus datos."
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
      await registerProvider({
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

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* Marca sobria */}
        <div className="flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            SafeMine <span className="font-normal text-slate-500">Web</span>
          </span>
        </div>

        <h1 className="mt-5 text-center text-xl font-semibold tracking-tight text-slate-900">
          Acceso administrativo
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          Portal organizacional para Minera y Empresas Contratistas.
        </p>

        {/* Tarjeta principal neutra */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          {/* Selector de modo */}
          <div
            role="tablist"
            aria-label="Opciones de acceso"
            className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1"
          >
            <button
              id="auth-tab-login"
              type="button"
              role="tab"
              aria-selected={activeTab === "login"}
              tabIndex={activeTab === "login" ? 0 : -1}
              onClick={() => {
                setActiveTab("login");
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  setActiveTab("register");
                  setErrorMsg(null);
                  document.getElementById("auth-tab-register")?.focus();
                }
              }}
              className={`rounded-lg py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
                activeTab === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              id="auth-tab-register"
              type="button"
              role="tab"
              aria-selected={activeTab === "register"}
              tabIndex={activeTab === "register" ? 0 : -1}
              onClick={() => {
                setActiveTab("register");
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  setActiveTab("login");
                  setErrorMsg(null);
                  document.getElementById("auth-tab-login")?.focus();
                }
              }}
              className={`rounded-lg py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
                activeTab === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Registro proveedor
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <div
            role="tabpanel"
            aria-labelledby={
              activeTab === "login" ? "auth-tab-login" : "auth-tab-register"
            }
          >
          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-medium text-slate-700"
                >
                  Correo corporativo o usuario
                </label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="minera@safemine.pe"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="current-password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    enterKeyHint="done"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                  />
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {loginLoading ? (
                  <span>Verificando credenciales...</span>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="company-name"
                  className="block text-xs font-medium text-slate-700"
                >
                  Empresa contratista
                </label>
                <input
                  id="company-name"
                  name="company_name"
                  type="text"
                  required
                  autoComplete="organization"
                  enterKeyHint="next"
                  value={regCompany}
                  onChange={(e) => setRegCompany(e.target.value)}
                  placeholder="Mineros del Altiplano S.A.C."
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="company-ruc"
                    className="block text-xs font-medium text-slate-700"
                  >
                    RUC (11 dígitos)
                  </label>
                  <input
                    id="company-ruc"
                    name="ruc"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    spellCheck={false}
                    enterKeyHint="next"
                    value={regRuc}
                    onChange={(e) => setRegRuc(e.target.value)}
                    placeholder="20601234567"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="full-name"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Representante
                  </label>
                  <input
                    id="full-name"
                    name="full_name"
                    type="text"
                    required
                    autoComplete="name"
                    enterKeyHint="next"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ing. Carlos Pérez"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Correo corporativo
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="contacto@empresa.pe"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    name="password"
                    type={showRegPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    enterKeyHint="done"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Crea una contraseña segura"
                    className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                  />
                  <button
                    type="button"
                    aria-pressed={showRegPassword}
                    aria-label={
                      showRegPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"
                  >
                    {showRegPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {regLoading ? (
                  <span>Registrando cuenta...</span>
                ) : (
                  <>
                    <span>Crear cuenta de proveedor</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}
          </div>

          {/* Cuentas demo bajo demanda (<details> colapsado con <button type="button">) */}
          <details className="sm-details mt-5 border-t border-slate-100 pt-4">
            <summary className="rounded-md py-1 text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <span>Cuentas demo de acceso rápido</span>
            </summary>

            <div className="space-y-2 pt-3">
              <button
                type="button"
                onClick={() =>
                  handleAutofill("minera@safemine.pe", "minera123")
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Building2
                      className="h-3.5 w-3.5 text-slate-500"
                      aria-hidden="true"
                    />
                    <span>Cuenta Minera</span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                    minera@safemine.pe · minera123
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-blue-600">
                  Usar
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAutofill(
                    "proveedor@contratistasperu.pe",
                    "proveedor123"
                  )
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Building2
                      className="h-3.5 w-3.5 text-slate-500"
                      aria-hidden="true"
                    />
                    <span>Cuenta Proveedor</span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                    proveedor@contratistasperu.pe · proveedor123
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-blue-600">
                  Usar
                </span>
              </button>
            </div>
          </details>
        </div>

        {/* Nota discreta sobre SafeMine Mobile */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <Smartphone
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <p className="leading-relaxed">
            <strong className="font-medium text-slate-800">
              Operarios y garita:
            </strong>{" "}
            ingresan desde <span className="font-mono text-slate-800">SafeMine Mobile</span>{" "}
            (puerto <span className="font-mono tabular-nums">3001</span>) para inducción, Fotocheck QR y escáner móvil.
          </p>
        </div>
      </div>
    </div>
  );
}
