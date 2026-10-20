import { BackendStatus } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/kiosco";

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error en la petición al servidor");
  }
  return data as T;
}

export async function getSystemStatus(): Promise<BackendStatus> {
  return apiFetch<BackendStatus>("/api/status");
}
