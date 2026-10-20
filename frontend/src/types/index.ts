export interface Worker {
  id: number;
  user_id: number | null;
  proposal_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  dni: string;
  email: string;
  position: string;
  generated_username: string | null;
  generated_password: string | null;
  exam_score: number;
  exam_attempts: number;
  exam_passed: boolean;
  medical_cert_filename: string | null;
  medical_cert_url: string | null;
  medical_cert_status: "PENDIENTE" | "VALIDADA_POR_IA" | "RECHAZADA";
  medical_ai_feedback: string | null;
  is_authorized: boolean;
  mala_conducta: boolean;
  mal_trabajo: boolean;
  no_lleva_epps: boolean;
  faltas_epp_count: number;
  observaciones: string;
  qr_payload: string;
  proposal_title?: string;
  proposal_status?: string;
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  quota: number;
  start_date: string;
  required_epps: string[];
  status: "ABIERTA" | "POSTULADA" | "ACEPTADA";
  provider_id: number | null;
  provider_company_name: string | null;
  report_sent: boolean;
  report_sent_at: string | null;
  report_summary: string | null;
  workers_count: number;
  authorized_count: number;
  incident_workers_count: number;
  workers: Worker[];
}

export interface GeneratedCredential {
  worker_id: number;
  full_name: string;
  dni: string;
  username: string;
  password: string;
  email: string;
}

export interface WorkerCandidateInput {
  first_name: string;
  last_name: string;
  dni: string;
  email: string;
  position: string;
}

export interface WorkerEvaluationItem {
  worker_id: number;
  mala_conducta: boolean;
  mal_trabajo: boolean;
  no_lleva_epps: boolean;
  observaciones: string;
}

export interface ExamQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
}

export interface GateLog {
  id: number;
  worker_id: number | null;
  worker_name: string;
  worker_dni: string;
  phase: string;
  status: string;
  detected_epps: string[];
  missing_epps: string[];
  message: string;
  timestamp: string;
}

export interface BackendStatus {
  service: string;
  status: string;
  architecture?: string;
  gemini_model: string;
  gemini_mode: string;
  aws_mode: string;
  active_ws_clients: number;
}

export type Role = "MINERA" | "PROVEEDOR" | "TRABAJADOR";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: Role;
  full_name: string;
  company_name?: string | null;
  ruc?: string | null;
  worker_id?: number | null;
  dni?: string | null;
}

export interface DemoAccount {
  id: number;
  email: string;
  username: string;
  password: string;
  role: Role;
  full_name: string;
  company_name?: string | null;
  worker_id?: number | null;
  dni?: string | null;
  is_authorized?: boolean | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}
