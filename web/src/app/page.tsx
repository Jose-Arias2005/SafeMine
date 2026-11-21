"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  ClipboardCheck,
  FolderKanban,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Droplets,
  Ruler,
  UserCheck,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import CreateProposalModal from "@/components/minera/CreateProposalModal";
import ProposalsList from "@/components/minera/ProposalsList";
import WorkerEvaluationTable from "@/components/minera/WorkerEvaluationTable";
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

export default function MineraHomePage() {
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
            setBanner({
              type: "err",
              text: `Alerta desde Garita: El operario ${payload.worker_name} (DNI ${dni}) incumplió con sus EPPs en cámara${missingDetail}. Se marcó automáticamente 'No lleva sus EPPs'.`,
            });
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
            onClick={refreshAll}
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

      {/* Tarjeta superior de Telemetría en Vivo de Garita (Arduino IoT) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Telemetría en Vivo de Garita (Arduino IoT)
              </h3>
              <p className="text-xs text-slate-500">
                Sensores DHT11 (Pin 12) y ultrasónico HC-SR04 (Pines 10/11) vía WebSocket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {telemetry ? (
              <Badge variant={telemetry.simulated ? "amber" : "emerald"}>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    telemetry.simulated
                      ? "bg-amber-500 animate-pulse"
                      : "bg-emerald-500 animate-pulse"
                  }`}
                />
                {telemetry.simulated
                  ? "Arduino Simulado en Vivo"
                  : "Arduino UNO Conectado"}
              </Badge>
            ) : (
              <Badge variant="slate">Esperando telemetría...</Badge>
            )}
            {lastTelemetryAt && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <Clock className="h-3 w-3" />
                {lastTelemetryAt}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 shrink-0">
              <Thermometer className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Temperatura
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {telemetry ? `${telemetry.temperatura_c.toFixed(1)} °C` : "-- °C"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/80 text-blue-700 shrink-0">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Humedad
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {telemetry ? `${telemetry.humedad_pct.toFixed(1)} %` : "-- %"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-700 shrink-0">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Distancia (HC-SR04)
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {telemetry ? `${telemetry.distancia_cm.toFixed(1)} cm` : "-- cm"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                telemetry?.presencia
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Presencia en Cabina
              </div>
              <div className="mt-0.5">
                {telemetry ? (
                  telemetry.presencia ? (
                    <Badge variant="emerald">Operario en Cabina</Badge>
                  ) : (
                    <Badge variant="slate">Cabina Libre</Badge>
                  )
                ) : (
                  <span className="text-sm font-semibold text-slate-400">
                    Sin señal
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) =>
          setActiveTab(id as "convocatorias" | "evaluacion" | "bitacora")
        }
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
          {
            id: "bitacora",
            label: "Tab 3: Bitácora de Garita (IoT)",
            count: accessLogs.length,
            icon: <Radio className="h-4 w-4" />,
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
      ) : activeTab === "evaluacion" ? (
        <WorkerEvaluationTable
          proposals={proposals}
          selectedProposalId={selectedProposalId}
          onSelectProposal={setSelectedProposalId}
          onSaveEvaluations={handleSaveEvaluations}
          onDownloadAndSendReport={handleDownloadAndSendReport}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historial de Inspecciones y Control de Acceso en Garita
              </h3>
              <p className="text-xs text-slate-500">
                Sincronizado en tiempo real con el escáner móvil, visión artificial y módulo Arduino IoT.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAccessLogs}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Refrescar Bitácora</span>
            </button>
          </div>

          {accessLogs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Aún no hay eventos registrados en la bitácora de garita.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-3.5 px-4">Fecha / Hora</th>
                    <th className="py-3.5 px-4">Trabajador / DNI</th>
                    <th className="py-3.5 px-4">Fase</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">EPPs Detectados</th>
                    <th className="py-3.5 px-4">EPPs Faltantes / Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accessLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={
                        log.status === "ROJO"
                          ? "bg-red-50/30 hover:bg-red-50/50"
                          : "hover:bg-slate-50/70"
                      }
                    >
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {log.timestamp || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {log.worker_name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          DNI {log.worker_dni}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="slate">{log.phase}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {log.status === "VERDE" ? (
                          <Badge variant="emerald">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            VERDE
                          </Badge>
                        ) : log.status === "ROJO" ? (
                          <Badge variant="red">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            ROJO
                          </Badge>
                        ) : (
                          <Badge variant="blue">{log.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.detected_epps && log.detected_epps.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.detected_epps.map((epp, idx) => (
                              <Badge key={idx} variant="emerald">
                                {epp}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Ninguno</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {log.missing_epps && log.missing_epps.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {log.missing_epps.map((epp, idx) => (
                              <Badge key={idx} variant="red">
                                {epp}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600">
                          {log.message}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
