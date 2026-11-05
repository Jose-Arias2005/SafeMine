"use client";

import React, { useEffect, useState } from "react";
import { FileDown, Save, ShieldAlert } from "lucide-react";
import { Proposal, WorkerEvaluationItem } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface WorkerEvaluationTableProps {
  proposals: Proposal[];
  selectedProposalId: number | null;
  onSelectProposal: (id: number) => void;
  onSaveEvaluations: (
    proposal: Proposal,
    items: WorkerEvaluationItem[]
  ) => Promise<Proposal | null>;
  onDownloadAndSendReport: (
    proposal: Proposal,
    items: WorkerEvaluationItem[]
  ) => Promise<void>;
}

export default function WorkerEvaluationTable({
  proposals,
  selectedProposalId,
  onSelectProposal,
  onSaveEvaluations,
  onDownloadAndSendReport,
}: WorkerEvaluationTableProps) {
  const acceptedProposals = proposals.filter((p) => p.status === "ACEPTADA");
  const activeProposal =
    acceptedProposals.find((p) => p.id === selectedProposalId) ||
    acceptedProposals[0] ||
    null;

  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        mala_conducta: boolean;
        mal_trabajo: boolean;
        no_lleva_epps: boolean;
        observaciones: string;
      }
    >
  >({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: typeof drafts = {};
    for (const p of acceptedProposals) {
      for (const w of p.workers) {
        next[w.id] = {
          mala_conducta: w.mala_conducta,
          mal_trabajo: w.mal_trabajo,
          no_lleva_epps: w.no_lleva_epps,
          observaciones: w.observaciones || "",
        };
      }
    }
    setDrafts(next);
  }, [proposals]);

  const updateDraft = (
    workerId: number,
    field: "mala_conducta" | "mal_trabajo" | "no_lleva_epps" | "observaciones",
    value: boolean | string
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [workerId]: {
        ...(prev[workerId] || {
          mala_conducta: false,
          mal_trabajo: false,
          no_lleva_epps: false,
          observaciones: "",
        }),
        [field]: value,
      },
    }));
  };

  const buildPayload = (proposal: Proposal): WorkerEvaluationItem[] =>
    proposal.workers.map((w) => {
      const d = drafts[w.id] || {
        mala_conducta: w.mala_conducta,
        mal_trabajo: w.mal_trabajo,
        no_lleva_epps: w.no_lleva_epps,
        observaciones: w.observaciones || "",
      };
      return {
        worker_id: w.id,
        mala_conducta: d.mala_conducta,
        mal_trabajo: d.mal_trabajo,
        no_lleva_epps: d.no_lleva_epps,
        observaciones: d.observaciones,
      };
    });

  if (!activeProposal) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Acepta primero una propuesta en la pestaña &quot;Convocatorias y
        Postulaciones&quot; para habilitar la evaluación de su personal.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Barra superior de selección de cuadrilla y acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cuadrilla Activa:
          </label>
          <select
            value={activeProposal.id}
            onChange={(e) => onSelectProposal(Number(e.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
          >
            {acceptedProposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.provider_company_name || "Proveedor"} (
                {p.workers.length} operarios)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSaveEvaluations(
                  activeProposal,
                  buildPayload(activeProposal)
                );
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4 text-slate-500" />
            <span>Guardar Calificaciones</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onDownloadAndSendReport(
                  activeProposal,
                  buildPayload(activeProposal)
                );
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            <span>Descargar Reporte PDF y Enviar al Proveedor</span>
          </button>
        </div>
      </div>

      {/* Tabla limpia de evaluación */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
              <th className="py-3.5 px-4">#</th>
              <th className="py-3.5 px-4">Trabajador / Cargo</th>
              <th className="py-3.5 px-4">Acreditación</th>
              <th className="py-3.5 px-4 text-center">Mala Conducta</th>
              <th className="py-3.5 px-4 text-center">
                Mal Trabajo / Bajo Desempeño
              </th>
              <th className="py-3.5 px-4 text-center">
                No lleva sus EPPs (Manual / Cámara IA)
              </th>
              <th className="py-3.5 px-4">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80">
            {activeProposal.workers.map((w, idx) => {
              const d = drafts[w.id] || {
                mala_conducta: w.mala_conducta,
                mal_trabajo: w.mal_trabajo,
                no_lleva_epps: w.no_lleva_epps,
                observaciones: w.observaciones || "",
              };
              const hasIssue =
                d.mala_conducta || d.mal_trabajo || d.no_lleva_epps;

              return (
                <tr
                  key={w.id}
                  className={
                    hasIssue ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-slate-50"
                  }
                >
                  <td className="py-3.5 px-4 text-slate-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 text-sm">
                      {w.full_name}
                    </div>
                    <div className="text-slate-500">
                      DNI <span className="font-mono">{w.dni}</span> ·{" "}
                      {w.position}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      {w.is_authorized ? (
                        <Badge variant="emerald" className="w-fit">
                          Autorizado
                        </Badge>
                      ) : (
                        <Badge variant="amber" className="w-fit">
                          Pendiente
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-500">
                        Examen: {w.exam_score}% · EMO: {w.medical_cert_status}
                      </span>
                    </div>
                  </td>

                  {/* Checkbox 1: Mala conducta */}
                  <td className="py-3.5 px-4 text-center">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={d.mala_conducta}
                        onChange={(e) =>
                          updateDraft(w.id, "mala_conducta", e.target.checked)
                        }
                        className="h-4 w-4 rounded accent-red-600"
                      />
                      <span
                        className={
                          d.mala_conducta
                            ? "font-semibold text-red-700"
                            : "text-slate-600"
                        }
                      >
                        Mala conducta
                      </span>
                    </label>
                  </td>

                  {/* Checkbox 2: Mal trabajo */}
                  <td className="py-3.5 px-4 text-center">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={d.mal_trabajo}
                        onChange={(e) =>
                          updateDraft(w.id, "mal_trabajo", e.target.checked)
                        }
                        className="h-4 w-4 rounded accent-amber-600"
                      />
                      <span
                        className={
                          d.mal_trabajo
                            ? "font-semibold text-amber-700"
                            : "text-slate-600"
                        }
                      >
                        Mal trabajo
                      </span>
                    </label>
                  </td>

                  {/* Checkbox 3: No lleva sus EPPs */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={d.no_lleva_epps}
                          onChange={(e) =>
                            updateDraft(w.id, "no_lleva_epps", e.target.checked)
                          }
                          className="h-4 w-4 rounded accent-red-600"
                        />
                        <span
                          className={
                            d.no_lleva_epps
                              ? "font-semibold text-red-700"
                              : "text-slate-600"
                          }
                        >
                          No lleva sus EPPs
                        </span>
                      </label>
                      {w.faltas_epp_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          <ShieldAlert className="h-3 w-3" />
                          {w.faltas_epp_count} falta(s) en cámara
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Observaciones */}
                  <td className="py-3.5 px-4">
                    <input
                      type="text"
                      value={d.observaciones}
                      onChange={(e) =>
                        updateDraft(w.id, "observaciones", e.target.value)
                      }
                      placeholder="Añadir observación..."
                      className="w-full min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
