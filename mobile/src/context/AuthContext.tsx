import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthUser, ProposalSummary, Worker } from "../types";
import {
  getApiBaseUrl,
  registerUnauthorizedHandler,
  updateApiBaseUrl,
} from "../services/apiClient";
import { authService } from "../services/authService";
import { trabajadorService } from "../services/trabajadorService";
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
  saveOfflineBadge,
} from "../utils/offlineStorage";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  worker: Worker | null;
  proposal: ProposalSummary | null;
  apiBaseUrl: string;
  isHydrating: boolean;
  loginOperario: (identifier: string, password: string) => Promise<{
    user: AuthUser;
    worker: Worker;
  }>;
  refreshWorkerProfile: (workerIdOverride?: number) => Promise<Worker | null>;
  syncWorkerState: (updatedWorker: Worker) => Promise<void>;
  setLanApiUrl: (url: string | null) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [proposal, setProposal] = useState<ProposalSummary | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("http://192.168.1.100:8000");
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  const persistIfAuthorized = useCallback(
    async (w: Worker, u: AuthUser | null, prop: ProposalSummary | null) => {
      if (w.is_authorized) {
        await saveOfflineBadge(
          w,
          prop?.provider_company_name || u?.company_name,
          prop?.required_epps
        );
      }
    },
    []
  );

  const refreshWorkerProfile = useCallback(
    async (workerIdOverride?: number): Promise<Worker | null> => {
      const targetId = workerIdOverride ?? user?.worker_id ?? worker?.id;
      if (!targetId) return null;
      const detail = await trabajadorService.getWorkerDetail(targetId);
      setWorker(detail.worker);
      setProposal(detail.proposal);
      await persistIfAuthorized(detail.worker, user, detail.proposal);
      return detail.worker;
    },
    [persistIfAuthorized, user, worker?.id]
  );

  const syncWorkerState = useCallback(
    async (updatedWorker: Worker) => {
      setWorker(updatedWorker);
      await persistIfAuthorized(updatedWorker, user, proposal);
    },
    [persistIfAuthorized, proposal, user]
  );

  const logout = useCallback(async () => {
    await clearAuthSession();
    setUser(null);
    setToken(null);
    setWorker(null);
    setProposal(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
      setWorker(null);
      setProposal(null);
    });
    return () => registerUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resolvedUrl = await getApiBaseUrl();
        if (active) setApiBaseUrl(resolvedUrl);

        const [storedToken, storedUser] = await Promise.all([
          getStoredToken(),
          getStoredUser(),
        ]);

        if (storedToken && storedUser && storedUser.role === "TRABAJADOR") {
          if (active) {
            setToken(storedToken);
            setUser(storedUser);
          }
          if (storedUser.worker_id) {
            try {
              const detail = await trabajadorService.getWorkerDetail(
                storedUser.worker_id
              );
              if (active) {
                setWorker(detail.worker);
                setProposal(detail.proposal);
                await persistIfAuthorized(
                  detail.worker,
                  storedUser,
                  detail.proposal
                );
              }
            } catch {
              // Si no hay red al abrir la app, mantiene sesión local para acceso offline al QR
            }
          }
        }
      } finally {
        if (active) setIsHydrating(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [persistIfAuthorized]);

  const loginOperario = useCallback(
    async (identifier: string, password: string) => {
      const normalizedIdentifier = /^\d{8}$/.test(identifier.trim())
        ? identifier.trim()
        : identifier.trim();

      const res = await authService.login(normalizedIdentifier, password);
      if (res.user.role !== "TRABAJADOR" || !res.user.worker_id) {
        await clearAuthSession();
        throw new Error(
          "Esta aplicación móvil es exclusiva para Operarios acreditados (acceda con su DNI o usuario op.<DNI>)."
        );
      }

      await saveAuthSession(res.access_token, res.user);
      setToken(res.access_token);
      setUser(res.user);

      const detail = await trabajadorService.getWorkerDetail(res.user.worker_id);
      setWorker(detail.worker);
      setProposal(detail.proposal);
      await persistIfAuthorized(detail.worker, res.user, detail.proposal);

      return { user: res.user, worker: detail.worker };
    },
    [persistIfAuthorized]
  );

  const setLanApiUrl = useCallback(async (url: string | null) => {
    const updated = await updateApiBaseUrl(url);
    setApiBaseUrl(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        worker,
        proposal,
        apiBaseUrl,
        isHydrating,
        loginOperario,
        refreshWorkerProfile,
        syncWorkerState,
        setLanApiUrl,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }
  return ctx;
}

