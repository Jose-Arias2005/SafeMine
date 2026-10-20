"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  Upload,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  XCircle,
} from "lucide-react";
import { Worker } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface MedicalUploadStepProps {
  worker: Worker;
  onUploadCert: (
    file: File | null,
    behavior: "auto" | "mock_apto" | "mock_rechazado"
  ) => Promise<{
    valid: boolean;
    summary: string;
    model_used: string;
  }>;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export default function MedicalUploadStep({
  worker,
  onUploadCert,
  onPrevStep,
  onNextStep,
}: MedicalUploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    valid: boolean;
    summary: string;
    model_used: string;
  } | null>(null);

  const handleValidate = async (
    behavior: "auto" | "mock_apto" | "mock_rechazado"
  ) => {
    setUploading(true);
    try {
      const res = await onUploadCert(file, behavior);
      setAiFeedback(res);
    } finally {
      setUploading(false);
    }
  };

  const isValidated = worker.medical_cert_status === "VALIDADA_POR_IA";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Paso 2: Validación de Constancia Médica con Google Gemini IA
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sube tu Certificado de Aptitud Médico Ocupacional (PDF o JPG/PNG).
            La IA audita que el documento sea auténtico y tenga resultado{" "}
            <strong className="text-slate-800">APTO</strong>.
          </p>
        </div>

        <div>
          {isValidated ? (
            <Badge variant="emerald">Validada por Gemini IA</Badge>
          ) : worker.medical_cert_status === "RECHAZADA" ? (
            <Badge variant="red">Documento Rechazado</Badge>
          ) : (
            <Badge variant="slate">Pendiente de Validación</Badge>
          )}
        </div>
      </div>

      {/* Selector de archivo */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-3">
        <Upload className="h-8 w-8 text-blue-600 mx-auto" />
        <div>
          <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:underline">
            <span>Seleccionar certificado PDF o imagen (JPG/PNG)</span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
          <p className="text-xs text-slate-500 mt-1">
            {file
              ? `Archivo cargado: ${file.name}`
              : "O utiliza los botones de validación directa abajo si aún no tienes un archivo a mano."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => handleValidate(file ? "auto" : "mock_apto")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>
              {uploading
                ? "Analizando documento con Gemini IA..."
                : "Validar Constancia Médica 'APTO' con IA"}
            </span>
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={() => handleValidate("mock_rechazado")}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            <span>Simular Documento Inválido / NO APTO</span>
          </button>
        </div>
      </div>

      {/* Dictamen de Gemini IA */}
      {(aiFeedback || worker.medical_ai_feedback) && (
        <div
          className={`rounded-xl border p-4 text-xs space-y-1.5 ${
            isValidated
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <span>Dictamen de Auditoría Médica IA: {worker.medical_cert_status}</span>
            {aiFeedback?.model_used && (
              <span className="text-[11px] font-normal opacity-80">
                Modelo: {aiFeedback.model_used}
              </span>
            )}
          </div>
          <p className="leading-relaxed">
            {aiFeedback?.summary || worker.medical_ai_feedback}
          </p>
        </div>
      )}

      {/* Navegación entre pasos */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrevStep}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Paso 1</span>
        </button>

        {isValidated && (
          <button
            type="button"
            onClick={onNextStep}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <span>Ver Fotocheck Digital QR (Paso 3)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
