"use client";

import React, { useState } from "react";
import { KeyRound, Copy, Check, ArrowRight } from "lucide-react";
import { Proposal } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface CredentialsTableProps {
  proposals: Proposal[];
}

export default function CredentialsTable({ proposals }: CredentialsTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeProposals = proposals.filter(
    (p) => p.status === "ACEPTADA" || p.status === "POSTULADA"
  );

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (activeProposals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Aún no tienes cuadrillas postuladas o aceptadas en tu cuenta de proveedor.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeProposals.map((prop) => (
        <div
          key={prop.id}
          className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                {prop.status === "ACEPTADA" ? (
                  <Badge variant="emerald">
                    Propuesta Aceptada · {prop.workers.length} Cuentas Habilitadas
                  </Badge>
                ) : (
                  <Badge variant="amber">
                    En Revisión por la Minera · Pendiente de Aceptar
                  </Badge>
                )}
                <span className="text-xs text-slate-500">
                  Acreditados para Mina: {prop.authorized_count}/
                  {prop.workers.length}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {prop.title}
              </h3>
            </div>
            {prop.status === "ACEPTADA" && (
              <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                Copia las credenciales de cualquier operario para probar su login en <span className="font-semibold text-blue-700">/login</span>.
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Trabajador / Cargo</th>
                  <th className="py-3 px-3">DNI</th>
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3">Contraseña Temporal</th>
                  <th className="py-3 px-3">Paso 1: Examen (&gt;=80%)</th>
                  <th className="py-3 px-3">Paso 2: Constancia IA</th>
                  <th className="py-3 px-3">Paso 3: Estado Mina</th>
                  <th className="py-3 px-3 text-right">Copiar Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prop.workers.map((w, idx) => {
                  const username = w.generated_username || `op.${w.dni}`;
                  const password = w.generated_password || `mina${w.dni.slice(-4)}`;
                  const userKey = `user-${w.id}`;
                  const pwdKey = `pwd-${w.id}`;
                  const bothKey = `both-${w.id}`;

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {w.full_name}
                        </div>
                        <div className="text-slate-500 text-[11px]">{w.position}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {w.dni}
                      </td>

                      {/* Columna 1: Usuario */}
                      <td className="py-3 px-3">
                        {prop.status === "ACEPTADA" ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
                              {username}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(username, userKey)}
                              className="text-slate-400 hover:text-blue-600 p-0.5"
                              title="Copiar usuario"
                            >
                              {copiedKey === userKey ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Columna 2: Contraseña Temporal */}
                      <td className="py-3 px-3">
                        {prop.status === "ACEPTADA" ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                              {password}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(password, pwdKey)}
                              className="text-slate-400 hover:text-emerald-700 p-0.5"
                              title="Copiar contraseña"
                            >
                              {copiedKey === pwdKey ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Al aceptar
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {w.exam_passed ? (
                          <Badge variant="emerald">
                            Aprobado ({w.exam_score}/100)
                          </Badge>
                        ) : (
                          <Badge variant="slate">
                            Pendiente ({w.exam_score}/100)
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {w.medical_cert_status === "VALIDADA_POR_IA" ? (
                          <Badge variant="emerald">Validada por IA</Badge>
                        ) : w.medical_cert_status === "RECHAZADA" ? (
                          <Badge variant="red">Rechazada</Badge>
                        ) : (
                          <Badge variant="slate">Pendiente</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {w.is_authorized ? (
                          <Badge variant="emerald">Autorizado</Badge>
                        ) : (
                          <Badge variant="amber">En Proceso</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {prop.status === "ACEPTADA" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(`${username} / ${password}`, bothKey)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            title="Copiar Usuario y Contraseña"
                          >
                            {copiedKey === bothKey ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-700">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-500" />
                                <span>Copiar Ambos</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
