import { Proposal, WorkerCandidateInput } from "@/types";
import { apiFetch } from "./apiClient";

export const proveedorService = {
  async getProposalsAndReports(providerId?: number): Promise<{
    proposals: Proposal[];
    reports: Proposal[];
  }> {
    const query = providerId ? `?provider_id=${providerId}` : "";
    return apiFetch(`/api/proveedor/proposals${query}`);
  },

  async postulateSquad(
    proposalId: number,
    providerId: number,
    workers: WorkerCandidateInput[]
  ): Promise<{ message: string; proposal: Proposal }> {
    return apiFetch(`/api/proveedor/proposals/${proposalId}/postulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, workers }),
    });
  },
};
