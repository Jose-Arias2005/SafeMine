"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Radio,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  QrCode,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import QrScannerView from "@/components/kiosco/QrScannerView";
import EppCameraStream from "@/components/kiosco/EppCameraStream";
import TrafficLightStatus from "@/components/kiosco/TrafficLightStatus";
import { kioscoService } from "@/services/kioscoService";
import { trabajadorService } from "@/services/trabajadorService";
import { WS_URL } from "@/services/apiClient";
import { GateLog, Worker } from "@/types";

export default function KioscoPage() {
  const [phase, setPhase] = useState<"FASE_1_QR" | "FASE_2_EPP">("FASE_1_QR");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [scannedWorker, setScannedWorker] = useState<Worker | null>(null);
  const [arduinoState, setArduinoState] = useState<"IDLE" | "VERDE" | "ROJO">(
    "IDLE"
  );
  const [banner, setBanner] = useState<{
    status: "VERDE" | "ROJO" | "QR_OK";
    title: string;
    message: string;
    detected: string[];
    missing: string[];
  } | null>(null);
  const [logs, setLogs] = useState<GateLog[]>([]);
  const [processing, setProcessing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const loadLogsAndWorkers = useCallback(async () => {
    try {
      const [wRes, lRes] = await Promise.all([
        trabajadorService.listWorkers(),
        kioscoService.getLogs(),
      ]);
      setWorkers(wRes.workers);
      setLogs(lRes.logs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadLogsAndWorkers();
  }, [loadLogsAndWorkers]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.status === "VERDE") setArduinoState("VERDE");
          else if (data.status === "ROJO") setArduinoState("ROJO");
          loadLogsAndWorkers();
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
  }, [loadLogsAndWorkers]);

  const handleScanQr = useCallback(
    async (qrOrDni: string) => {
      setProcessing(true);
      try {
        const res = await kioscoService.verifyQr(qrOrDni);
        setScannedWorker(res.worker);

        if (!res.authorized) {
          setArduinoState("ROJO");
          setPhase("FASE_1_QR");
          setBanner({
            status: "ROJO",
            title: "Acceso Denegado en Fase 1 — Trabajador No Autorizado",
            message: res.message,
            detected: [],
            missing: res.reasons || ["Requisitos pendientes"],
          });
        } else {
          setArduinoState("IDLE");
          setPhase("FASE_2_EPP");
          setBanner({
            status: "QR_OK",
            title: `QR Verificado: ${res.worker.full_name} Autorizado`,
            message:
              "Trabajador vinculado. Proceda a la Fase 2 para detectar sus EPPs en cámara.",
            detected: ["Examen >= 80%", "Constancia Médica IA Apta"],
            missing: [],
          });
        }
        loadLogsAndWorkers();
      } catch (err: unknown) {
        setArduinoState("ROJO");
        setBanner({
          status: "ROJO",
          title: "QR Inválido",
          message:
            err instanceof Error ? err.message : "No se encontró el trabajador",
          detected: [],
          missing: ["Código QR no registrado"],
        });
      } finally {
        setProcessing(false);
      }
    },
    [loadLogsAndWorkers]
  );

  // Auto-escanear si viene ?workerId= desde el Fotocheck
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wId = params.get("workerId");
      if (wId) {
        handleScanQr(wId);
      }
    }
  }, [handleScanQr]);

  const handleVerifyEpp = async (
    simulateMode?: "CON_EPP" | "SIN_EPP",
    frameBlob?: Blob | null
  ) => {
    if (!scannedWorker) return;
    setProcessing(true);
    try {
      const res = await kioscoService.verifyEpp({
        workerId: scannedWorker.id,
        simulateMode,
        frameBlob,
      });
      setScannedWorker(res.worker);
      setArduinoState(res.status);
      setBanner({
        status: res.status,
        title:
          res.status === "VERDE"
            ? "Acceso Concedido — Todos los EPPs Verificados"
            : "Acceso Denegado — Falta EPP Obligatorio",
        message: res.message,
        detected: res.detected_epps,
        missing: res.missing_epps,
      });
      loadLogsAndWorkers();
    } finally {
      setProcessing(false);
    }
  };

  const authorizedWorkers = workers.filter((w) => w.is_authorized);
  const unauthorizedWorkers = workers.filter((w) => !w.is_authorized);

  return (
    <PageContainer
      title="Kiosco de Control en Garita"
      subtitle="Validación en 2 fases: Lectura de Fotocheck QR + Detección de EPPs con AWS Rekognition y Semáforo Arduino."
      actions={
        <Badge variant={wsConnected ? "emerald" : "amber"}>
          <Radio className="h-3.5 w-3.5" />
          <span>
            {wsConnected ? "WebSocket Conectado (/ws/kiosco)" : "Reconectando"}
          </span>
        </Badge>
      }
    >
      {/* Interfaz dividida en 2 columnas limpias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Visor de Cámara en Vivo (Fase 1 QR -> Fase 2 EPP) (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {phase === "FASE_1_QR" || !scannedWorker ? (
            <QrScannerView onScanQr={handleScanQr} processing={processing} />
          ) : (
            <EppCameraStream
              worker={scannedWorker}
              processing={processing}
              onCaptureFrame={(blob) => handleVerifyEpp(undefined, blob)}
              onResetToQr={() => {
                setPhase("FASE_1_QR");
                setBanner(null);
                setArduinoState("IDLE");
              }}
            />
          )}

          {/* Panel Plegable Discreto: Herramientas de Prueba Local */}
          <details className="group rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 select-none">
              <span className="inline-flex items-center gap-2">
                <Wrench className="h-4 w-4 text-slate-400" />
                <span>
                  Herramientas de Prueba Local (Simulación sin cámara / sin
                  gastar créditos AWS)
                </span>
              </span>
              <span className="text-[11px] text-blue-600">
                Mostrar / Ocultar
              </span>
            </summary>

            <div className="border-t border-slate-100 bg-slate-50/60 p-5 space-y-4 text-xs">
              {/* Simulación de Fase 1 (QR) */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-700">
                  1. Simular lectura de QR en Fase 1:
                </div>
                <div className="flex flex-wrap gap-2">
                  {authorizedWorkers.slice(0, 4).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      disabled={processing}
                      onClick={() => handleScanQr(w.qr_payload)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>{w.full_name} (Autorizado)</span>
                    </button>
                  ))}
                  {unauthorizedWorkers.slice(0, 2).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      disabled={processing}
                      onClick={() => handleScanQr(w.qr_payload)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>{w.full_name} (No Autorizado)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulación de Fase 2 (EPPs) */}
              <div className="space-y-2 border-t border-slate-200/80 pt-3">
                <div className="font-semibold text-slate-700">
                  2. Simular detección de EPPs en Fase 2{" "}
                  {scannedWorker
                    ? `(Trabajador activo: ${scannedWorker.full_name})`
                    : "(Escanee primero un QR autorizado arriba)"}
                  :
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={!scannedWorker || processing}
                    onClick={() => handleVerifyEpp("CON_EPP", null)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Simular Con EPP (Verde · Pin 8)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!scannedWorker || processing}
                    onClick={() => handleVerifyEpp("SIN_EPP", null)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>
                      Simular Sin EPP (Rojo · Pin 9 + Marca Checkbox en Minera)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Columna Derecha: Semáforo Físico/Digital y Datos del Último Trabajador Escaneado (5 cols) */}
        <div className="lg:col-span-5">
          <TrafficLightStatus
            arduinoState={arduinoState}
            scannedWorker={scannedWorker}
            banner={banner}
            logs={logs}
          />
        </div>
      </div>
    </PageContainer>
  );
}
