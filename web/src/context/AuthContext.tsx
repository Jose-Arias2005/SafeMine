"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { AuthUser } from "@/types";
import { authService, RegisterProviderData } from "@/services/authService";
import {
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  clearStoredSession,
} from "@/services/apiClient";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  registerProvider: (data: RegisterProviderData) => Promise<AuthUser>;
  logout: () => void;
}

const STORAGE_KEY = SESSION_STORAGE_KEY;

// Persiste la sesión: clave combinada + claves individuales que lee apiFetch.
function persistSession(user: AuthUser, token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carga inicial de sesión desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user && parsed?.token) {
          setUser(parsed.user);
          setToken(parsed.token);
          // Garantiza que apiFetch encuentre el token (sesiones previas al cambio).
          persistSession(parsed.user, parsed.token);
        }
      }
    } catch {
      clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<AuthUser> => {
      const res = await authService.login(identifier, password);
      setUser(res.user);
      setToken(res.access_token);
      persistSession(res.user, res.access_token);
      return res.user;
    },
    []
  );

  const registerProvider = useCallback(
    async (data: RegisterProviderData): Promise<AuthUser> => {
      const res = await authService.registerProvider(data);
      setUser(res.user);
      setToken(res.access_token);
      persistSession(res.user, res.access_token);
      return res.user;
    },
    []
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setToken(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerProvider,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
}
