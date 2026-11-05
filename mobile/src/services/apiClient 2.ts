import { BackendStatus } from "@/types";

export const TOKEN_STORAGE_KEY = "safemine_token";
export const USER_STORAGE_KEY = "safemine_user";
export const SESSION_STORAGE_KEY = "safemine_auth";
export const API_OVERRIDE_STORAGE_KEY = "safemine_api_url_override";

const ENV_API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
const ENV_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || process.env.VITE_WS_URL || "";

/**
 * Resuelve dinámicamente la URL base del backend:
 * 1) Override manual guardado en el dispositivo (pruebas en campo por WiFi LAN).
 * 2) Variable de entorno NEXT_PUBLIC_API_URL / VITE_API_URL.
 * 3) IP/hostname desde donde se abrió la app móvil (ej. http://192.168.1.45:8000).
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem(API_OVERRIDE_STORAGE_KEY)?.trim();
    if (override) return override.replace(/\/+$/, "");

    if (ENV_API_URL) return ENV_API_URL.replace(/\/+$/, "");

    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const host = window.location.hostname || "localhost";
    return `${protocol}//${host}:8000`;
  }
  return (ENV_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

export function getWsUrl(): string {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem(API_OVERRIDE_STORAGE_KEY)?.trim();
    if (override) {
      return `${override.replace(/\/+$/, "").replace(/^http/, "ws")}/ws/kiosco`;
    }
  }
  if (ENV_WS_URL) return ENV_WS_URL;
  return `${getApiUrl().replace(/^http/, "ws")}/ws/kiosco`;
}

export function setApiUrlOverride(url: string | null): void {
  if (typeof window === "undefined") return;
  if (!url || !url.trim()) {
    localStorage.removeItem(API_OVERRIDE_STORAGE_KEY);
  } else {
    localStorage.setItem(
      API_OVERRIDE_STORAGE_KEY,
      url.trim().replace(/\/+$/, "")
    );
  }
}

export const API_URL = ENV_API_URL || "http://localhost:8000";
export const WS_URL = ENV_WS_URL || "ws://localhost:8000/ws/kiosco";

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
  const headers: Record<string, string> = {};

  if (options?.headers) {
    const incoming = new Headers(options.headers);
    incoming.forEach((value, key) => {
      headers[key] = value;
    });
  }

  const token = getStoredToken();
  if (token && !headers["Authorization"] && !headers["authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

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

