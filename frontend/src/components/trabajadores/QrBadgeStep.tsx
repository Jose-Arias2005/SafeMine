"use client";

import React from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  CheckCircle2,
  Camera,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { Worker } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface QrBadgeStepProps {
  worker: Worker;
  onPrevStep: () => void;
}

export default function QrBadgeStep({ worker, onPrevStep }: QrBadgeStepProps) {
  if (!worker.is_authorized) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-xs">
        <Lock className="h-8 w-8 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">
          Fotocheck Digital Bloqueado
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Debes aprobar el Examen de Seguridad (&gt;= 80%) y contar con tu
          Constancia Médica validada por IA para generar tu Código QR.
        </p>
        <button
          type="button"
          onClick={onPrevStep}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a completar requisitos</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Paso 3: Pase de Autorización y Fotocheck QR
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Presenta este Código QR en el Kiosco de Garita para iniciar la
            detección de EPPs en tiempo real.
          </p>
        </div>
        <Badge variant="emerald">AUTORIZADO PARA IR A MINA</Badge>
      </div>

      {/* Tarjeta Corporativa de Fotocheck */}
      <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-left">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              SAFEMINE AI · CREDENCIAL DE ACCESO
            </div>
            <div className="text-base font-bold text-slate-900">
              {worker.full_name}
            </div>
            <div className="text-xs text-slate-500">{worker.position}</div>
          </div>
          <ShieldCheck className="h-7 w-7 text-emerald-600 shrink-0" />
        </div>

        <div className="inline-block rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <QRCodeSVG value={worker.qr_payload} size={180} level="M" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>AUTORIZADO PARA IR A MINA</span>
          </div>
          <div className="text-xs font-mono text-slate-500">
            ID #{worker.id} · DNI {worker.dni}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onPrevStep}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Paso 2</span>
        </button>

        <Link
          href={`/kiosco?workerId=${worker.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
        >
          <Camera className="h-4 w-4" />
          <span>Escanear este QR en el Kiosco de Garita</span>
        </Link>
      </div>
    </div>
  );
}
