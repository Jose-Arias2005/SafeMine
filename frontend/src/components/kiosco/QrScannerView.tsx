"use client";

import React, { useEffect, useRef, useState } from "react";
import { QrCode, Video, VideoOff, Search } from "lucide-react";

interface QrScannerViewProps {
  onScanQr: (qrOrDni: string) => Promise<void>;
  processing: boolean;
}

export default function QrScannerView({
  onScanQr,
  processing,
}: QrScannerViewProps) {
  const [scannerActive, setScannerActive] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const html5QrRef = useRef<unknown>(null);

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        const s = html5QrRef.current as {
          stop: () => Promise<void>;
          clear: () => void;
        };
        await s.stop();
        s.clear();
      } catch {
        // ignore
      }
      html5QrRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    await stopScanner();
    setScannerActive(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("kiosco-qr-reader");
      html5QrRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          onScanQr(decodedText);
        },
        () => {}
      );
    } catch {
      setScannerActive(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Fase 1 · Identificación de Operario
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            Escaneo de Fotocheck QR en Garita
          </h3>
        </div>

        {!scannerActive ? (
          <button
            type="button"
            onClick={startScanner}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Video className="h-4 w-4" />
            <span>Encender Lector QR</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            <VideoOff className="h-4 w-4" />
            <span>Detener Cámara</span>
          </button>
        )}
      </div>

      {/* Visor de cámara QR */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 min-h-[260px] flex items-center justify-center">
        <div
          id="kiosco-qr-reader"
          className={scannerActive ? "w-full p-2" : "hidden"}
        />
        {!scannerActive && (
          <div className="text-center p-8 space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-blue-400">
              <QrCode className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-white">
              Lector Óptico de Código QR
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Activa la cámara para escanear el Fotocheck QR del trabajador o
              ingresa su DNI abajo.
            </p>
          </div>
        )}
      </div>

      {/* Búsqueda directa por DNI */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualInput.trim()) onScanQr(manualInput);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Ingresar DNI del trabajador (ej. 45891021)..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={processing}
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Validar Acceso
        </button>
      </form>
    </div>
  );
}
