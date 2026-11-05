import { AuthResponse, DemoAccount } from "../types";
import { apiFetch } from "./apiClient";

export const authService = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
  },

  async getDemoAccounts(): Promise<{ accounts: DemoAccount[] }> {
    return apiFetch<{ accounts: DemoAccount[] }>("/api/auth/demo-accounts");
  },
};

