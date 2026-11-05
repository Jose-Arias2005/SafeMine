import Constants from "expo-constants";

export const DEFAULT_BACKEND_PORT = 8000;
export const FALLBACK_LAN_API_URL = "http://192.168.1.100:8000";

/**
 * Obtiene la URL base por defecto del backend FastAPI:
 * 1) Variable de entorno `EXPO_PUBLIC_API_URL` (definida en `.env` o al lanzar Expo).
 * 2) Autodetección de la IP LAN de la estación de desarrollo desde `Constants.expoConfig.hostUri`
 *    cuando el teléfono físico se enlaza mediante Expo Go por WiFi.
 * 3) Fallback configurable `http://192.168.1.100:8000`.
 */
export function resolveDefaultApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0]?.trim();
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:${DEFAULT_BACKEND_PORT}`;
    }
  }

  return FALLBACK_LAN_API_URL;
}

