"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  KeyRound,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import OpenProposalsView from "@/components/proveedores/OpenProposalsView";
import CredentialsTable from "@/components/proveedores/CredentialsTable";
import ReportsInbox from "@/components/proveedores/ReportsInbox";
import { proveedorService } from "@/services/proveedorService";
import { Proposal, WorkerCandidateInput } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function ProveedoresPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
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
      const data = await proveedorService.getProposalsAndReports();
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
      const res = await proveedorService.postulateSquad(proposalId, workers);
      showToast({
        variant: "success",
        message: `${res.message} Revisa sus accesos en "Nómina y accesos".`,
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
      title="Portal de Proveedores"
      subtitle={`Postulación de cuadrillas, accesos temporales y reportes SSO${user?.company_name ? ` · ${user.company_name}` : ""}.`}
      actions={
        <button
          type="button"
          onClick={loadData}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <span>Actualizar</span>
        </button>
      }
    >
      {banner && (
        <div
          role={banner.type === "err" ? "alert" : "status"}
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
        idPrefix="proveedores"
        ariaLabel="Secciones del portal de proveedores"
        activeTab={activeTab}
        onChange={(id) =>
          setActiveTab(id as "abiertas" | "credenciales" | "reportes")
        }
        tabs={[
          {
            id: "abiertas",
            label: "Propuestas abiertas",
            count: openCount,
            icon: <Briefcase className="h-4 w-4" />,
          },
          {
            id: "credenciales",
            label: "Nómina y accesos",
            count: providerSquads.length,
            icon: <KeyRound className="h-4 w-4" />,
          },
          {
            id: "reportes",
            label: "Reportes recibidos",
            count: providerReports.length,
            icon: <FileText className="h-4 w-4" />,
          },
        ]}
      />

      <div
        role="tabpanel"
        aria-labelledby={`proveedores-tab-${activeTab}`}
        className="sm-contain-section"
      >
        {activeTab === "abiertas" && (
          <OpenProposalsView
            proposals={proposals}
            onPostulate={handlePostulate}
          />
        )}

        {activeTab === "credenciales" && (
          <CredentialsTable proposals={providerSquads} />
        )}

        {activeTab === "reportes" && (
          <ReportsInbox proposals={providerReports} />
        )}
      </div>
    </PageContainer>
  );
}
