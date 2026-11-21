export const colors = {
  // Superficies neutras (alineadas con web/src/app/globals.css)
  canvas: "#f8fafc",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",

  // Bordes
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",

  // Tipografía
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",

  // Acento primario (acciones clave)
  accent: "#2563eb",
  accentSoft: "#eff6ff",
  accentBorder: "#bfdbfe",
  accentText: "#1d4ed8",
  onAccent: "#ffffff",

  // Semánticos (reservados para semáforo, estado habilitado y alertas/offline)
  success: "#16a34a",
  successSoft: "#f0fdf4",
  successBorder: "#bbf7d0",
  successText: "#166534",

  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  dangerBorder: "#fecaca",
  dangerText: "#991b1b",

  warning: "#d97706",
  warningSoft: "#fffbeb",
  warningBorder: "#fde68a",
  warningText: "#92400e",

  // Superficies oscuras exclusivas para visores de cámara
  cameraBg: "#000000",
  cameraOverlay: "rgba(15, 23, 42, 0.72)",
  onDark: "#ffffff",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
