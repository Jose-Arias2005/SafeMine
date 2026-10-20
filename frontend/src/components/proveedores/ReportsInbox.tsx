"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, FileDown } from "lucide-react";
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
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Aún no hay reportes de desempeño emitidos por la Minera.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reports.map((rep) => {
        const goodWorkers = rep.workers.filter(
          (w) => !w.mala_conducta && !w.mal_trabajo && !w.no_lleva_epps
        );
        const flaggedWorkers = rep.workers.filter(
          (w) => w.mala_conducta || w.mal_trabajo || w.no_lleva_epps
        );

        return (
          <div
            key={rep.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  {rep.report_sent ? (
                    <Badge variant="blue">
                      Reporte Oficial Recibido ({rep.report_sent_at})
                    </Badge>
                  ) : (
                    <Badge variant="amber">
                      Vista Previa de Evaluación en Curso
                    </Badge>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {rep.title}
                </h3>
                {rep.report_summary && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rep.report_summary}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => generatePerformanceReportPDF(rep)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
              >
                <FileDown className="h-4 w-4" />
                <span>Descargar Reporte PDF</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Columna 1: Buen desempeño */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    Personal con Buen Desempeño ({goodWorkers.length})
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {goodWorkers.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {w.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          DNI {w.dni} · {w.position}
                        </div>
                      </div>
                      <Badge variant="emerald">Cumplió</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna 2: Observados / Incumplimientos */}
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>
                    Personal con Incumplimientos ({flaggedWorkers.length})
                  </span>
                </div>
                {flaggedWorkers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Ningún trabajador presenta observaciones negativas.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {flaggedWorkers.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-lg border border-red-200 bg-white p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {w.full_name} (DNI {w.dni})
                          </span>
                          <span className="text-slate-500">{w.position}</span>
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
                              No lleva sus EPPs ({w.faltas_epp_count} en cámara)
                            </Badge>
                          )}
                        </div>
                        {w.observaciones && (
                          <p className="text-[11px] text-slate-600 italic">
                            “{w.observaciones}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
