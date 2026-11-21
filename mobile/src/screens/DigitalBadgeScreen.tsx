import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import QRCodeSVG from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { StepHeader } from "../components/StepHeader";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme/tokens";
import { CachedOfflineBadge, RootStackParamList, Worker } from "../types";
import {
  loadOfflineBadge,
  saveOfflineBadge,
} from "../utils/offlineStorage";

type Props = NativeStackScreenProps<RootStackParamList, "DigitalBadge">;

const EPP_LABELS: Record<string, string> = {
  HEAD_COVER: "Casco de seguridad",
  HAND_COVER: "Guantes de seguridad",
  FACE_COVER: "Protección facial",
};

export function DigitalBadgeScreen({ navigation, route }: Props) {
  const { user, worker, proposal, refreshWorkerProfile } = useAuth();
  const offlineRequested = route.params?.offlineMode ?? false;
  const dniHint = route.params?.dniHint;

  const [badgeData, setBadgeData] = useState<CachedOfflineBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUsingCachedCopy, setIsUsingCachedCopy] = useState(offlineRequested);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!offlineRequested && worker?.is_authorized) {
          const saved = await saveOfflineBadge(
            worker,
            proposal?.provider_company_name || user?.company_name,
            proposal?.required_epps
          );
          if (active) {
            setBadgeData(saved);
            setIsUsingCachedCopy(false);
          }
          return;
        }

        const cached = await loadOfflineBadge(dniHint || worker?.dni);
        if (cached && active) {
          setBadgeData(cached);
          setIsUsingCachedCopy(true);
        }

        if (!offlineRequested && (user?.worker_id || worker?.id)) {
          try {
            const refreshed = await refreshWorkerProfile();
            if (refreshed?.is_authorized && active) {
              const updated = await loadOfflineBadge(refreshed.dni);
              if (updated) {
                setBadgeData(updated);
                setIsUsingCachedCopy(false);
              }
            }
          } catch {
            // Permanece en modo offline sin interrumpir la vista del QR
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    dniHint,
    offlineRequested,
    proposal?.provider_company_name,
    proposal?.required_epps,
    refreshWorkerProfile,
    user?.company_name,
    user?.worker_id,
    worker,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Cargando Fotocheck QR...</Text>
      </SafeAreaView>
    );
  }

  const displayWorker: Worker | null = badgeData?.worker ?? worker;

  if (!displayWorker || !displayWorker.is_authorized) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.emptyIconBox}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={colors.textSecondary}
          />
        </View>
        <Text style={styles.emptyTitle}>Credencial aún no habilitada</Text>
        <Text style={styles.emptyDesc}>
          Completa el Paso 1 (Inducción IPERC con nota mínima 80%) y el Paso 2
          (Certificado EMO validado como APTO) para activar tu Fotocheck QR.
        </Text>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.backBtnText}>Volver al inicio</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const qrValue =
    displayWorker.qr_payload ||
    JSON.stringify({
      system: "SafeMineAI",
      worker_id: displayWorker.id,
      dni: displayWorker.dni,
      full_name: displayWorker.full_name,
    });

  const requiredEpps = badgeData?.requiredEpps ||
    proposal?.required_epps || ["HEAD_COVER", "HAND_COVER", "FACE_COVER"];

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {!offlineRequested && <StepHeader currentStep={3} />}

        {/* Tarjeta credencial física blanca de alto contraste */}
        <View style={styles.badgeCard}>
          {/* Estado de habilitación + estado offline */}
          <View style={styles.statusBar}>
            <View style={styles.authorizedPill}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.success}
              />
              <Text style={styles.authorizedPillText}>HABILITADO</Text>
            </View>

            <View
              style={[
                styles.offlineChip,
                isUsingCachedCopy && styles.offlineChipActive,
              ]}
            >
              <Ionicons
                name={
                  isUsingCachedCopy
                    ? "cloud-offline-outline"
                    : "cloud-done-outline"
                }
                size={13}
                color={
                  isUsingCachedCopy ? colors.warningText : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.offlineChipText,
                  isUsingCachedCopy && styles.offlineChipTextActive,
                ]}
              >
                {isUsingCachedCopy ? "Modo sin conexión" : "Guardado offline"}
              </Text>
            </View>
          </View>

          {/* Identidad del operario */}
          <View style={styles.identityBlock}>
            <Text style={styles.companyLabel}>
              {badgeData?.companyName ||
                proposal?.provider_company_name ||
                "CONTRATISTA MINERO ACREDITADO"}
            </Text>
            <Text style={styles.workerName}>{displayWorker.full_name}</Text>
            <Text style={styles.workerRole}>{displayWorker.position}</Text>
          </View>

          {/* Código QR de alto contraste con zona silenciosa amplia */}
          <View style={styles.qrFrame}>
            <QRCodeSVG
              value={qrValue}
              size={224}
              color={colors.textPrimary}
              backgroundColor={colors.surface}
              ecl="M"
            />
          </View>

          <Text style={styles.scanHint}>
            Presenta este código QR en Garita de Control
          </Text>

          {/* Datos esenciales de verificación */}
          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.metaKey}>DNI</Text>
              <Text style={styles.metaVal}>{displayWorker.dni}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCell}>
              <Text style={styles.metaKey}>IPERC</Text>
              <Text style={styles.metaValSuccess}>
                {displayWorker.exam_score}%
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCell}>
              <Text style={styles.metaKey}>EMO</Text>
              <Text style={styles.metaValSuccess}>APTO</Text>
            </View>
          </View>

          {/* EPPs obligatorios */}
          <View style={styles.eppSection}>
            <Text style={styles.eppSectionTitle}>EPPs obligatorios</Text>
            <View style={styles.eppChips}>
              {requiredEpps.map((code) => (
                <View key={code} style={styles.eppChip}>
                  <Text style={styles.eppChipText}>
                    {EPP_LABELS[code] || code}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {badgeData?.cachedAt && (
          <Text style={styles.cachedTimestamp}>
            Respaldo offline:{" "}
            {new Date(badgeData.cachedAt).toLocaleString()}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  backBtnText: {
    color: colors.onAccent,
    fontWeight: "700",
    fontSize: 14,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 34,
    gap: 14,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
  },
  statusBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  authorizedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  authorizedPillText: {
    color: colors.successText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  offlineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  offlineChipActive: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  offlineChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  offlineChipTextActive: {
    color: colors.warningText,
    fontWeight: "700",
  },
  identityBlock: {
    alignItems: "center",
    gap: 3,
  },
  companyLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  workerName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 2,
  },
  workerRole: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  qrFrame: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: -6,
  },
  metaRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  metaCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  metaKey: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metaVal: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  metaValSuccess: {
    color: colors.successText,
    fontSize: 14,
    fontWeight: "800",
  },
  eppSection: {
    width: "100%",
    gap: spacing.sm,
    alignItems: "center",
  },
  eppSectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eppChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  eppChip: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  eppChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  cachedTimestamp: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
});
