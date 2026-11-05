import { resolveDefaultApiUrl } from "../config/env";
import {
  clearAuthSession,
  getApiUrlOverride,
  getStoredToken,
  setApiUrlOverride,
} from "../utils/offlineStorage";

const AUTH_ENDPOINTS = ["/api/auth/login", "/api/auth/register-provider"];

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
let cachedBaseUrl: string | null = null;

export function registerUnauthorizedHandler(
  listener: UnauthorizedListener | null
): void {
  unauthorizedListener = listener;
}

export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const override = await getApiUrlOverride();
  cachedBaseUrl = override || resolveDefaultApiUrl();
  return cachedBaseUrl;
}

export async function updateApiBaseUrl(url: string | null): Promise<string> {
  await setApiUrlOverride(url);
  cachedBaseUrl = url ? url.trim().replace(/\/+$/, "") : resolveDefaultApiUrl();
  return cachedBaseUrl;
}

export async function getWsUrl(): Promise<string> {
  const base = await getApiBaseUrl();
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/ws/kiosco`;
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const token = await getStoredToken();

  const headers = new Headers(options?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !AUTH_ENDPOINTS.includes(endpoint)) {
    await clearAuthSession();
    if (unauthorizedListener) {
      unauthorizedListener();
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail || `Error HTTP ${response.status} al conectar con SafeMine API`);
  }

  return data as T;
}

