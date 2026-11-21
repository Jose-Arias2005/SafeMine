"use client";

import React from "react";
import { Smartphone } from "lucide-react";
import { Proposal } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";

interface CredentialsTableProps {
  proposals: Proposal[];
}

export default function CredentialsTable({ proposals }: CredentialsTableProps) {
  const activeProposals = proposals.filter(
    (p) => p.status === "ACEPTADA" || p.status === "POSTULADA"
  );

  if (activeProposals.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Aún no tienes cuadrillas postuladas o aceptadas en tu cuenta de proveedor.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {activeProposals.map((prop) => {
        const isAccepted = prop.status === "ACEPTADA";

        return (
          <article
            key={prop.id}
            className="sm-card rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="sm-card-header border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                  {isAccepted ? (
                    <Badge variant="emerald">Aceptada</Badge>
                  ) : (
                    <Badge variant="amber">En revisión</Badge>
                  )}
                  <span className="tabular-nums">
                    Acreditados:{" "}
                    <strong className="font-semibold text-slate-800">
                      {prop.authorized_count}/{prop.workers.length}
                    </strong>
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {prop.title}
                </h2>
              </div>

              {isAccepted && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 shrink-0">
                  <Smartphone
                    className="h-3.5 w-3.5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <span>
                    Accesos para <strong className="font-medium text-slate-800">SafeMine Mobile</strong>{" "}
                    (inducción y Fotocheck QR).
                  </span>
                </div>
              )}
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label={`Nómina y accesos de ${prop.title}`}
              className="sm-table-wrap sm-scroll max-h-[65vh]"
            >
              <table className="sm-table-responsive text-left text-xs">
                <caption className="visually-hidden">
                  Nómina y credenciales temporales para {prop.title}
                </caption>
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="border-b border-slate-200 px-4 py-3">
                      Trabajador
                    </th>
                    <th scope="col" className="border-b border-slate-200 px-4 py-3">
                      Credenciales Mobile
                    </th>
                    <th scope="col" className="border-b border-slate-200 px-4 py-3">
                      Examen
                    </th>
                    <th scope="col" className="border-b border-slate-200 px-4 py-3">
                      Constancia IA
                    </th>
                    <th scope="col" className="border-b border-slate-200 px-4 py-3">
                      Estado mina
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prop.workers.map((w, idx) => {
                    const username = w.generated_username || `op.${w.dni}`;
                    const password =
                      w.generated_password || `mina${w.dni.slice(-4)}`;

                    return (
                      <tr
                        key={w.id}
                        className="sm-copyable bg-white hover:bg-slate-50/70"
                      >
                        <th
                          scope="row"
                          className="bg-white px-4 py-3 font-normal"
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

                        <td data-label="Credenciales Mobile" className="px-4 py-3">
                          {isAccepted ? (
                            <div className="inline-flex items-center gap-2 font-mono text-[11px] text-slate-800">
                              <span>
                                {username}{" "}
                                <span className="text-slate-400">/</span>{" "}
                                {password}
                              </span>
                              <CopyButton
                                value={`${username} / ${password}`}
                                label={`Copiar usuario y clave de ${w.full_name}`}
                                revealOnHover
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              Disponible al aceptar
                            </span>
                          )}
                        </td>

                        <td
                          data-label="Examen"
                          className="whitespace-nowrap px-4 py-3 tabular-nums"
                        >
                          <span
                            className={
                              w.exam_passed
                                ? "font-medium text-emerald-700"
                                : "text-slate-500"
                            }
                          >
                            {w.exam_passed ? "Aprobado" : "Pendiente"} (
                            {w.exam_score}%)
                          </span>
                        </td>

                        <td
                          data-label="Constancia IA"
                          className="whitespace-nowrap px-4 py-3"
                        >
                          {w.medical_cert_status === "VALIDADA_POR_IA" ? (
                            <span className="font-medium text-emerald-700">
                              Validada
                            </span>
                          ) : w.medical_cert_status === "RECHAZADA" ? (
                            <Badge variant="red">Rechazada</Badge>
                          ) : (
                            <span className="text-slate-500">Pendiente</span>
                          )}
                        </td>

                        <td
                          data-label="Estado mina"
                          className="whitespace-nowrap px-4 py-3"
                        >
                          {w.is_authorized ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                aria-hidden="true"
                              />
                              Autorizado
                            </span>
                          ) : (
                            <span className="text-slate-500">En proceso</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </div>
  );
}
