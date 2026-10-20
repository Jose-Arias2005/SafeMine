import { ExamQuestion, Worker } from "@/types";
import { apiFetch } from "./apiClient";

export const trabajadorService = {
  async getExamQuestions(): Promise<{
    questions: ExamQuestion[];
    passing_score: number;
  }> {
    return apiFetch("/api/trabajador/exam-questions");
  },

  async listWorkers(): Promise<{ workers: Worker[] }> {
    return apiFetch("/api/trabajador/list");
  },

  async getWorkerDetail(workerId: number): Promise<{ worker: Worker }> {
    return apiFetch(`/api/trabajador/${workerId}`);
  },

  async loginWorker(identifier: string, password: string): Promise<{
    user: { worker_id: number | null; full_name: string };
  }> {
    return apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
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
    file: File | Blob,
    filename: string,
    mockBehavior: "auto" | "mock_apto" | "mock_rechazado" = "auto"
  ): Promise<{
    message: string;
    ai_validation: {
      valid: boolean;
      status: string;
      model_used: string;
      resumen_validacion: string;
      resultado_aptitud: string;
    };
    worker: Worker;
  }> {
    const formData = new FormData();
    formData.append("file", file, filename);
    formData.append("mock_behavior", mockBehavior);

    return apiFetch(`/api/trabajador/${workerId}/medical-cert`, {
      method: "POST",
      body: formData,
    });
  },
};
