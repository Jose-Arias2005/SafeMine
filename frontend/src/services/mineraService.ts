import { GeneratedCredential, Proposal, WorkerEvaluationItem } from "@/types";
import { apiFetch } from "./apiClient";

export const mineraService = {
  async listProposals(): Promise<{ proposals: Proposal[] }> {
    return apiFetch<{ proposals: Proposal[] }>("/api/minera/proposals");
  },

  async createProposal(payload: {
    title: string;
    description: string;
    quota: number;
    start_date: string;
    required_epps: string[];
  }): Promise<{ message: string; proposal: Proposal }> {
    return apiFetch<{ message: string; proposal: Proposal }>(
      "/api/minera/proposals",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  },

  async acceptProposal(proposalId: number): Promise<{
    message: string;
    generated_credentials: GeneratedCredential[];
    proposal: Proposal;
  }> {
    return apiFetch(`/api/minera/proposals/${proposalId}/accept`, {
      method: "POST",
    });
  },

  async saveEvaluations(
    proposalId: number,
    evaluations: WorkerEvaluationItem[]
  ): Promise<{ message: string; proposal: Proposal }> {
    return apiFetch(`/api/minera/proposals/${proposalId}/evaluations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evaluations }),
    });
  },

  async sendReportToProvider(
    proposalId: number,
    reportSummary?: string
  ): Promise<{ message: string; proposal: Proposal }> {
    return apiFetch(`/api/minera/proposals/${proposalId}/send-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_summary: reportSummary }),
    });
  },
};
