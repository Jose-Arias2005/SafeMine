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

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
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

export interface ProposalSummary {
  id: number;
  title: string;
  start_date: string;
  provider_company_name: string | null;
  required_epps: string[];
}

export interface ExamQuestion {
  id: number;
  question: string;
  options: string[];
}

export interface MedicalAuditResult {
  is_medical_certificate: boolean;
  worker_dni?: string | null;
  worker_name?: string | null;
  aptitude_result: "APTO" | "NO_APTO" | "NO_DETERMINADO" | string;
  confidence_score: number;
  rejection_reason?: string | null;
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

export interface EppVerificationResponse {
  status: "VERDE" | "ROJO";
  all_epp_present: boolean;
  required_epps: string[];
  detected_epps: string[];
  missing_epps: string[];
  mode: string;
  confidence_summary: string;
  message: string;
  worker: Worker;
}

export interface CachedOfflineBadge {
  worker: Worker;
  companyName: string;
  requiredEpps: string[];
  cachedAt: string;
}

export interface NativeUploadAsset {
  uri: string;
  name: string;
  mimeType: string;
}

export interface CachedWorkerRosterItem {
  worker_id: number;
  id: number;
  dni: string;
  full_name: string;
  position: string;
  company_name?: string | null;
  is_authorized: boolean;
  exam_passed: boolean;
  exam_score: number;
  medical_cert_status: string;
  qr_token: string;
  required_epps: string[];
}

export interface AuthorizedRosterResponse {
  total: number;
  roster: CachedWorkerRosterItem[];
  downloaded_at: string;
}

export interface OfflineAccessLog {
  worker_id: number | null;
  worker_name: string;
  worker_dni: string;
  phase: string;
  status: "VERDE" | "ROJO" | "QR_OK";
  detected_epps: string[];
  missing_epps: string[];
  missing_items?: string[];
  message: string;
  timestamp: string;
}

export interface SyncOfflineLogsResponse {
  success: boolean;
  synced_count: number;
  message: string;
  synced_at: string;
}

export type RootStackParamList = {
  Login: undefined;
  InductionQuiz: { workerId: number };
  MedicalUpload: { workerId: number };
  DigitalBadge: { offlineMode?: boolean; dniHint?: string } | undefined;
  GateScanner: undefined;
};

