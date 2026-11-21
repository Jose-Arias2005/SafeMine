import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/tokens";
import { EppVerificationResponse, Worker } from "../../types";

export const GATE_EPP_LABELS: Record<string, string> = {
  HEAD_COVER: "Casco de seguridad",
  HAND_COVER: "Guantes de seguridad",
  FACE_COVER: "Protección facial / lentes",
};

export function formatEppLabel(code: string): string {
  return GATE_EPP_LABELS[code] || code;
}

interface GateTrafficLightProps {
  isGreen: boolean;
  activeWorker: Worker | null;
  eppResult: EppVerificationResponse | null;
  qrRejectionMessage: string | null;
  qrRejectionReasons: string[];
  isOfflineMode: boolean;
  pendingCount: number;
  onRetryEpp: () => void;
  onNextWorker: () => void;
}

export function GateTrafficLight({
  isGreen,
  activeWorker,
  eppResult,
  qrRejectionMessage,
  qrRejectionReasons,
  isOfflineMode,
  pendingCount,
  onRetryEpp,
  onNextWorker,
}: GateTrafficLightProps) {
  return (
    <View style={styles.card}>
      {/* Cabecera semáforo de alto contraste VERDE / ROJO */}
      <View
        style={[
          styles.signalHeader,
          isGreen ? styles.signalHeaderGreen : styles.signalHeaderRed,
        ]}
      >
        <View style={styles.trafficHousing}>
          <View
            style={[
              styles.lamp,
              !isGreen ? styles.lampRedOn : styles.lampOff,
            ]}
          />
          <View
            style={[
              styles.lamp,
              isGreen ? styles.lampGreenOn : styles.lampOff,
            ]}
          />
        </View>

        <Text style={styles.signalKicker}>
          {isGreen ? "SEMÁFORO VERDE" : "SEMÁFORO ROJO"}
        </Text>
        <Text style={styles.signalTitle}>
          {isGreen ? "PASE AUTORIZADO" : "ALTO · ACCESO DENEGADO"}
        </Text>
      </View>

      {/* Cuerpo neutro y limpio */}
      <View style={styles.body}>
        <Text style={styles.resultMessage}>
          {eppResult?.message ||
            qrRejectionMessage ||
            "Acceso denegado en control de garita."}
        </Text>

        {activeWorker && (
          <View style={styles.workerBox}>
            <Text style={styles.workerName}>{activeWorker.full_name}</Text>
            <Text style={styles.workerMeta}>
              DNI {activeWorker.dni} · {activeWorker.position}
            </Text>
            <Text
              style={[
                styles.faltasMeta,
                activeWorker.faltas_epp_count > 0 && styles.faltasMetaAlert,
              ]}
            >
              Faltas EPP acumuladas: {activeWorker.faltas_epp_count}
            </Text>
          </View>
        )}

        {isOfflineMode && (
          <View style={styles.offlineNotice}>
            <Ionicons
              name="cloud-offline-outline"
              size={15}
              color={colors.warningText}
            />
            <Text style={styles.offlineNoticeText}>
              Guardado en cola local ({pendingCount} pendiente(s) de envío)
            </Text>
          </View>
        )}

        {/* Motivos de bloqueo en Fase 1 (QR no habilitado) */}
        {qrRejectionReasons.length > 0 && (
          <View style={styles.alertListBox}>
            <Text style={styles.alertListTitle}>
              Requisitos de acreditación pendientes
            </Text>
            {qrRejectionReasons.map((reason, idx) => (
              <View key={idx} style={styles.alertRow}>
                <Ionicons
                  name="close-circle"
                  size={15}
                  color={colors.danger}
                />
                <Text style={styles.alertItemText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* EPPs faltantes traducidos al español */}
        {eppResult && eppResult.missing_epps.length > 0 && (
          <View style={styles.alertListBox}>
            <Text style={styles.alertListTitle}>EPPs faltantes</Text>
            {eppResult.missing_epps.map((code) => (
              <View key={code} style={styles.alertRow}>
                <Ionicons name="warning" size={15} color={colors.danger} />
                <Text style={styles.alertItemText}>{formatEppLabel(code)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* EPPs verificados traducidos al español */}
        {eppResult && eppResult.detected_epps.length > 0 && (
          <View style={styles.detectedBlock}>
            <Text style={styles.detectedLabel}>EPPs verificados</Text>
            <View style={styles.detectedWrap}>
              {eppResult.detected_epps.map((code) => (
                <View key={code} style={styles.detectedChip}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={colors.success}
                  />
                  <Text style={styles.detectedChipText}>
                    {formatEppLabel(code)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Acciones finales */}
        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={onNextWorker}>
            <Ionicons
              name="qr-code-outline"
              size={18}
              color={colors.onAccent}
            />
            <Text style={styles.primaryBtnText}>Siguiente operario</Text>
          </Pressable>

          {activeWorker?.is_authorized && !isGreen && (
            <Pressable style={styles.secondaryBtn} onPress={onRetryEpp}>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={colors.textPrimary}
              />
              <Text style={styles.secondaryBtnText}>Reintentar foto EPP</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  signalHeader: {
    paddingVertical: 22,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: 8,
  },
  signalHeaderGreen: {
    backgroundColor: colors.success,
  },
  signalHeaderRed: {
    backgroundColor: colors.danger,
  },
  trafficHousing: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  lamp: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  lampRedOn: {
    backgroundColor: "#ffffff",
    borderWidth: 4,
    borderColor: "#fecaca",
  },
  lampGreenOn: {
    backgroundColor: "#ffffff",
    borderWidth: 4,
    borderColor: "#bbf7d0",
  },
  lampOff: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  signalKicker: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },
  signalTitle: {
    color: colors.onDark,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  body: {
    padding: spacing.lg,
    gap: 14,
  },
  resultMessage: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  workerBox: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  workerName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  workerMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
  faltasMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  faltasMetaAlert: {
    color: colors.dangerText,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  offlineNoticeText: {
    color: colors.warningText,
    fontSize: 12,
    fontWeight: "700",
  },
  alertListBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertListTitle: {
    color: colors.dangerText,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  alertItemText: {
    flex: 1,
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: "600",
  },
  detectedBlock: {
    gap: spacing.sm,
    alignItems: "center",
  },
  detectedLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detectedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  detectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  detectedChipText: {
    color: colors.successText,
    fontSize: 12,
    fontWeight: "700",
  },
  actions: {
    gap: 10,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});
