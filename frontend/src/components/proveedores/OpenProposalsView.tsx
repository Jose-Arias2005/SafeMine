"use client";

import React, { useEffect, useState } from "react";
import { Send, Sparkles, Calendar, Users } from "lucide-react";
import { Proposal, WorkerCandidateInput } from "@/types";
import { Badge } from "@/components/ui/Badge";

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
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <div className="text-sm font-semibold text-slate-800">
          No hay convocatorias abiertas pendientes de postulación
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Todas las convocatorias actuales ya cuentan con cuadrilla postulada.
          Puedes lanzar una nueva desde el módulo Minera.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de convocatoria abierta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {openProposals.map((p) => {
          const isSelected = selectedProposal?.id === p.id;
          return (
            <div
              key={p.id}
              onClick={() => {
                setSelectedProposal(p);
                buildRowsForQuota(p.quota);
              }}
              className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                isSelected
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="blue">Convocatoria Abierta</Badge>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Cupo: {p.quota}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {p.start_date}
                  </span>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{p.description}</p>
            </div>
          );
        })}
      </div>

      {/* Formulario de postulación de cuadrilla */}
      {selectedProposal && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Nómina de {rows.length} Trabajadores para:{" "}
                <span className="text-blue-600">{selectedProposal.title}</span>
              </h4>
              <p className="text-xs text-slate-500">
                Completa los datos personales y el cargo de cada integrante de la
                cuadrilla.
              </p>
            </div>
            <button
              type="button"
              onClick={() => buildRowsForQuota(selectedProposal.quota)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Autocompletar Plantilla ({selectedProposal.quota})</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Nombres</th>
                  <th className="py-3 px-4">Apellidos</th>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Cargo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        value={r.first_name}
                        onChange={(e) =>
                          updateRow(idx, "first_name", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        value={r.last_name}
                        onChange={(e) =>
                          updateRow(idx, "last_name", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        value={r.dni}
                        onChange={(e) => updateRow(idx, "dni", e.target.value)}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="email"
                        required
                        value={r.email}
                        onChange={(e) =>
                          updateRow(idx, "email", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        value={r.position}
                        onChange={(e) =>
                          updateRow(idx, "position", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-slate-200 bg-slate-50/60 px-6 py-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>
                {submitting
                  ? "Enviando postulación..."
                  : `Postular Cuadrilla de ${rows.length} Trabajadores`}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
