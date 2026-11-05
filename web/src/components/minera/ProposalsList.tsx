"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  KeyRound,
  Users,
  Calendar,
} from "lucide-react";
import { Proposal } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface ProposalsListProps {
  proposals: Proposal[];
  onAcceptProposal: (proposalId: number) => Promise<void>;
  onGoToEvaluation: (proposalId: number) => void;
}

export default function ProposalsList({
  proposals,
  onAcceptProposal,
  onGoToEvaluation,
}: ProposalsListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(
    proposals.find((p) => p.status === "POSTULADA")?.id ?? null
  );
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const handleAccept = async (id: number) => {
    setAcceptingId(id);
    try {
      await onAcceptProposal(id);
    } finally {
      setAcceptingId(null);
    }
  };

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        No hay convocatorias registradas actualmente.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((prop) => {
        const isExpanded = expandedId === prop.id;
        return (
          <div
            key={prop.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {prop.status === "POSTULADA" && (
                    <Badge variant="amber">
                      Postulada por Proveedor · Lista para Aceptar
                    </Badge>
                  )}
                  {prop.status === "ACEPTADA" && (
                    <Badge variant="emerald">
                      Propuesta Aceptada · {prop.workers.length} Cuentas Creadas
                    </Badge>
                  )}
                  {prop.status === "ABIERTA" && (
                    <Badge variant="slate">Convocatoria Abierta</Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" /> Inicio: {prop.start_date}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" /> Cupo: {prop.quota} personas
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {prop.title}
                </h3>
                <p className="text-sm text-slate-600 max-w-3xl">
                  {prop.description}
                </p>

                {prop.provider_company_name && (
                  <div className="text-xs font-medium text-blue-600 pt-1">
                    Proveedor Postulante: <strong>{prop.provider_company_name}</strong>{" "}
                    ({prop.workers.length} trabajadores propuestos)
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {prop.status === "POSTULADA" && (
                  <button
                    type="button"
                    disabled={acceptingId === prop.id}
                    onClick={() => handleAccept(prop.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {acceptingId === prop.id
                        ? "Creando cuentas..."
                        : `Aceptar Propuesta y Generar ${prop.workers.length} Cuentas`}
                    </span>
                  </button>
                )}

                {prop.status === "ACEPTADA" && (
                  <button
                    type="button"
                    onClick={() => onGoToEvaluation(prop.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Evaluar Personal y Emitir Reporte</span>
                  </button>
                )}

                {prop.workers.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : prop.id)
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <span>Ver Nómina ({prop.workers.length})</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {isExpanded && prop.workers.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Trabajador</th>
                        <th className="py-2.5 px-3">DNI</th>
                        <th className="py-2.5 px-3">Cargo</th>
                        <th className="py-2.5 px-3">Usuario</th>
                        <th className="py-2.5 px-3">Contraseña Temporal</th>
                        <th className="py-2.5 px-3">Estado Acreditación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prop.workers.map((w, idx) => {
                        const uname = w.generated_username || (prop.status === "ACEPTADA" ? `op.${w.dni}` : null);
                        const pword = w.generated_password || (prop.status === "ACEPTADA" ? `mina${w.dni.slice(-4)}` : null);
                        return (
                          <tr key={w.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {w.full_name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {w.dni}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {w.position}
                            </td>
                            <td className="py-2.5 px-3">
                              {uname ? (
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {uname}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Al aceptar</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {pword ? (
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {pword}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Al aceptar</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {w.is_authorized ? (
                                <Badge variant="emerald">Autorizado QR</Badge>
                              ) : (
                                <Badge variant="amber">En Acreditación</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
