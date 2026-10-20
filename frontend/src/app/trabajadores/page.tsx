"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Lock,
  RefreshCw,
  HardHat,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import TrainingQuizStep from "@/components/trabajadores/TrainingQuizStep";
import MedicalUploadStep from "@/components/trabajadores/MedicalUploadStep";
import QrBadgeStep from "@/components/trabajadores/QrBadgeStep";
import { trabajadorService } from "@/services/trabajadorService";
import { ExamQuestion, Worker } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/Badge";

export default function TrabajadoresPage() {
  const { user } = useAuth();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);

  const determineInitialStep = (w: Worker) => {
    if (w.is_authorized) {
      return 3 as const;
    }
    if (w.exam_passed && w.exam_score >= 80) {
      return 2 as const;
    }
    return 1 as const;
  };

  const loadWorkerData = useCallback(async () => {
    if (!user?.worker_id) {
      // Si por alguna razón el usuario es trabajador pero no tiene worker_id en sesión, buscar por id o lista
      try {
        const listRes = await trabajadorService.listWorkers();
        if (listRes.workers.length > 0) {
          const matched =
            listRes.workers.find(
              (w) => w.dni === user?.dni || w.email === user?.email
            ) || listRes.workers[0];
          setWorker(matched);
          setActiveStep(determineInitialStep(matched));
        }
        const qRes = await trabajadorService.getExamQuestions();
        setQuestions(qRes.questions);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const [wRes, qRes] = await Promise.all([
        trabajadorService.getWorkerDetail(user.worker_id),
        trabajadorService.getExamQuestions(),
      ]);
      setWorker(wRes.worker);
      setQuestions(qRes.questions);
      setActiveStep(determineInitialStep(wRes.worker));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkerData();
  }, [loadWorkerData]);

  const handleSubmitExam = async (answers: number[]) => {
    if (!worker)
      return { passed: false, score: 0, message: "No se identificó el perfil del trabajador" };
    const res = await trabajadorService.submitExam(worker.id, answers);
    setWorker(res.worker);
    if (res.passed && res.score >= 80) {
      setActiveStep(2);
    }
    return {
      passed: res.passed,
      score: res.score,
      message: res.message,
    };
  };

  const handleUploadCert = async (
    file: File | null,
    behavior: "auto" | "mock_apto" | "mock_rechazado"
  ) => {
    if (!worker)
      return {
        valid: false,
        summary: "Trabajador no encontrado",
        model_used: "Gemini",
      };

    let uploadBlob: File | Blob = file as File;
    let filename = file?.name || `EMO_${worker.dni}.pdf`;

    if (!file) {
      filename =
        behavior === "mock_rechazado"
          ? `Documento_Invalido_${worker.dni}.pdf`
          : `Certificado_Medico_APTO_${worker.dni}.pdf`;
      uploadBlob = new Blob(
        [
          `CERTIFICADO MEDICO OCUPACIONAL\nTrabajador: ${worker.full_name}\nDNI: ${worker.dni}\nAptitud: ${
            behavior === "mock_rechazado" ? "NO APTO" : "APTO"
          }`,
        ],
        { type: "application/pdf" }
      );
    }

    const res = await trabajadorService.uploadMedicalCert(
      worker.id,
      uploadBlob,
      filename,
      behavior
    );
    setWorker(res.worker);
    if (res.ai_validation.valid) {
      setActiveStep(3);
    }

    return {
      valid: res.ai_validation.valid,
      summary: res.ai_validation.resumen_validacion,
      model_used: res.ai_validation.model_used,
    };
  };

  const step1Done = Boolean(worker && worker.exam_passed && worker.exam_score >= 80);
  const step2Done = Boolean(worker && worker.medical_cert_status === "VALIDADA_POR_IA");
  const step3Unlocked = Boolean(worker && worker.is_authorized);

  const steps = [
    {
      num: 1 as const,
      title: "Paso 1: Capacitación y Examen",
      subtitle: "Nota mínima >= 80%",
      done: step1Done,
      locked: false,
    },
    {
      num: 2 as const,
      title: "Paso 2: Constancia Médica IA",
      subtitle: "Validación Google Gemini",
      done: step2Done,
      locked: !step1Done,
    },
    {
      num: 3 as const,
      title: "Paso 3: Fotocheck QR",
      subtitle: "Autorización de ingreso",
      done: step3Unlocked,
      locked: !step3Unlocked,
    },
  ];

  if (loading) {
    return (
      <PageContainer title="Portal del Trabajador" subtitle="Cargando información de tu cuenta...">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
          Obteniendo tu expediente de acreditación...
        </div>
      </PageContainer>
    );
  }

  if (!worker) {
    return (
      <PageContainer title="Portal del Trabajador" subtitle="Expediente de Acreditación">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No se encontró un perfil de operario vinculado a esta sesión.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Por favor cierra sesión e inicia con la cuenta asignada a tu DNI.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`Bienvenido, ${worker.full_name}`}
      subtitle="Completa tus 3 pasos de acreditación obligatorios para habilitar tu ingreso a mina y generar tu Fotocheck QR."
      actions={
        <div className="flex items-center gap-2">
          {worker.is_authorized ? (
            <Badge variant="emerald">Habilitado para Mina</Badge>
          ) : (
            <Badge variant="amber">En Proceso de Acreditación</Badge>
          )}
          <button
            type="button"
            onClick={loadWorkerData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Actualizar datos"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refrescar</span>
          </button>
        </div>
      }
    >
      {/* Tarjeta de Identidad del Trabajador Logueado */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {worker.full_name}
                </h3>
                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 font-mono">
                  DNI: {worker.dni}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-0.5">
                <span>Cargo: <strong>{worker.position}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Empresa: <strong>{user?.company_name || "Contratistas Mineros"}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-500">Usuario: {worker.generated_username || user?.username}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Avance Acreditación
              </div>
              <div className="text-sm font-bold text-blue-700">
                {step3Unlocked ? "3 de 3 Completados (100%)" : step2Done ? "2 de 3 Pasos" : step1Done ? "1 de 3 Pasos" : "Paso 1 Pendiente"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard / Stepper Horizontal de 3 Pasos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s) => {
          const isCurrent = activeStep === s.num;
          return (
            <button
              key={s.num}
              type="button"
              disabled={s.locked}
              onClick={() => setActiveStep(s.num)}
              className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                isCurrent
                  ? "border-blue-600 bg-blue-50/50 shadow-xs"
                  : s.done
                  ? "border-emerald-200 bg-white hover:border-emerald-300"
                  : "border-slate-200 bg-white opacity-60 cursor-not-allowed"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  s.done
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : s.locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  s.num
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {s.title}
                </div>
                <div className="text-[11px] text-slate-500">{s.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Contenido exclusivo del paso activo */}
      {worker && activeStep === 1 && (
        <TrainingQuizStep
          worker={worker}
          questions={questions}
          onSubmitAnswers={handleSubmitExam}
          onNextStep={() => setActiveStep(2)}
        />
      )}

      {worker && activeStep === 2 && (
        <MedicalUploadStep
          worker={worker}
          onUploadCert={handleUploadCert}
          onPrevStep={() => setActiveStep(1)}
          onNextStep={() => setActiveStep(3)}
        />
      )}

      {worker && activeStep === 3 && (
        <QrBadgeStep worker={worker} onPrevStep={() => setActiveStep(2)} />
      )}
    </PageContainer>
  );
}
