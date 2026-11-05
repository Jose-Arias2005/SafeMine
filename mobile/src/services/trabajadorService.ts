import {
  ExamQuestion,
  MedicalAuditResult,
  NativeUploadAsset,
  ProposalSummary,
  Worker,
} from "../types";
import { apiFetch } from "./apiClient";

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
    const formData = new FormData();
    const nativeFile = {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType,
    } as unknown as Blob;

    formData.append("file", nativeFile);
    formData.append("mock_behavior", mockBehavior);

    return apiFetch(`/api/trabajador/${workerId}/medical-cert`, {
      method: "POST",
      body: formData,
    });
  },
};

