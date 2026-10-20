"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, HardHat, RotateCcw, VideoOff } from "lucide-react";
import { Worker } from "@/types";

interface EppCameraStreamProps {
  worker: Worker;
  processing: boolean;
  onCaptureFrame: (blob: Blob | null) => Promise<void>;
  onResetToQr: () => void;
}

export default function EppCameraStream({
  worker,
  processing,
  onCaptureFrame,
  onResetToQr,
}: EppCameraStreamProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraActive(false);
    }
  };

  const handleAnalyzeFrame = async () => {
    if (cameraActive && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
        );
        await onCaptureFrame(blob);
        return;
      }
    }
    await onCaptureFrame(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Fase 2 · Detección de EPPs con AWS Rekognition
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            Operario Identificado: {worker.full_name} (DNI {worker.dni})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Camera className="h-4 w-4" />
              <span>Activar Cámara</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700"
            >
              <VideoOff className="h-4 w-4" />
              <span>Apagar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetToQr}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Cambiar QR</span>
          </button>
        </div>
      </div>

      {/* Visor de cámara */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${
            cameraActive ? "block" : "hidden"
          }`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!cameraActive && (
          <div className="text-center p-8 space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-emerald-400">
              <HardHat className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-white">
              Cámara de Inspección de EPPs (Casco, Guantes, Lentes)
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Enciende la cámara para analizar el frame en tiempo real con AWS
              Rekognition.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={processing}
        onClick={handleAnalyzeFrame}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
      >
        <Camera className="h-4 w-4" />
        <span>
          {processing
            ? "Analizando EPPs en AWS Rekognition..."
            : "Capturar y Verificar EPPs del Trabajador"}
        </span>
      </button>
    </div>
  );
}
