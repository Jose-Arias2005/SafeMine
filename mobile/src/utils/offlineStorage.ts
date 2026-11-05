import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthUser, CachedOfflineBadge, Worker } from "../types";

export const TOKEN_STORAGE_KEY = "safemine_token";
export const USER_STORAGE_KEY = "safemine_user";
export const OFFLINE_BADGE_KEY = "safemine_offline_badge";
export const API_URL_OVERRIDE_KEY = "safemine_api_url_override";

export async function saveAuthSession(
  token: string,
  user: AuthUser
): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_STORAGE_KEY, token],
    [USER_STORAGE_KEY, JSON.stringify(user)],
  ]);
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
}

export async function saveOfflineBadge(
  worker: Worker,
  companyName?: string | null,
  requiredEpps?: string[]
): Promise<CachedOfflineBadge> {
  const badge: CachedOfflineBadge = {
    worker,
    companyName: companyName || "Contratista Minero Acreditado",
    requiredEpps:
      requiredEpps && requiredEpps.length > 0
        ? requiredEpps
        : ["HEAD_COVER", "HAND_COVER", "FACE_COVER"],
    cachedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(badge);
  const pairs: [string, string][] = [[OFFLINE_BADGE_KEY, serialized]];
  if (worker.dni) {
    pairs.push([`${OFFLINE_BADGE_KEY}_${worker.dni}`, serialized]);
  }
  await AsyncStorage.multiSet(pairs);
  return badge;
}

export async function loadOfflineBadge(
  dniHint?: string | null
): Promise<CachedOfflineBadge | null> {
  try {
    const cleanDni = dniHint?.trim();
    const raw =
      (cleanDni
        ? await AsyncStorage.getItem(`${OFFLINE_BADGE_KEY}_${cleanDni}`)
        : null) || (await AsyncStorage.getItem(OFFLINE_BADGE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOfflineBadge;
    return parsed?.worker ? parsed : null;
  } catch {
    return null;
  }
}

export async function getApiUrlOverride(): Promise<string | null> {
  const val = await AsyncStorage.getItem(API_URL_OVERRIDE_KEY);
  return val ? val.trim().replace(/\/+$/, "") : null;
}

export async function setApiUrlOverride(url: string | null): Promise<void> {
  const cleaned = url?.trim().replace(/\/+$/, "");
  if (!cleaned) {
    await AsyncStorage.removeItem(API_URL_OVERRIDE_KEY);
  } else {
    await AsyncStorage.setItem(API_URL_OVERRIDE_KEY, cleaned);
  }
}

