"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, FileDown } from "lucide-react";
import { Proposal } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { generatePerformanceReportPDF } from "@/utils/pdfGenerator";

interface ReportsInboxProps {
  proposals: Proposal[];
}

export default function ReportsInbox({ proposals }: ReportsInboxProps) {
  const reports = proposals.filter(
    (p) =>
      p.status === "ACEPTADA" &&
      (p.report_sent || p.incident_workers_count > 0)
  );

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Aún no hay reportes de desempeño emitidos por la Minera.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reports.map((rep) => {
        const goodWorkers = rep.workers.filter(
          (w) => !w.mala_conducta && !w.mal_trabajo && !w.no_lleva_epps
        );
        const flaggedWorkers = rep.workers.filter(
          (w) => w.mala_conducta || w.mal_trabajo || w.no_lleva_epps
        );

        return (
          <article
            key={rep.id}
            className="sm-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            {/* Cabecera y resumen ejecutivo */}
            <div className="sm-card-header border-b border-slate-100 pb-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                  {rep.report_sent ? (
                    <Badge variant="slate">
                      Reporte oficial · {rep.report_sent_at}
                    </Badge>
                  ) : (
                    <Badge variant="amber">Evaluación en curso</Badge>
                  )}
                  <span className="tabular-nums">
                    <strong className="font-semibold text-slate-900">
                      {flaggedWorkers.length}
                    </strong>{" "}
                    con observaciones ·{" "}
                    <strong className="font-semibold text-slate-900">
                      {goodWorkers.length}
                    </strong>{" "}
                    sin faltas
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  {rep.title}
                </h2>
                {rep.report_summary && (
                  <p className="text-xs text-slate-500">{rep.report_summary}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => generatePerformanceReportPDF(rep)}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Descargar PDF</span>
              </button>
            </div>

            {/* Prioridad 1: Personal con incumplimientos (visible de inmediato, sin scroll anidado) */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    flaggedWorkers.length > 0 ? "text-red-600" : "text-slate-400"
                  }`}
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  Personal con incumplimientos ({flaggedWorkers.length})
                </span>
              </div>

              {flaggedWorkers.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs text-slate-600">
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-600 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Ningún trabajador de esta cuadrilla presenta observaciones negativas.
                  </span>
                </div>
              ) : (
                <ul className="divide-y divide-red-100 rounded-lg border border-red-200/80 bg-red-50/25">
                  {flaggedWorkers.map((w) => (
                    <li key={w.id} className="space-y-1.5 px-4 py-3 text-xs">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-semibold text-slate-900">
                          {w.full_name}{" "}
                          <span className="font-mono font-normal text-slate-500 tabular-nums">
                            (DNI {w.dni})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {w.position}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {w.mala_conducta && (
                          <Badge variant="red">Mala conducta</Badge>
                        )}
                        {w.mal_trabajo && (
                          <Badge variant="amber">Mal trabajo</Badge>
                        )}
                        {w.no_lleva_epps && (
                          <Badge variant="red">
                            Sin EPPs
                            {w.faltas_epp_count > 0
                              ? ` (${w.faltas_epp_count} cámara)`
                              : ""}
                          </Badge>
                        )}
                      </div>

                      {w.observaciones && (
                        <p className="text-[11px] text-slate-600">
                          “{w.observaciones}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Prioridad 2: Personal con buen desempeño (colapsado por defecto en <details>) */}
            <details className="sm-details border-t border-slate-100 pt-3">
              <summary className="rounded-md py-1 text-xs font-medium text-slate-700 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                <span className="tabular-nums">
                  Personal con buen desempeño ({goodWorkers.length})
                </span>
              </summary>

              <div className="pt-3">
                {goodWorkers.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No hay trabajadores sin observaciones en este reporte.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {goodWorkers.map((w) => (
                      <li
                        key={w.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {w.full_name}
                          </div>
                          <div className="truncate text-[11px] text-slate-500 tabular-nums">
                            DNI {w.dni} · {w.position}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] font-medium text-emerald-700">
                          Cumplió
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}
