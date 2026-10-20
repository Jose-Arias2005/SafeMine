import { GateLog, Worker } from "@/types";
import { apiFetch } from "./apiClient";

export const kioscoService = {
  async verifyQr(qrData: string): Promise<{
    authorized: boolean;
    status: string;
    message: string;
    reasons?: string[];
    worker: Worker;
  }> {
    return apiFetch("/api/vision/verify-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_data: qrData }),
    });
  },

  async verifyEpp(params: {
    workerId: number;
    simulateMode?: "CON_EPP" | "SIN_EPP";
    frameBlob?: Blob | null;
  }): Promise<{
    status: "VERDE" | "ROJO";
    all_epp_present: boolean;
    detected_epps: string[];
    missing_epps: string[];
    mode: string;
    confidence_summary: string;
    message: string;
    worker: Worker;
  }> {
    const formData = new FormData();
    formData.append("worker_id", String(params.workerId));
    if (params.simulateMode) {
      formData.append("simulate_mode", params.simulateMode);
    }
    if (params.frameBlob) {
      formData.append("frame", params.frameBlob, "garita_frame.jpg");
    }

    return apiFetch("/api/vision/verify-epp", {
      method: "POST",
      body: formData,
    });
  },

  async getLogs(): Promise<{
    last_scanned_worker: Worker | null;
    logs: GateLog[];
  }> {
    return apiFetch("/api/vision/logs");
  },
};
