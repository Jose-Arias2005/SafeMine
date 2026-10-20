"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  ClipboardCheck,
  FolderKanban,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import CreateProposalModal from "@/components/minera/CreateProposalModal";
import ProposalsList from "@/components/minera/ProposalsList";
import WorkerEvaluationTable from "@/components/minera/WorkerEvaluationTable";
import { mineraService } from "@/services/mineraService";
import { WS_URL } from "@/services/apiClient";
import {
  GeneratedCredential,
  Proposal,
  WorkerEvaluationItem,
} from "@/types";
import { generatePerformanceReportPDF } from "@/utils/pdfGenerator";

export default function MineraHomePage() {
  const [activeTab, setActiveTab] = useState<"convocatorias" | "evaluacion">(
    "convocatorias"
  );
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(
    null
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<
    GeneratedCredential[] | null
  >(null);
  const [banner, setBanner] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const loadProposals = useCallback(async () => {
    try {
      const data = await mineraService.listProposals();
      setProposals(data.proposals);
      setSelectedProposalId((prev) => {
        if (prev && data.proposals.some((p) => p.id === prev)) return prev;
        const accepted = data.proposals.find((p) => p.status === "ACEPTADA");
        return accepted ? accepted.id : data.proposals[0]?.id ?? null;
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Sincronización en tiempo real con el Kiosco de Garita
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload.phase === "FASE_2_EPP" &&
            payload.status === "ROJO" &&
            payload.worker_id
          ) {
            setBanner({
              type: "err",
              text: `Alerta desde Garita: El operario ${payload.worker_name} (DNI ${payload.dni}) incumplió con sus EPPs en cámara. Se marcó automáticamente 'No lleva sus EPPs'.`,
            });
            loadProposals();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
    return () => {
      if (ws) ws.close();
    };
  }, [loadProposals]);

  const handleCreateProposal = async (payload: {
    title: string;
    description: string;
    quota: number;
    start_date: string;
    required_epps: string[];
  }) => {
    const res = await mineraService.createProposal(payload);
    setBanner({
      type: "ok",
      text: `Convocatoria "${res.proposal.title}" publicada exitosamente.`,
    });
    await loadProposals();
  };

  const handleAcceptProposal = async (proposalId: number) => {
    try {
      const res = await mineraService.acceptProposal(proposalId);
      setGeneratedCreds(res.generated_credentials);
      setSelectedProposalId(proposalId);
      setBanner({ type: "ok", text: res.message });
      await loadProposals();
    } catch (err: unknown) {
      setBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Error al aceptar propuesta",
      });
    }
  };

  const handleSaveEvaluations = async (
    proposal: Proposal,
    items: WorkerEvaluationItem[]
  ): Promise<Proposal | null> => {
    try {
      const res = await mineraService.saveEvaluations(proposal.id, items);
      setBanner({ type: "ok", text: res.message });
      await loadProposals();
      return res.proposal;
    } catch (err: unknown) {
      setBanner({
        type: "err",
        text:
          err instanceof Error ? err.message : "Error al guardar calificaciones",
      });
      return null;
    }
  };

  const handleDownloadAndSendReport = async (
    proposal: Proposal,
    items: WorkerEvaluationItem[]
  ) => {
    const updated = (await handleSaveEvaluations(proposal, items)) || proposal;
    generatePerformanceReportPDF(updated);
    const res = await mineraService.sendReportToProvider(proposal.id);
    setBanner({
      type: "ok",
      text: `${res.message} El archivo PDF ha sido descargado.`,
    });
    await loadProposals();
  };

  const acceptedCount = proposals.filter((p) => p.status === "ACEPTADA").length;

  return (
    <PageContainer
      title="Administración Minera"
      subtitle="Gestiona requerimientos de cuadrillas, aprueba postulaciones de proveedores y califica el desempeño del personal."
      actions={
        <>
          <button
            type="button"
            onClick={loadProposals}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Convocatoria de 10 personas</span>
          </button>
        </>
      }
    >
      {banner && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline ml-4"
          >
            Cerrar
          </button>
        </div>
      )}

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as "convocatorias" | "evaluacion")}
        tabs={[
          {
            id: "convocatorias",
            label: "Tab 1: Convocatorias y Postulaciones",
            count: proposals.length,
            icon: <FolderKanban className="h-4 w-4" />,
          },
          {
            id: "evaluacion",
            label: "Tab 2: Evaluación de Personal y Reportes",
            count: acceptedCount,
            icon: <ClipboardCheck className="h-4 w-4" />,
          },
        ]}
      />

      {activeTab === "convocatorias" ? (
        <ProposalsList
          proposals={proposals}
          onAcceptProposal={handleAcceptProposal}
          onGoToEvaluation={(proposalId) => {
            setSelectedProposalId(proposalId);
            setActiveTab("evaluacion");
          }}
        />
      ) : (
        <WorkerEvaluationTable
          proposals={proposals}
          selectedProposalId={selectedProposalId}
          onSelectProposal={setSelectedProposalId}
          onSaveEvaluations={handleSaveEvaluations}
          onDownloadAndSendReport={handleDownloadAndSendReport}
        />
      )}

      <CreateProposalModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProposal}
      />

      {/* Modal limpio de credenciales generadas al aceptar propuesta */}
      <Modal
        isOpen={Boolean(generatedCreds)}
        onClose={() => setGeneratedCreds(null)}
        title="Credenciales de Acceso Generadas Automáticamente"
        subtitle="Se crearon y activaron estas 10 cuentas en la base de datos. Puedes copiar cualquier usuario/contraseña para probar el login real del trabajador."
        maxWidthClass="max-w-2xl"
      >
        {generatedCreds && (
          <div className="space-y-4">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 leading-relaxed">
              💡 <strong>Instrucciones de prueba:</strong> Puedes cerrar sesión desde el Header (esquina superior derecha), ingresar a <strong>/login</strong> y escribir el usuario y contraseña de cualquiera de estos 10 operarios para verificar su portal exclusivo con el Stepper de 3 pasos.
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Trabajador</th>
                    <th className="py-2.5 px-3">DNI</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Contraseña Temporal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generatedCreds.map((c, idx) => (
                    <tr key={c.worker_id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {c.full_name}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {c.dni}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700 bg-blue-50/40">
                        {c.username}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/40">
                        {c.password}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setGeneratedCreds(null)}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
