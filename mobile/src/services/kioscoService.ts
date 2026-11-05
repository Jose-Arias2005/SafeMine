import {
  EppVerificationResponse,
  GateLog,
  NativeUploadAsset,
  Worker,
} from "../types";
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
    frameAsset?: NativeUploadAsset | null;
    simulateMode?: string;
  }): Promise<EppVerificationResponse> {
    const formData = new FormData();
    formData.append("worker_id", String(params.workerId));

    if (params.simulateMode) {
      formData.append("simulate_mode", params.simulateMode);
    }

    if (params.frameAsset) {
      const nativeFrame = {
        uri: params.frameAsset.uri,
        name: params.frameAsset.name,
        type: params.frameAsset.mimeType,
      } as unknown as Blob;
      formData.append("frame", nativeFrame);
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

