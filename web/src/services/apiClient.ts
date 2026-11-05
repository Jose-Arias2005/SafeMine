import { BackendStatus } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/kiosco";

export const TOKEN_STORAGE_KEY = "safemine_token";
export const USER_STORAGE_KEY = "safemine_user";
// Clave de sesión combinada usada por AuthContext (se limpia junto con las demás).
export const SESSION_STORAGE_KEY = "safemine_auth";

// Endpoints de autenticación: un 401 aquí significa "credenciales inválidas",
// no "sesión expirada", por lo que no deben forzar redirección.
const AUTH_ENDPOINTS = ["/api/auth/login", "/api/auth/register-provider"];

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    !AUTH_ENDPOINTS.includes(endpoint)
  ) {
    clearStoredSession();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data && (data as { detail?: string }).detail) ||
        "Error en la petición al servidor"
    );
  }
  return data as T;
}

export async function getSystemStatus(): Promise<BackendStatus> {
  return apiFetch<BackendStatus>("/api/status");
}
