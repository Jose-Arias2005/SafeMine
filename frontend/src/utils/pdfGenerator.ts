import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Proposal } from "@/types";

export function generatePerformanceReportPDF(proposal: Proposal) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const nowStr = new Date().toLocaleString("es-PE");

  const workers = proposal.workers || [];
  const compliantWorkers = workers.filter(
    (w) => !w.mala_conducta && !w.mal_trabajo && !w.no_lleva_epps
  );
  const nonCompliantWorkers = workers.filter(
    (w) => w.mala_conducta || w.mal_trabajo || w.no_lleva_epps
  );

  // Encabezado Corporativo SafeMine AI
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("SAFEMINE AI - REPORTE OFICIAL DE DESEMPENO Y CUMPLIMIENTO SSO", 14, 15);

  doc.setTextColor(203, 213, 225);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Convocatoria: ${proposal.title}   |   Empresa Contratista: ${proposal.provider_company_name || "Proveedor Acreditado"}`,
    14,
    23
  );
  doc.text(
    `Fecha de Emision: ${nowStr}   |   Inicio de Guardia: ${proposal.start_date}   |   Total Cuadrilla: ${workers.length} trabajadores`,
    14,
    29
  );

  // Resumen Ejecutivo
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. RESUMEN EJECUTIVO DE LA CUADRILLA", 14, 44);

  autoTable(doc, {
    startY: 47,
    head: [
      [
        "Total Trabajadores Evaluados",
        "Trabajadores con Buen Desempeno (Sin Faltas)",
        "Trabajadores con Incumplimientos / Observados",
        "Autorizados con QR para Mina",
      ],
    ],
    body: [
      [
        `${workers.length} operarios`,
        `${compliantWorkers.length} operarios (${Math.round((compliantWorkers.length / Math.max(workers.length, 1)) * 100)}%)`,
        `${nonCompliantWorkers.length} operarios (${Math.round((nonCompliantWorkers.length / Math.max(workers.length, 1)) * 100)}%)`,
        `${workers.filter((w) => w.is_authorized).length} / ${workers.length}`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  const afterSummaryY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 68;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(
    "2. DETALLE DE EVALUACION INDIVIDUAL Y DETECCION DE EPPs EN CAMARA",
    14,
    afterSummaryY + 10
  );

  const tableRows = workers.map((w, idx) => {
    const hasFault = w.mala_conducta || w.mal_trabajo || w.no_lleva_epps;
    return [
      String(idx + 1),
      `${w.first_name} ${w.last_name}`,
      w.dni,
      w.position,
      w.is_authorized ? "AUTORIZADO" : "PENDIENTE",
      w.mala_conducta ? "[X] SI" : "[ ] NO",
      w.mal_trabajo ? "[X] SI" : "[ ] NO",
      w.no_lleva_epps ? `[X] SI (${w.faltas_epp_count} en camara)` : "[ ] NO",
      hasFault ? "OBSERVADO / INCUMPLIO" : "BUEN DESEMPENO",
      w.observaciones || "Sin observaciones adicionales.",
    ];
  });

  autoTable(doc, {
    startY: afterSummaryY + 14,
    head: [
      [
        "#",
        "Trabajador",
        "DNI",
        "Cargo",
        "Estado Mina",
        "Mala Conducta",
        "Mal Trabajo",
        "No lleva EPPs",
        "Dictamen Final",
        "Observaciones de Minera / Camara IA",
      ],
    ],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5, valign: "middle" },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 8) {
        const val = String(data.cell.raw || "");
        if (val.includes("INCUMPLIO")) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const safeTitle = proposal.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 35);
  doc.save(`Reporte_SafeMine_${safeTitle}.pdf`);
}
