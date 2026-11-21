import {
  AuthorizedRosterResponse,
  CachedWorkerRosterItem,
  EppVerificationResponse,
  GateLog,
  NativeUploadAsset,
  OfflineAccessLog,
  SyncOfflineLogsResponse,
  Worker,
} from "../types";
import { apiFetch, apiUploadMultipart } from "./apiClient";

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
      formData.append("simulate_mode", String(params.simulateMode));
    }

    if (params.frameAsset) {
      const fileUri = params.frameAsset.uri
        ? String(params.frameAsset.uri).trim()
        : "";
      if (!fileUri) {
        throw new Error(
          "La fotografía capturada para verificación de EPPs no contiene una ruta (URI) válida. Intenta capturar nuevamente."
        );
      }
      const nativeFrame = {
        uri: String(fileUri),
        name: String(params.frameAsset.name || "documento.jpg"),
        type: String(params.frameAsset.mimeType || "image/jpeg"),
      } as any;
      formData.append("frame", nativeFrame);
    }

    return apiUploadMultipart("/api/vision/verify-epp", formData);
  },

  async getLogs(): Promise<{
    last_scanned_worker: Worker | null;
    logs: GateLog[];
  }> {
    return apiFetch("/api/vision/logs");
  },

  async getAuthorizedRoster(): Promise<CachedWorkerRosterItem[]> {
    try {
      const res = await apiFetch<AuthorizedRosterResponse>(
        "/api/kiosco/authorized-roster"
      );
      return res.roster || [];
    } catch {
      const res = await apiFetch<AuthorizedRosterResponse>(
        "/api/vision/authorized-roster"
      );
      return res.roster || [];
    }
  },

  async syncOfflineLogs(
    logs: OfflineAccessLog[]
  ): Promise<SyncOfflineLogsResponse> {
    return apiFetch<SyncOfflineLogsResponse>("/api/kiosco/sync-offline-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
    });
  },
};

