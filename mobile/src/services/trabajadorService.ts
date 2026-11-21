import {
  ExamQuestion,
  MedicalAuditResult,
  NativeUploadAsset,
  ProposalSummary,
  Worker,
} from "../types";
import { apiFetch, apiUploadMultipart } from "./apiClient";

export const trabajadorService = {
  async getExamQuestions(): Promise<{
    questions: ExamQuestion[];
    passing_score: number;
  }> {
    return apiFetch("/api/trabajador/exam-questions");
  },

  async getWorkerDetail(workerId: number): Promise<{
    worker: Worker;
    proposal: ProposalSummary | null;
  }> {
    return apiFetch(`/api/trabajador/${workerId}`);
  },

  async listWorkers(): Promise<{ workers: Worker[] }> {
    return apiFetch("/api/trabajador/list");
  },

  async submitExam(
    workerId: number,
    answers: number[]
  ): Promise<{
    passed: boolean;
    score: number;
    attempts: number;
    message: string;
    worker: Worker;
  }> {
    return apiFetch(`/api/trabajador/${workerId}/exam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
  },

  async uploadMedicalCert(
    workerId: number,
    asset: NativeUploadAsset,
    mockBehavior: "auto" | "mock_apto" | "mock_rechazado" = "auto"
  ): Promise<{
    message: string;
    audit_result: MedicalAuditResult;
    ai_validation: {
      valid: boolean;
      status: string;
      model_used: string;
      resumen_validacion: string;
      resultado_aptitud: string;
      confidence_score?: number;
      rejection_reason?: string | null;
    };
    worker: Worker;
  }> {
    const fileUri = asset?.uri ? String(asset.uri).trim() : "";
    if (!fileUri) {
      throw new Error(
        "El certificado médico seleccionado no contiene una ruta (URI) válida. Vuelve a tomar la foto o elegir el archivo."
      );
    }

    const formData = new FormData();
    const nativeFile = {
      uri: String(fileUri),
      name: String(asset.name || "documento.jpg"),
      type: String(asset.mimeType || "image/jpeg"),
    } as any;

    formData.append("file", nativeFile);
    formData.append("mock_behavior", String(mockBehavior || "auto"));

    return apiUploadMultipart(
      `/api/trabajador/${workerId}/medical-cert`,
      formData
    );
  },
};

