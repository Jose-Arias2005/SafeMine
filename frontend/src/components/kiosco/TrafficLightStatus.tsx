"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Cpu,
  Volume2,
  UserCheck,
  ArrowUpRight,
} from "lucide-react";
import { GateLog, Worker } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface TrafficLightStatusProps {
  arduinoState: "IDLE" | "VERDE" | "ROJO";
  scannedWorker: Worker | null;
  banner: {
    status: "VERDE" | "ROJO" | "QR_OK";
    title: string;
    message: string;
    detected: string[];
    missing: string[];
  } | null;
  logs: GateLog[];
}

export default function TrafficLightStatus({
  arduinoState,
  scannedWorker,
  banner,
  logs,
}: TrafficLightStatusProps) {
  return (
    <div className="space-y-5">
      {/* Tarjeta del Semáforo Físico/Digital Arduino */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-blue-600" />
              <span>Estado de Hardware · Arduino UNO / ESP32</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {arduinoState === "VERDE"
                ? "Acceso Concedido — Foco Verde Activo (Pin 8)"
                : arduinoState === "ROJO"
                ? "Acceso Denegado — Foco Rojo + Buzzer (Pin 9)"
                : "Garita en Espera de Validación"}
            </h3>
          </div>

          {/* Luces del Semáforo */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  arduinoState === "VERDE"
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                    : "border-slate-200 bg-slate-100 text-slate-300"
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                Pin 8 (Verde)
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  arduinoState === "ROJO"
                    ? "border-red-500 bg-red-600 text-white shadow-lg shadow-red-500/30 scale-105"
                    : "border-slate-200 bg-slate-100 text-slate-300"
                }`}
              >
                <Volume2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                Pin 9 (Rojo)
              </span>
            </div>
          </div>
        </div>

        {/* Resultado de Validación */}
        {banner && (
          <div
            className={`rounded-xl border p-4 text-xs space-y-2 ${
              banner.status === "VERDE"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : banner.status === "ROJO"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            <div className="font-bold text-sm">{banner.title}</div>
            <p className="leading-relaxed">{banner.message}</p>

            {(banner.detected.length > 0 || banner.missing.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {banner.detected.map((d, i) => (
                  <Badge key={i} variant="emerald">
                    <CheckCircle2 className="h-3 w-3" /> {d}
                  </Badge>
                ))}
                {banner.missing.map((m, i) => (
                  <Badge key={i} variant="red">
                    <XCircle className="h-3 w-3" /> Falta: {m}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ficha del Último Trabajador Escaneado con QR */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>Último Trabajador Escaneado (QR)</span>
            </span>
            {scannedWorker && (
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                <span>Ver en Minera</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {!scannedWorker ? (
            <p className="text-xs text-slate-500">
              Ningún código QR escaneado en la sesión actual.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Nombre:</span>{" "}
                <strong className="text-slate-900">
                  {scannedWorker.full_name}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">DNI:</span>{" "}
                <strong className="font-mono text-slate-900">
                  {scannedWorker.dni}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Cargo:</span>{" "}
                <span className="text-slate-700">{scannedWorker.position}</span>
              </div>
              <div>
                <span className="text-slate-400">Faltas EPP Cámara:</span>{" "}
                <strong
                  className={
                    scannedWorker.faltas_epp_count > 0
                      ? "text-red-600"
                      : "text-emerald-600"
                  }
                >
                  {scannedWorker.faltas_epp_count}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bitácora Reciente */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Eventos Recientes en Garita
          </h4>
          <span className="text-xs text-slate-400">{logs.length} registros</span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {logs.slice(0, 8).map((l) => (
            <div
              key={l.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
            >
              <div>
                <div className="font-semibold text-slate-900">
                  {l.worker_name}{" "}
                  <span className="font-mono text-slate-500">
                    (DNI {l.worker_dni})
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{l.message}</p>
              </div>
              <Badge variant={l.status === "VERDE" ? "emerald" : "red"}>
                {l.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
