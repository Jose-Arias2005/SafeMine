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

function sendMultipartWithXhr(
  url: string,
  formData: FormData,
  token: string | null
): Promise<{ status: number; ok: boolean; bodyText: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.setRequestHeader("Accept", "application/json");
    // No fijar Content-Type manualmente: iOS/Android generan multipart/form-data; boundary=...
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        bodyText: typeof xhr.responseText === "string" ? xhr.responseText : "",
      });
    };
    xhr.onerror = () => {
      reject(
        new Error("Error de red al subir el archivo al servidor SafeMine API.")
      );
    };
    xhr.ontimeout = () => {
      reject(
        new Error("Tiempo de espera agotado al subir el archivo al servidor.")
      );
    };
    xhr.send(formData);
  });
}

/**
 * Envío multipart/form-data compatible con iOS y Android en React Native / Expo SDK 58:
 * - Usa fetch nativo pasando únicamente Authorization (sin fijar Content-Type manual).
 * - Si expo/fetch lanza `Unsupported FormDataPart implementation` al serializar
 *   objetos `{ uri, name, type }`, delega automáticamente en el XMLHttpRequest
 *   nativo de React Native (RCTNetworking en iOS / NetworkingModule en Android).
 */
export async function apiUploadMultipart<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const token = await getStoredToken();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let status = 0;
  let ok = false;
  let data: Record<string, unknown> = {};

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    status = response.status;
    ok = response.ok;
    data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unsupported FormDataPart implementation")) {
      const xhrRes = await sendMultipartWithXhr(url, formData, token);
      status = xhrRes.status;
      ok = xhrRes.ok;
      try {
        data = xhrRes.bodyText ? JSON.parse(xhrRes.bodyText) : {};
      } catch {
        data = {};
      }
    } else {
      throw err;
    }
  }

  if (status === 401 && !AUTH_ENDPOINTS.includes(endpoint)) {
    await clearAuthSession();
    if (unauthorizedListener) {
      unauthorizedListener();
    }
  }

  if (!ok || status >= 400) {
    const detail = (data as { detail?: string })?.detail;
    throw new Error(
      detail || `Error HTTP ${status} al conectar con SafeMine API`
    );
  }

  return data as T;
}

