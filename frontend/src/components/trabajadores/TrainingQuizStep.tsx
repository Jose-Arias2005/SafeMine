"use client";

import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
  PlayCircle,
} from "lucide-react";
import { ExamQuestion, Worker } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface TrainingQuizStepProps {
  worker: Worker;
  questions: ExamQuestion[];
  onSubmitAnswers: (answers: number[]) => Promise<{
    passed: boolean;
    score: number;
    message: string;
  }>;
  onNextStep: () => void;
}

export default function TrainingQuizStep({
  worker,
  questions,
  onSubmitAnswers,
  onNextStep,
}: TrainingQuizStepProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    passed: boolean;
    score: number;
    message: string;
  } | null>(null);

  const fillCorrect = () => {
    const next: Record<number, number> = {};
    questions.forEach((q, idx) => {
      next[idx] = q.correct_index;
    });
    setAnswers(next);
  };

  const fillFailing = () => {
    const next: Record<number, number> = {};
    questions.forEach((q, idx) => {
      next[idx] = idx < 3 ? q.correct_index : 0;
    });
    setAnswers(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const arr = questions.map((_, idx) => answers[idx] ?? -1);
      const res = await onSubmitAnswers(arr);
      setFeedback(res);
    } finally {
      setSubmitting(false);
    }
  };

  const isPassed = worker.exam_passed && worker.exam_score >= 80;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
      {/* Cabecera del Paso 1 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Paso 1: Inducción de Seguridad y Evaluación Obligatoria
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Regla de acreditación: Debes obtener una calificación mínima de{" "}
            <strong className="text-slate-800">80/100 (&gt;= 80%)</strong> para
            desbloquear la subida de tu Constancia Médica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPassed ? (
            <Badge variant="emerald">
              Aprobado ({worker.exam_score}/100)
            </Badge>
          ) : (
            <Badge variant="amber">
              Calificación actual: {worker.exam_score}/100
            </Badge>
          )}
        </div>
      </div>

      {/* Cápsulas de Capacitación */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
          <PlayCircle className="h-4 w-4" />
          <span>Resumen de Estándares SSO Mineros (DS 024-2016-EM)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="font-semibold text-slate-900 mb-1">
              1. Uso de EPPs en Planta y Mina
            </div>
            <p className="text-slate-600 leading-relaxed">
              Es obligatorio portar Casco con barbiquejo, Guantes de seguridad y
              Protección Facial/Lentes en todo momento.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="font-semibold text-slate-900 mb-1">
              2. Gestión IPERC y LOTOTO
            </div>
            <p className="text-slate-600 leading-relaxed">
              Elaborar el IPERC Continuo antes de iniciar labores y aplicar
              bloqueo LOTOTO con energía cero en equipos.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="font-semibold text-slate-900 mb-1">
              3. Control con Cámara IA en Garita
            </div>
            <p className="text-slate-600 leading-relaxed">
              Incumplir con los EPPs en garita activa la alarma roja y registra
              automáticamente la falta en tu evaluación.
            </p>
          </div>
        </div>
      </div>

      {/* Controles discretos de autocompletado rápido */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs">
        <span className="text-slate-500 font-medium">
          Autocompletar respuestas para prueba rápida:
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fillCorrect}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            Marcar 100/100 (Aprueba)
          </button>
          <button
            type="button"
            onClick={fillFailing}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-100"
          >
            Simular 60/100 (&lt; 80%)
          </button>
        </div>
      </div>

      {/* Cuestionario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, qIdx) => (
          <div
            key={q.id}
            className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
          >
            <div className="text-xs font-bold text-slate-900">{q.question}</div>
            <div className="space-y-1.5">
              {q.options.map((opt, oIdx) => {
                const checked = answers[qIdx] === oIdx;
                return (
                  <label
                    key={oIdx}
                    className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                      checked
                        ? "border-blue-600 bg-blue-50/60 text-slate-900 font-medium"
                        : "border-slate-200 bg-slate-50/40 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={checked}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                      }
                      className="mt-0.5 accent-blue-600"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {feedback && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border p-4 text-xs font-semibold ${
              feedback.passed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.passed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting
              ? "Calificando..."
              : "Enviar Examen y Verificar Puntaje"}
          </button>

          {isPassed && (
            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              <span>Continuar al Paso 2: Constancia Médica</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
