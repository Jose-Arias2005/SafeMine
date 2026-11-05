import { AuthResponse, DemoAccount } from "@/types";
import { apiFetch } from "./apiClient";

export interface RegisterProviderData {
  company_name: string;
  ruc?: string;
  full_name: string;
  email: string;
  password: string;
}

export const authService = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  },

  async registerProvider(data: RegisterProviderData): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/api/auth/register-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async getDemoAccounts(): Promise<{ accounts: DemoAccount[] }> {
    return apiFetch<{ accounts: DemoAccount[] }>("/api/auth/demo-accounts");
  },
};
