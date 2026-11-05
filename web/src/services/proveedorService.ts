import { Proposal, WorkerCandidateInput } from "@/types";
import { apiFetch } from "./apiClient";

export const proveedorService = {
  async getProposalsAndReports(): Promise<{
    proposals: Proposal[];
    reports: Proposal[];
  }> {
    // El backend identifica al proveedor por el token Bearer.
    return apiFetch("/api/proveedor/proposals");
  },

  async postulateSquad(
    proposalId: number,
    workers: WorkerCandidateInput[]
  ): Promise<{ message: string; proposal: Proposal }> {
    return apiFetch(`/api/proveedor/proposals/${proposalId}/postulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workers }),
    });
  },
};
