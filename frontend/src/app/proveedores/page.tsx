"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  KeyRound,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import OpenProposalsView from "@/components/proveedores/OpenProposalsView";
import CredentialsTable from "@/components/proveedores/CredentialsTable";
import ReportsInbox from "@/components/proveedores/ReportsInbox";
import { proveedorService } from "@/services/proveedorService";
import { Proposal, WorkerCandidateInput } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function ProveedoresPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "abiertas" | "credenciales" | "reportes"
  >("abiertas");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [banner, setBanner] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await proveedorService.getProposalsAndReports(user?.id);
      setProposals(data.proposals);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePostulate = async (
    proposalId: number,
    workers: WorkerCandidateInput[]
  ) => {
    try {
      const providerId = user?.id || 2;
      const res = await proveedorService.postulateSquad(proposalId, providerId, workers);
      setBanner({
        type: "ok",
        text: `${res.message} Puedes hacer seguimiento de sus credenciales en la pestaña 'Nómina y Accesos Generados'.`,
      });
      await loadData();
      setActiveTab("credenciales");
    } catch (err: unknown) {
      setBanner({
        type: "err",
        text:
          err instanceof Error ? err.message : "Error al postular cuadrilla",
      });
    }
  };

  // Filtrar según la cuenta del Proveedor autenticado
  const openCount = proposals.filter((p) => p.status === "ABIERTA").length;
  const providerSquads = proposals.filter(
    (p) =>
      p.status === "ACEPTADA" ||
      (p.status === "POSTULADA" && (user?.id ? p.provider_id === user.id : true))
  );
  const providerReports = proposals.filter(
    (p) =>
      p.status === "ACEPTADA" &&
      (user?.id ? p.provider_id === user.id : true) &&
      (p.report_sent || p.incident_workers_count > 0)
  );

  return (
    <PageContainer
      title="Portal de Proveedores Contratistas"
      subtitle={`Bienvenido ${user?.full_name || ""}. Gestiona postulaciones de cuadrillas, consulta credenciales creadas automáticamente y revisa reportes emitidos por la Minera.`}
      actions={
        <div className="flex items-center gap-2">
          {user?.company_name && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              <span>{user.company_name}</span>
            </span>
          )}
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Actualizar</span>
          </button>
        </div>
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

      <Tabs
        activeTab={activeTab}
        onChange={(id) =>
          setActiveTab(id as "abiertas" | "credenciales" | "reportes")
        }
        tabs={[
          {
            id: "abiertas",
            label: "Tab 1: Propuestas Abiertas",
            count: openCount,
            icon: <Briefcase className="h-4 w-4" />,
          },
          {
            id: "credenciales",
            label: "Tab 2: Nómina y Accesos Generados",
            count: providerSquads.length,
            icon: <KeyRound className="h-4 w-4" />,
          },
          {
            id: "reportes",
            label: "Tab 3: Reportes Recibidos",
            count: providerReports.length,
            icon: <FileText className="h-4 w-4" />,
          },
        ]}
      />

      {activeTab === "abiertas" && (
        <OpenProposalsView
          proposals={proposals}
          onPostulate={handlePostulate}
        />
      )}

      {activeTab === "credenciales" && (
        <CredentialsTable proposals={providerSquads} />
      )}

      {activeTab === "reportes" && <ReportsInbox proposals={providerReports} />}
    </PageContainer>
  );
}
