"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { FileDown, Save, ShieldAlert } from "lucide-react";
import { Proposal, WorkerEvaluationItem } from "@/types";

type EvalField =
  | "mala_conducta"
  | "mal_trabajo"
  | "no_lleva_epps"
  | "observaciones";

interface WorkerDraft {
  mala_conducta: boolean;
  mal_trabajo: boolean;
  no_lleva_epps: boolean;
  observaciones: string;
}

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
  const acceptedProposals = useMemo(
    () => proposals.filter((p) => p.status === "ACEPTADA"),
    [proposals]
  );

  const activeProposal =
    acceptedProposals.find((p) => p.id === selectedProposalId) ||
    acceptedProposals[0] ||
    null;

  const [drafts, setDrafts] = useState<Record<number, WorkerDraft>>({});
  const [dirtyCount, setDirtyCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Track unsaved edits per worker+field so real-time WebSocket refreshes never wipe local changes
  const dirtyFieldsRef = useRef<Record<number, Set<EvalField>>>({});

  const selectId = useId();
  const captionId = useId();

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<number, WorkerDraft> = {};
      for (const p of acceptedProposals) {
        for (const w of p.workers) {
          const prevWorker = prev[w.id];
          const dirty = dirtyFieldsRef.current[w.id];
          next[w.id] = {
            mala_conducta:
              dirty?.has("mala_conducta") && prevWorker
                ? prevWorker.mala_conducta
                : w.mala_conducta,
            mal_trabajo:
              dirty?.has("mal_trabajo") && prevWorker
                ? prevWorker.mal_trabajo
                : w.mal_trabajo,
            no_lleva_epps:
              dirty?.has("no_lleva_epps") && prevWorker
                ? prevWorker.no_lleva_epps
                : w.no_lleva_epps,
            observaciones:
              dirty?.has("observaciones") && prevWorker
                ? prevWorker.observaciones
                : w.observaciones || "",
          };
        }
      }
      return next;
    });
  }, [acceptedProposals]);

  const recomputeDirtyCount = (proposal: Proposal | null) => {
    if (!proposal) {
      setDirtyCount(0);
      return;
    }
    let count = 0;
    for (const w of proposal.workers) {
      const set = dirtyFieldsRef.current[w.id];
      if (set && set.size > 0) count++;
    }
    setDirtyCount(count);
  };

  useEffect(() => {
    recomputeDirtyCount(activeProposal);
  }, [activeProposal]);

  const updateDraft = (
    workerId: number,
    field: EvalField,
    value: boolean | string
  ) => {
    if (!dirtyFieldsRef.current[workerId]) {
      dirtyFieldsRef.current[workerId] = new Set();
    }
    dirtyFieldsRef.current[workerId].add(field);

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

    recomputeDirtyCount(activeProposal);
  };

  const clearDirtyForProposal = (proposal: Proposal) => {
    for (const w of proposal.workers) {
      delete dirtyFieldsRef.current[w.id];
    }
    recomputeDirtyCount(proposal);
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
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Acepta primero una propuesta en &quot;Convocatorias y postulaciones&quot;
        para habilitar la evaluación SSO del personal.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Barra superior de selección de cuadrilla y acciones */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-slate-600 shrink-0"
          >
            Cuadrilla activa
          </label>
          <select
            id={selectId}
            name="active_proposal"
            value={activeProposal.id}
            onChange={(e) => onSelectProposal(Number(e.target.value))}
            className="h-9 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            {acceptedProposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.provider_company_name || "Proveedor"} (
                {p.workers.length})
              </option>
            ))}
          </select>
          {dirtyCount > 0 && (
            <span className="text-[11px] font-medium text-amber-700 tabular-nums">
              {dirtyCount} registro{dirtyCount === 1 ? "" : "s"} sin guardar
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const saved = await onSaveEvaluations(
                  activeProposal,
                  buildPayload(activeProposal)
                );
                if (saved) clearDirtyForProposal(activeProposal);
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            <Save className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Guardar calificaciones</span>
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
                clearDirtyForProposal(activeProposal);
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Descargar PDF y enviar</span>
          </button>
        </div>
      </div>

      {/* Tabla accesible y responsive con encabezados sticky y vista apilada por @container */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={captionId}
        className="sm-table-wrap sm-scroll max-h-[68vh]"
      >
        <table className="sm-table-responsive text-left text-xs">
          <caption id={captionId} className="visually-hidden">
            Evaluación de desempeño SSO — {activeProposal.title}
          </caption>
          <thead>
            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                Trabajador
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                Acreditación
              </th>
              <th
                scope="col"
                className="border-b border-slate-200 px-3 py-3 text-center"
              >
                Mala conducta
              </th>
              <th
                scope="col"
                className="border-b border-slate-200 px-3 py-3 text-center"
              >
                Mal trabajo
              </th>
              <th
                scope="col"
                className="border-b border-slate-200 px-3 py-3 text-center"
              >
                Sin EPPs
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3">
                Observaciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                    hasIssue
                      ? "bg-red-50/30 hover:bg-red-50/50"
                      : "bg-white hover:bg-slate-50/70"
                  }
                >
                  <th
                    scope="row"
                    className={`px-4 py-3 font-normal ${
                      hasIssue ? "bg-red-50/70" : "bg-white"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {idx + 1}.
                      </span>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {w.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-mono tabular-nums">
                            DNI {w.dni}
                          </span>{" "}
                          · {w.position}
                        </div>
                      </div>
                    </div>
                  </th>

                  <td data-label="Acreditación" className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-xs font-medium ${
                          w.is_authorized ? "text-emerald-700" : "text-slate-600"
                        }`}
                      >
                        {w.is_authorized ? "Autorizado" : "Pendiente"}
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        Examen {w.exam_score}% · EMO{" "}
                        {w.medical_cert_status === "VALIDADA_POR_IA"
                          ? "OK"
                          : w.medical_cert_status === "RECHAZADA"
                          ? "Rechazado"
                          : "Pend."}
                      </span>
                    </div>
                  </td>

                  <td
                    data-label="Mala conducta"
                    className="px-3 py-3 text-center"
                  >
                    <input
                      type="checkbox"
                      checked={d.mala_conducta}
                      aria-label={`Mala conducta — ${w.full_name}`}
                      onChange={(e) =>
                        updateDraft(w.id, "mala_conducta", e.target.checked)
                      }
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                  </td>

                  <td data-label="Mal trabajo" className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={d.mal_trabajo}
                      aria-label={`Mal trabajo — ${w.full_name}`}
                      onChange={(e) =>
                        updateDraft(w.id, "mal_trabajo", e.target.checked)
                      }
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                  </td>

                  <td data-label="Sin EPPs" className="px-3 py-3 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <input
                        type="checkbox"
                        checked={d.no_lleva_epps}
                        aria-label={`No lleva sus EPPs — ${w.full_name}`}
                        onChange={(e) =>
                          updateDraft(w.id, "no_lleva_epps", e.target.checked)
                        }
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      />
                      {w.faltas_epp_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 tabular-nums">
                          <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                          {w.faltas_epp_count} cámara
                        </span>
                      )}
                    </div>
                  </td>

                  <td
                    data-label="Observaciones"
                    data-stack="true"
                    className="px-4 py-3"
                  >
                    <input
                      type="text"
                      value={d.observaciones}
                      aria-label={`Observaciones para ${w.full_name}`}
                      onChange={(e) =>
                        updateDraft(w.id, "observaciones", e.target.value)
                      }
                      placeholder="Añadir observación..."
                      className="w-full min-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
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
