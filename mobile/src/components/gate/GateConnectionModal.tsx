import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/tokens";

interface GateConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  isOfflineMode: boolean;
  wsOnline: boolean;
  pendingCount: number;
  cachedRosterCount: number;
  isUpdatingRoster: boolean;
  isSyncing: boolean;
  onToggleOfflineMode: () => void;
  onDownloadRoster: () => void;
  onSyncWithAws: () => void;
}

export function GateConnectionModal({
  visible,
  onClose,
  isOfflineMode,
  wsOnline,
  pendingCount,
  cachedRosterCount,
  isUpdatingRoster,
  isSyncing,
  onToggleOfflineMode,
  onDownloadRoster,
  onSyncWithAws,
}: GateConnectionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Conexión y padrón de garita</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Cerrar panel de conexión"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Resumen de estado */}
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isOfflineMode
                        ? colors.warning
                        : colors.success,
                    },
                  ]}
                />
                <Text style={styles.statusTitle}>
                  {isOfflineMode ? "Modo sin conexión activo" : "Garita en línea"}
                </Text>
              </View>
              <Text style={styles.channelTag}>
                {isOfflineMode
                  ? "Local"
                  : wsOnline
                  ? "En vivo"
                  : "HTTP"}
              </Text>
            </View>

            <Text style={styles.statusMeta}>
              {isOfflineMode
                ? "Las lecturas QR se validan con el padrón local y los registros se guardan en cola."
                : "Validación directa contra el servidor SafeMine."}
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Padrón local</Text>
                <Text style={styles.metricValue}>
                  {cachedRosterCount > 0
                    ? `${cachedRosterCount} operarios`
                    : "Base demo"}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Cola pendiente</Text>
                <Text
                  style={[
                    styles.metricValue,
                    pendingCount > 0 && styles.metricValueWarn,
                  ]}
                >
                  {pendingCount} registro(s)
                </Text>
              </View>
            </View>
          </View>

          {/* Acciones de gestión */}
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.primarySyncBtn,
                pendingCount === 0 && styles.btnDisabled,
              ]}
              onPress={onSyncWithAws}
              disabled={pendingCount === 0 || isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={colors.onAccent}
                  />
                  <Text style={styles.primarySyncBtnText}>
                    Sincronizar pendientes ({pendingCount})
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={onDownloadRoster}
              disabled={isUpdatingRoster}
            >
              {isUpdatingRoster ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="cloud-download-outline"
                    size={18}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.secondaryBtnText}>
                    Actualizar padrón local
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.secondaryBtn,
                isOfflineMode && styles.toggleOnlineBtn,
              ]}
              onPress={onToggleOfflineMode}
            >
              <Ionicons
                name={
                  isOfflineMode ? "wifi-outline" : "cloud-offline-outline"
                }
                size={18}
                color={isOfflineMode ? colors.accentText : colors.textPrimary}
              />
              <Text
                style={[
                  styles.secondaryBtnText,
                  isOfflineMode && styles.toggleOnlineText,
                ]}
              >
                {isOfflineMode
                  ? "Cambiar a modo en línea"
                  : "Activar modo sin conexión"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBox: {
    backgroundColor: colors.canvas,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  channelTag: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  statusMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricCell: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  metricValueWarn: {
    color: colors.warningText,
  },
  actions: {
    gap: 10,
  },
  primarySyncBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primarySyncBtnText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
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
  toggleOnlineBtn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  toggleOnlineText: {
    color: colors.accentText,
    fontWeight: "700",
  },
});
