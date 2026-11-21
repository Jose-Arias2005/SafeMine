"use client";

import React, { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";

const AVAILABLE_EPPS = [
  { code: "HEAD_COVER", label: "Casco de seguridad", technical: "HEAD_COVER" },
  { code: "HAND_COVER", label: "Guantes de seguridad", technical: "HAND_COVER" },
  {
    code: "FACE_COVER",
    label: "Protección facial / chaleco",
    technical: "FACE_COVER",
  },
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

function getDefaultStartDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateProposalModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateProposalModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quota, setQuota] = useState(10);
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [requiredEpps, setRequiredEpps] = useState<string[]>([
    "HEAD_COVER",
    "HAND_COVER",
    "FACE_COVER",
  ]);
  const [submitting, setSubmitting] = useState(false);

  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-description`;
  const quotaId = `${idPrefix}-quota`;
  const dateId = `${idPrefix}-start-date`;

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
        title: title.trim(),
        description: description.trim(),
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
      closedBy="closerequest"
      title="Nueva convocatoria de personal"
      subtitle="Publica un requerimiento para que los proveedores postulen su cuadrilla."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor={titleId}
            className="block text-xs font-medium text-slate-700"
          >
            Título del requerimiento <span aria-hidden="true" className="text-red-600">*</span>
          </label>
          <input
            id={titleId}
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Mantenimiento de planta — Guardia A"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={descId}
            className="block text-xs font-medium text-slate-700"
          >
            Descripción operativa <span aria-hidden="true" className="text-red-600">*</span>
          </label>
          <textarea
            id={descId}
            name="description"
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalla las labores a realizar, zona operativa y requisitos..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor={quotaId}
              className="block text-xs font-medium text-slate-700"
            >
              Cupo de trabajadores <span aria-hidden="true" className="text-red-600">*</span>
            </label>
            <input
              id={quotaId}
              name="quota"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              required
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={dateId}
              className="block text-xs font-medium text-slate-700"
            >
              Fecha de inicio <span aria-hidden="true" className="text-red-600">*</span>
            </label>
            <input
              id={dateId}
              name="start_date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-slate-700">
            EPPs obligatorios (validación en cámara IA)
          </legend>
          <div className="space-y-1.5 pt-1">
            {AVAILABLE_EPPS.map((epp) => {
              const eppId = `${idPrefix}-epp-${epp.code}`;
              const checked = requiredEpps.includes(epp.code);
              return (
                <div
                  key={epp.code}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 transition-colors hover:border-slate-300"
                >
                  <input
                    id={eppId}
                    name="required_epps"
                    type="checkbox"
                    value={epp.code}
                    checked={checked}
                    onChange={() => toggleEpp(epp.code)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  />
                  <label
                    htmlFor={eppId}
                    className="flex flex-1 cursor-pointer items-center justify-between gap-2"
                  >
                    <span className="font-medium text-slate-800">{epp.label}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {epp.technical}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            {submitting ? "Publicando..." : "Publicar convocatoria"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
