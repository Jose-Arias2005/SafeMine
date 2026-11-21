"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Plus,
  ClipboardCheck,
  FolderKanban,
  RefreshCw,
  AlertCircle,
  Thermometer,
  Droplets,
  Ruler,
  Radio,
  Info,
  X,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Toast";
import CreateProposalModal from "@/components/minera/CreateProposalModal";
import ProposalsList from "@/components/minera/ProposalsList";
import WorkerEvaluationTable from "@/components/minera/WorkerEvaluationTable";
import GateLogsTable from "@/components/minera/GateLogsTable";
import { mineraService } from "@/services/mineraService";
import { WS_URL } from "@/services/apiClient";
import {
  AccessLogEntry,
  GeneratedCredential,
  HardwareTelemetry,
  Proposal,
  WorkerEvaluationItem,
} from "@/types";
import { generatePerformanceReportPDF } from "@/utils/pdfGenerator";

function toggleTelemetryPopoverFallback(el: HTMLElement | null) {
  if (!el) return;
  const supportsPopover =
    typeof HTMLElement !== "undefined" &&
    Object.hasOwn(HTMLElement.prototype, "popover");
  if (supportsPopover) return;
  if (el.getAttribute("data-popover-open") === "true") {
    el.removeAttribute("data-popover-open");
  } else {
    el.setAttribute("data-popover-open", "true");
  }
}

export default function MineraHomePage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "convocatorias" | "evaluacion" | "bitacora"
  >("convocatorias");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [lastTelemetryAt, setLastTelemetryAt] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(
    null
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<
    GeneratedCredential[] | null
  >(null);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  const telemetryPopoverId = useId();
  const telemetryPopoverRef = useRef<HTMLDivElement | null>(null);

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

  const loadAccessLogs = useCallback(async () => {
    try {
      const data = await mineraService.getAccessLogs();
      setAccessLogs(data.logs || []);
    } catch {
      // ignore
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProposals(), loadAccessLogs()]);
  }, [loadProposals, loadAccessLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Sincronización en tiempo real con el Kiosco de Garita y Telemetría Arduino
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (
            payload.event === "HARDWARE_TELEMETRY" ||
            payload.type === "TELEMETRY"
          ) {
            setTelemetry({
              type: payload.type,
              event: payload.event,
              distancia_cm: Number(payload.distancia_cm ?? 0),
              presencia: Boolean(payload.presencia),
              temperatura_c: Number(payload.temperatura_c ?? 0),
              humedad_pct: Number(payload.humedad_pct ?? 0),
              simulated: Boolean(payload.simulated),
              timestamp: payload.timestamp,
            });
            setLastTelemetryAt(new Date().toLocaleTimeString("es-PE"));
            return;
          }

          if (
            (payload.type === "EPP_VERIFICATION" ||
              payload.phase === "FASE_2_EPP") &&
            payload.status === "ROJO" &&
            payload.worker_id
          ) {
            const dni = payload.worker_dni || payload.dni || "S/N";
            const missingDetail =
              Array.isArray(payload.missing_epps) &&
              payload.missing_epps.length > 0
                ? ` (${payload.missing_epps.join(", ")})`
                : "";
            setAlertBanner(
              `Alerta desde Garita: El operario ${payload.worker_name} (DNI ${dni}) incumplió con sus EPPs en cámara${missingDetail}. Se marcó automáticamente "No lleva sus EPPs".`
            );
            loadProposals();
            loadAccessLogs();
          } else if (
            payload.event === "GATE_UPDATE" ||
            payload.event === "QR_AUTHORIZED" ||
            payload.event === "OFFLINE_SYNC_COMPLETED" ||
            payload.type === "EPP_VERIFICATION" ||
            payload.type === "SYNC_BATCH" ||
            payload.phase
          ) {
            loadAccessLogs();
            if (payload.event === "OFFLINE_SYNC_COMPLETED") {
              loadProposals();
            }
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
  }, [loadProposals, loadAccessLogs]);

  const handleCreateProposal = async (payload: {
    title: string;
    description: string;
    quota: number;
    start_date: string;
    required_epps: string[];
  }) => {
    const res = await mineraService.createProposal(payload);
    showToast({
      variant: "success",
      message: `Convocatoria "${res.proposal.title}" publicada exitosamente.`,
    });
    await loadProposals();
  };

  const handleAcceptProposal = async (proposalId: number) => {
    try {
      const res = await mineraService.acceptProposal(proposalId);
      setGeneratedCreds(res.generated_credentials);
      setSelectedProposalId(proposalId);
      showToast({ variant: "success", message: res.message });
      await loadProposals();
    } catch (err: unknown) {
      setAlertBanner(
        err instanceof Error ? err.message : "Error al aceptar propuesta"
      );
    }
  };

  const handleSaveEvaluations = async (
    proposal: Proposal,
    items: WorkerEvaluationItem[]
  ): Promise<Proposal | null> => {
    try {
      const res = await mineraService.saveEvaluations(proposal.id, items);
      showToast({ variant: "success", message: res.message });
      await loadProposals();
      return res.proposal;
    } catch (err: unknown) {
      setAlertBanner(
        err instanceof Error ? err.message : "Error al guardar calificaciones"
      );
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
    showToast({
      variant: "success",
      message: `${res.message} El archivo PDF ha sido descargado.`,
    });
    await loadProposals();
  };

  const acceptedCount = proposals.filter((p) => p.status === "ACEPTADA").length;

  return (
    <PageContainer
      title="Administración Minera"
      subtitle="Convocatorias de cuadrillas, evaluación SSO y monitoreo de garita en tiempo real."
      actions={
        <>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nueva convocatoria</span>
          </button>
        </>
      }
    >
      {/* Alerta crítica inline (incumplimiento EPP en garita o error operativo) */}
      {alertBanner && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <span className="leading-relaxed font-medium">{alertBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertBanner(null)}
            aria-label="Cerrar alerta"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Franja compacta de telemetría IoT de garita (~48px) */}
      <section
        aria-label="Telemetría en vivo de garita"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              !telemetry
                ? "bg-slate-300"
                : telemetry.simulated
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
          />
          <span className="font-semibold text-slate-900">Garita IoT</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">
            {telemetry
              ? telemetry.simulated
                ? "Simulado"
                : "Arduino UNO"
              : "Esperando señal"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 tabular-nums text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">Temp:</span>
            <strong className="font-mono font-semibold text-slate-900">
              {telemetry ? `${telemetry.temperatura_c.toFixed(1)} °C` : "-- °C"}
            </strong>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">Hum:</span>
            <strong className="font-mono font-semibold text-slate-900">
              {telemetry ? `${telemetry.humedad_pct.toFixed(1)} %` : "-- %"}
            </strong>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">Dist:</span>
            <strong className="font-mono font-semibold text-slate-900">
              {telemetry ? `${telemetry.distancia_cm.toFixed(1)} cm` : "-- cm"}
            </strong>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="text-slate-500">Cabina:</span>
            {telemetry ? (
              telemetry.presencia ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  Operario presente
                </span>
              ) : (
                <span className="font-medium text-slate-600">Libre</span>
              )
            ) : (
              <span className="text-slate-400">--</span>
            )}
          </span>

          {lastTelemetryAt && (
            <span className="font-mono text-[11px] text-slate-400">
              {lastTelemetryAt}
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              toggleTelemetryPopoverFallback(telemetryPopoverRef.current)
            }
            aria-label="Detalle técnico de sensores IoT"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            {...({
              popoverTarget: telemetryPopoverId,
            } as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <Info className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="hidden sm:inline">Sensores</span>
          </button>

          <div
            ref={telemetryPopoverRef}
            id={telemetryPopoverId}
            className="sm-popover w-72"
            {...({ popover: "auto" } as React.HTMLAttributes<HTMLDivElement>)}
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-xs font-semibold text-slate-900">
                Hardware de Garita (Arduino IoT)
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Lectura en tiempo real vía WebSocket
              </p>
            </div>
            <dl className="divide-y divide-slate-100 px-4 py-1 text-xs">
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">Temperatura / Humedad</dt>
                <dd className="font-mono text-[11px] text-slate-800">
                  DHT11 (Pin 12)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">Ultrasonido presencia</dt>
                <dd className="font-mono text-[11px] text-slate-800">
                  HC-SR04 (Pines 10/11)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">Origen de señal</dt>
                <dd className="font-medium text-slate-800">
                  {telemetry
                    ? telemetry.simulated
                      ? "Modo simulado"
                      : "Arduino UNO físico"
                    : "Pendiente"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <Tabs
        idPrefix="minera"
        ariaLabel="Secciones de administración minera"
        activeTab={activeTab}
        onChange={(id) =>
          setActiveTab(id as "convocatorias" | "evaluacion" | "bitacora")
        }
        tabs={[
          {
            id: "convocatorias",
            label: "Convocatorias y postulaciones",
            count: proposals.length,
            icon: <FolderKanban className="h-4 w-4" />,
          },
          {
            id: "evaluacion",
            label: "Evaluación SSO y reportes",
            count: acceptedCount,
            icon: <ClipboardCheck className="h-4 w-4" />,
          },
          {
            id: "bitacora",
            label: "Bitácora de garita (IoT)",
            count: accessLogs.length,
            icon: <Radio className="h-4 w-4" />,
          },
        ]}
      />

      <div
        role="tabpanel"
        aria-labelledby={`minera-tab-${activeTab}`}
        className="sm-contain-section"
      >
        {activeTab === "convocatorias" ? (
          <ProposalsList
            proposals={proposals}
            onAcceptProposal={handleAcceptProposal}
            onGoToEvaluation={(proposalId) => {
              setSelectedProposalId(proposalId);
              setActiveTab("evaluacion");
            }}
          />
        ) : activeTab === "evaluacion" ? (
          <WorkerEvaluationTable
            proposals={proposals}
            selectedProposalId={selectedProposalId}
            onSelectProposal={setSelectedProposalId}
            onSaveEvaluations={handleSaveEvaluations}
            onDownloadAndSendReport={handleDownloadAndSendReport}
          />
        ) : (
          <GateLogsTable logs={accessLogs} onRefresh={loadAccessLogs} />
        )}
      </div>

      <CreateProposalModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProposal}
      />

      {/* Modal nativo de credenciales generadas al aceptar propuesta */}
      <Modal
        isOpen={Boolean(generatedCreds)}
        onClose={() => setGeneratedCreds(null)}
        title="Credenciales generadas"
        subtitle="Se crearon las cuentas temporales para esta cuadrilla. Los operarios ingresan desde SafeMine Mobile."
        maxWidthClass="max-w-2xl"
      >
        {generatedCreds && (
          <div className="space-y-4">
            <div
              tabIndex={0}
              role="region"
              aria-label="Credenciales generadas"
              className="sm-table-wrap sm-scroll rounded-lg border border-slate-200"
            >
              <table className="sm-table-responsive text-left text-xs">
                <caption className="visually-hidden">
                  Listado de credenciales temporales de operarios
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
                      Usuario
                    </th>
                    <th scope="col" className="border-b border-slate-200 px-3 py-2.5">
                      Clave temporal
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 px-3 py-2.5 text-right"
                    >
                      Copiar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generatedCreds.map((c, idx) => (
                    <tr key={c.worker_id} className="bg-white hover:bg-slate-50/70">
                      <th
                        scope="row"
                        className="bg-white px-3 py-2 font-medium text-slate-900"
                      >
                        <span className="mr-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
                          {idx + 1}.
                        </span>
                        {c.full_name}
                      </th>
                      <td
                        data-label="DNI"
                        className="px-3 py-2 font-mono text-slate-600 tabular-nums"
                      >
                        {c.dni}
                      </td>
                      <td
                        data-label="Usuario"
                        className="px-3 py-2 font-mono font-medium text-slate-900"
                      >
                        {c.username}
                      </td>
                      <td
                        data-label="Clave temporal"
                        className="px-3 py-2 font-mono font-medium text-slate-900"
                      >
                        {c.password}
                      </td>
                      <td data-label="Copiar" className="px-3 py-2 text-right">
                        <CopyButton
                          value={`${c.username} / ${c.password}`}
                          label={`Copiar usuario y clave de ${c.full_name}`}
                        />
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
