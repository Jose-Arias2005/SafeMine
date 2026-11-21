"use client";

import React, { useEffect, useId, useState } from "react";
import { Calendar, Send, Sparkles, Users } from "lucide-react";
import { Proposal, WorkerCandidateInput } from "@/types";

const SAMPLE_SQUAD_10: WorkerCandidateInput[] = [
  { first_name: "Alberto", last_name: "Ríos Huamán", dni: "72819001", email: "alberto.rios@contratistasperu.pe", position: "Maestro Perforista" },
  { first_name: "Braulio", last_name: "Quispe Luján", dni: "72819002", email: "braulio.quispe@contratistasperu.pe", position: "Operador Lanzador Shotcrete" },
  { first_name: "Cristian", last_name: "Vargas Mendoza", dni: "72819003", email: "cristian.vargas@contratistasperu.pe", position: "Técnico Electromecánico" },
  { first_name: "Dante", last_name: "Morales Soto", dni: "72819004", email: "dante.morales@contratistasperu.pe", position: "Operador Scooptram" },
  { first_name: "Édgar", last_name: "Paredes Tapia", dni: "72819005", email: "edgar.paredes@contratistasperu.pe", position: "Soldador 6G" },
  { first_name: "Fabián", last_name: "Aguilar Condori", dni: "72819006", email: "fabian.aguilar@contratistasperu.pe", position: "Ayudante de Sostenimiento" },
  { first_name: "Gonzalo", last_name: "Salazar Puma", dni: "72819007", email: "gonzalo.salazar@contratistasperu.pe", position: "Técnico de Ventilación" },
  { first_name: "Hugo", last_name: "Palomino Vega", dni: "72819008", email: "hugo.palomino@contratistasperu.pe", position: "Rigger Acreditado" },
  { first_name: "Iván", last_name: "Gutiérrez Cueva", dni: "72819009", email: "ivan.gutierrez@contratistasperu.pe", position: "Electricista de Mina" },
  { first_name: "Julio", last_name: "Ochoa Silva", dni: "72819010", email: "julio.ochoa@contratistasperu.pe", position: "Supervisor SSO Cuadrilla" },
];

interface OpenProposalsViewProps {
  proposals: Proposal[];
  onPostulate: (
    proposalId: number,
    workers: WorkerCandidateInput[]
  ) => Promise<void>;
}

export default function OpenProposalsView({
  proposals,
  onPostulate,
}: OpenProposalsViewProps) {
  const openProposals = proposals.filter((p) => p.status === "ABIERTA");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
    openProposals[0] || null
  );
  const [rows, setRows] = useState<WorkerCandidateInput[]>(SAMPLE_SQUAD_10);
  const [submitting, setSubmitting] = useState(false);

  const radioGroupName = useId();
  const tableHeadingId = useId();

  const buildRowsForQuota = (quota: number) => {
    const list: WorkerCandidateInput[] = [];
    for (let i = 0; i < quota; i++) {
      list.push(
        SAMPLE_SQUAD_10[i] || {
          first_name: `Operario ${i + 1}`,
          last_name: "Contratista",
          dni: `739010${String(i + 1).padStart(2, "0")}`,
          email: `operario${i + 1}@contratistasperu.pe`,
          position: "Técnico Operativo",
        }
      );
    }
    setRows(list);
  };

  useEffect(() => {
    if (openProposals.length > 0 && !selectedProposal) {
      setSelectedProposal(openProposals[0]);
      buildRowsForQuota(openProposals[0].quota);
    } else if (openProposals.length === 0) {
      setSelectedProposal(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals]);

  const updateRow = (
    idx: number,
    field: keyof WorkerCandidateInput,
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;
    setSubmitting(true);
    try {
      await onPostulate(selectedProposal.id, rows);
    } finally {
      setSubmitting(false);
    }
  };

  if (openProposals.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="text-sm font-semibold text-slate-800">
          No hay convocatorias abiertas pendientes de postulación
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Todas las convocatorias actuales ya cuentan con cuadrilla postulada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Choice cards semánticas (<label> + <input type="radio">) sin saltos de layout */}
      <fieldset className="space-y-2.5">
        <legend className="text-xs font-medium text-slate-600">
          Selecciona una convocatoria abierta
        </legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {openProposals.map((p) => {
            const isSelected = selectedProposal?.id === p.id;
            return (
              <label
                key={p.id}
                className="sm-choice-card flex cursor-pointer items-start gap-3 rounded-xl p-4"
              >
                <input
                  type="radio"
                  name={radioGroupName}
                  value={p.id}
                  checked={isSelected}
                  onChange={() => {
                    setSelectedProposal(p);
                    buildRowsForQuota(p.quota);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {p.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {p.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      Cupo: {p.quota}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      Inicio: {p.start_date}
                    </span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Formulario de postulación de cuadrilla */}
      {selectedProposal && (
        <form
          onSubmit={handleSubmit}
          aria-labelledby={tableHeadingId}
          className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2
                id={tableHeadingId}
                className="text-sm font-semibold text-slate-900"
              >
                Nómina de {rows.length} trabajadores — {selectedProposal.title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Completa los datos personales y el cargo de cada integrante.
              </p>
            </div>
            <button
              type="button"
              onClick={() => buildRowsForQuota(selectedProposal.quota)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span>Autocompletar plantilla ({selectedProposal.quota})</span>
            </button>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby={tableHeadingId}
            className="sm-table-wrap sm-scroll max-h-[60vh]"
          >
            <table className="sm-table-responsive text-left text-xs">
              <caption className="visually-hidden">
                Formulario de nómina de cuadrilla para {selectedProposal.title}
              </caption>
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                    #
                  </th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                    Nombres
                  </th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                    Apellidos
                  </th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                    DNI
                  </th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                    Correo electrónico
                  </th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                    Cargo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => {
                  const rowNum = idx + 1;
                  return (
                    <tr key={idx} className="bg-white hover:bg-slate-50/50">
                      <th
                        scope="row"
                        className="bg-white px-3 py-2 font-mono text-xs font-medium text-slate-500 tabular-nums"
                      >
                        {rowNum}
                      </th>
                      <td data-label="Nombres" data-stack="true" className="px-2.5 py-2">
                        <input
                          type="text"
                          required
                          value={r.first_name}
                          aria-label={`Nombres del trabajador ${rowNum}`}
                          onChange={(e) =>
                            updateRow(idx, "first_name", e.target.value)
                          }
                          className="w-full min-w-[120px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        />
                      </td>
                      <td data-label="Apellidos" data-stack="true" className="px-2.5 py-2">
                        <input
                          type="text"
                          required
                          value={r.last_name}
                          aria-label={`Apellidos del trabajador ${rowNum}`}
                          onChange={(e) =>
                            updateRow(idx, "last_name", e.target.value)
                          }
                          className="w-full min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        />
                      </td>
                      <td data-label="DNI" data-stack="true" className="px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          spellCheck={false}
                          value={r.dni}
                          aria-label={`DNI del trabajador ${rowNum}`}
                          onChange={(e) => updateRow(idx, "dni", e.target.value)}
                          className="w-full sm:w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        />
                      </td>
                      <td data-label="Correo" data-stack="true" className="px-2.5 py-2">
                        <input
                          type="email"
                          required
                          spellCheck={false}
                          value={r.email}
                          aria-label={`Correo electrónico del trabajador ${rowNum}`}
                          onChange={(e) =>
                            updateRow(idx, "email", e.target.value)
                          }
                          className="w-full min-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        />
                      </td>
                      <td data-label="Cargo" data-stack="true" className="px-2.5 py-2">
                        <input
                          type="text"
                          required
                          value={r.position}
                          aria-label={`Cargo del trabajador ${rowNum}`}
                          onChange={(e) =>
                            updateRow(idx, "position", e.target.value)
                          }
                          className="w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {submitting
                  ? "Enviando postulación..."
                  : `Postular cuadrilla (${rows.length})`}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
