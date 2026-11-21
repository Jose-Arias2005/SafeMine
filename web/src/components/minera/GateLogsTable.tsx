"use client";

import React, { useId, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { AccessLogEntry } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface GateLogsTableProps {
  logs: AccessLogEntry[];
  onRefresh: () => Promise<void> | void;
}

export default function GateLogsTable({ logs, onRefresh }: GateLogsTableProps) {
  const [filterMode, setFilterMode] = useState<"all" | "alerts">("all");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const captionId = useId();
  const searchId = useId();
  const filterGroupName = useId();

  const alertCount = useMemo(
    () => logs.filter((log) => log.status === "ROJO").length,
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (filterMode === "alerts" && log.status !== "ROJO") {
        return false;
      }
      if (!normalized) return true;
      return (
        log.worker_name.toLowerCase().includes(normalized) ||
        log.worker_dni.toLowerCase().includes(normalized) ||
        log.phase.toLowerCase().includes(normalized) ||
        log.message.toLowerCase().includes(normalized)
      );
    });
  }, [logs, filterMode, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cabecera y barra de filtro semántica (<search>) */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id={captionId} className="text-sm font-semibold text-slate-900">
            Bitácora de control de acceso y visión EPP
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Eventos sincronizados en tiempo real desde garita móvil y cámara IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <search className="flex flex-wrap items-center gap-2">
            {/* Filtro rápido Todos / Solo alertas ROJO */}
            <fieldset className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <legend className="visually-hidden">Filtrar por estado</legend>
              <label
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-blue-600 ${
                  filterMode === "all"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name={filterGroupName}
                  value="all"
                  checked={filterMode === "all"}
                  onChange={() => setFilterMode("all")}
                  className="visually-hidden"
                />
                <span>Todos</span>
                <span className="tabular-nums opacity-75">({logs.length})</span>
              </label>
              <label
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-blue-600 ${
                  filterMode === "alerts"
                    ? "bg-red-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name={filterGroupName}
                  value="alerts"
                  checked={filterMode === "alerts"}
                  onChange={() => setFilterMode("alerts")}
                  className="visually-hidden"
                />
                <span>Alertas ROJO</span>
                <span className="tabular-nums opacity-75">({alertCount})</span>
              </label>
            </fieldset>

            {/* Búsqueda rápida por trabajador o DNI */}
            <div className="relative">
              <label htmlFor={searchId} className="visually-hidden">
                Buscar por trabajador, DNI o fase
              </label>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar trabajador o DNI..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="h-8 w-48 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 sm:w-56"
              />
            </div>
          </search>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">
          {logs.length === 0
            ? "Aún no hay eventos registrados en la bitácora de garita."
            : "No se encontraron eventos con el filtro actual."}
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-labelledby={captionId}
          className="sm-table-wrap sm-scroll max-h-[65vh]"
        >
          <table className="sm-table-responsive text-left text-xs">
            <caption className="visually-hidden">
              Historial de inspecciones de garita y verificación EPP
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  Trabajador
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  Fecha / Hora
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  Fase
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="border-b border-slate-200 px-4 py-3">
                  Resumen EPP y detalle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const isRed = log.status === "ROJO";
                const isGreen = log.status === "VERDE";
                const detected = log.detected_epps || [];
                const missing = log.missing_epps || [];

                return (
                  <tr
                    key={log.id}
                    className={
                      isRed
                        ? "bg-red-50/35 hover:bg-red-50/60"
                        : "bg-white hover:bg-slate-50/70"
                    }
                  >
                    <th
                      scope="row"
                      className={`px-4 py-3 font-normal ${
                        isRed ? "bg-red-50/80" : "bg-white"
                      }`}
                    >
                      <div className="font-semibold text-slate-900">
                        {log.worker_name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        DNI {log.worker_dni}
                      </div>
                    </th>

                    <td
                      data-label="Fecha / Hora"
                      className="whitespace-nowrap px-4 py-3 font-mono text-slate-600 tabular-nums"
                    >
                      {log.timestamp || "—"}
                    </td>

                    <td
                      data-label="Fase"
                      className="whitespace-nowrap px-4 py-3 text-slate-600"
                    >
                      {log.phase}
                    </td>

                    <td data-label="Estado" className="whitespace-nowrap px-4 py-3">
                      {isGreen ? (
                        <Badge variant="emerald">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          VERDE
                        </Badge>
                      ) : isRed ? (
                        <Badge variant="red">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          ROJO
                        </Badge>
                      ) : (
                        <span className="font-medium text-slate-600">
                          {log.status}
                        </span>
                      )}
                    </td>

                    <td
                      data-label="Resumen EPP y detalle"
                      data-stack="true"
                      className="max-w-md px-4 py-3"
                    >
                      <div className="space-y-1">
                        {missing.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-medium text-red-700">
                              Faltantes:
                            </span>
                            {missing.map((epp, idx) => (
                              <Badge key={idx} variant="red">
                                {epp}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-600">
                          {detected.length > 0 ? (
                            <span>
                              <strong className="font-medium text-slate-800 tabular-nums">
                                {detected.length} EPP detectado{detected.length === 1 ? "" : "s"}:
                              </strong>{" "}
                              {detected.join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Sin EPPs detectados en captura
                            </span>
                          )}
                        </div>
                        {log.message && (
                          <p className="text-[11px] text-slate-500">{log.message}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
