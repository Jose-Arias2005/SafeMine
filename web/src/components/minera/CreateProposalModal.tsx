"use client";

import React, { useState } from "react";
import { HardHat } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const AVAILABLE_EPPS = [
  { code: "HEAD_COVER", label: "Casco de Seguridad (HEAD_COVER)" },
  { code: "HAND_COVER", label: "Guantes de Seguridad (HAND_COVER)" },
  { code: "FACE_COVER", label: "Protección Facial / Chaleco (FACE_COVER)" },
];

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    quota: number;
    start_date: string;
    required_epps: string[];
  }) => Promise<void>;
}

export default function CreateProposalModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateProposalModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quota, setQuota] = useState(10);
  const [startDate, setStartDate] = useState("2026-11-15");
  const [requiredEpps, setRequiredEpps] = useState<string[]>([
    "HEAD_COVER",
    "HAND_COVER",
    "FACE_COVER",
  ]);
  const [submitting, setSubmitting] = useState(false);

  const toggleEpp = (code: string) => {
    setRequiredEpps((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        quota: Number(quota),
        start_date: startDate,
        required_epps: requiredEpps,
      });
      setTitle("");
      setDescription("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Convocatoria de Personal"
      subtitle="Publica un requerimiento para que los Proveedores postulen su cuadrilla."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Título del Requerimiento
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Mantenimiento de Planta - Cupo: 10 trabajadores"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Descripción Operativa
          </label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalle las labores a realizar, zona operativa y requisitos..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cupo de Trabajadores
            </label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de Inicio
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            EPPs Obligatorios (Validados con AWS Rekognition)
          </label>
          <div className="space-y-2">
            {AVAILABLE_EPPS.map((epp) => (
              <label
                key={epp.code}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700 cursor-pointer hover:border-blue-300"
              >
                <input
                  type="checkbox"
                  checked={requiredEpps.includes(epp.code)}
                  onChange={() => toggleEpp(epp.code)}
                  className="h-4 w-4 rounded accent-blue-600"
                />
                <HardHat className="h-4 w-4 text-blue-600" />
                <span>{epp.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Publicando..." : "Publicar Convocatoria"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
