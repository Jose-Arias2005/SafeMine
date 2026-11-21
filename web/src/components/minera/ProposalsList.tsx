"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Users,
  Building2,
} from "lucide-react";
import { Proposal } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";

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
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        No hay convocatorias registradas actualmente.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((prop) => {
        const defaultExpanded = prop.status === "POSTULADA";

        return (
          <article
            key={prop.id}
            className="sm-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="sm-card-header">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                  {prop.status === "POSTULADA" && (
                    <Badge variant="amber">Postulada</Badge>
                  )}
                  {prop.status === "ACEPTADA" && (
                    <Badge variant="emerald">Aceptada</Badge>
                  )}
                  {prop.status === "ABIERTA" && (
                    <Badge variant="slate">Abierta</Badge>
                  )}

                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Inicio: {prop.start_date}
                  </span>

                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Cupo: {prop.quota}
                  </span>

                  {prop.provider_company_name && (
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <Building2
                        className="h-3.5 w-3.5 text-slate-400"
                        aria-hidden="true"
                      />
                      <strong className="font-medium">
                        {prop.provider_company_name}
                      </strong>
                    </span>
                  )}
                </div>

                <h2 className="text-base font-semibold text-slate-900">
                  {prop.title}
                </h2>
                <p className="max-w-3xl text-sm text-slate-600">
                  {prop.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {prop.status === "POSTULADA" && (
                  <button
                    type="button"
                    disabled={acceptingId === prop.id}
                    onClick={() => handleAccept(prop.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {acceptingId === prop.id
                        ? "Aceptando..."
                        : `Aceptar y crear ${prop.workers.length} cuentas`}
                    </span>
                  </button>
                )}

                {prop.status === "ACEPTADA" && (
                  <button
                    type="button"
                    onClick={() => onGoToEvaluation(prop.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <ClipboardCheck
                      className="h-4 w-4 text-blue-600"
                      aria-hidden="true"
                    />
                    <span>Evaluar personal</span>
                  </button>
                )}
              </div>
            </div>

            {prop.workers.length > 0 && (
              <details
                open={defaultExpanded}
                className="sm-details mt-4 border-t border-slate-100 pt-3.5"
              >
                <summary className="rounded-md py-1 text-xs font-medium text-slate-700 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                  <span>
                    Nómina propuesta ({prop.workers.length} operarios
                    {prop.status === "ACEPTADA"
                      ? ` · ${prop.authorized_count}/${prop.workers.length} autorizados`
                      : ""}
                    )
                  </span>
                </summary>

                <div className="pt-3">
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={`Nómina de ${prop.title}`}
                    className="sm-table-wrap sm-scroll rounded-lg border border-slate-200"
                  >
                    <table className="sm-table-responsive text-left text-xs">
                      <caption className="visually-hidden">
                        Nómina de trabajadores para {prop.title}
                      </caption>
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                            Trabajador
                          </th>
                          <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                            DNI
                          </th>
                          <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                            Cargo
                          </th>
                          <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                            Acceso temporal
                          </th>
                          <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                            Acreditación
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prop.workers.map((w, idx) => {
                          const uname =
                            w.generated_username ||
                            (prop.status === "ACEPTADA" ? `op.${w.dni}` : null);
                          const pword =
                            w.generated_password ||
                            (prop.status === "ACEPTADA"
                              ? `mina${w.dni.slice(-4)}`
                              : null);

                          return (
                            <tr
                              key={w.id}
                              className="sm-copyable bg-white hover:bg-slate-50/70"
                            >
                              <th
                                scope="row"
                                className="bg-white px-3 py-2.5 font-medium text-slate-900"
                              >
                                <span className="mr-2 font-mono text-[11px] text-slate-400 tabular-nums">
                                  {idx + 1}.
                                </span>
                                {w.full_name}
                              </th>
                              <td
                                data-label="DNI"
                                className="px-3 py-2.5 font-mono text-slate-600 tabular-nums"
                              >
                                {w.dni}
                              </td>
                              <td
                                data-label="Cargo"
                                className="px-3 py-2.5 text-slate-600"
                              >
                                {w.position}
                              </td>
                              <td data-label="Acceso temporal" className="px-3 py-2.5">
                                {uname && pword ? (
                                  <div className="inline-flex items-center gap-2 font-mono text-[11px] text-slate-800">
                                    <span>
                                      {uname}{" "}
                                      <span className="text-slate-400">/</span>{" "}
                                      {pword}
                                    </span>
                                    <CopyButton
                                      value={`${uname} / ${pword}`}
                                      label={`Copiar credenciales de ${w.full_name}`}
                                      revealOnHover
                                    />
                                  </div>
                                ) : (
                                  <span className="text-slate-400">
                                    Se genera al aceptar
                                  </span>
                                )}
                              </td>
                              <td data-label="Acreditación" className="px-3 py-2.5">
                                {w.is_authorized ? (
                                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                      aria-hidden="true"
                                    />
                                    Autorizado QR
                                  </span>
                                ) : (
                                  <span className="text-slate-500">
                                    En acreditación
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            )}
          </article>
        );
      })}
    </div>
  );
}
