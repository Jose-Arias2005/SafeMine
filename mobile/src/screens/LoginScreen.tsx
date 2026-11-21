import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { CollapsibleTestTools } from "../components/CollapsibleTestTools";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { colors, radius, spacing } from "../theme/tokens";
import { DemoAccount, RootStackParamList } from "../types";
import { loadOfflineBadge } from "../utils/offlineStorage";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { user, worker, apiBaseUrl, setLanApiUrl, loginOperario, logout } =
    useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasCachedBadge, setHasCachedBadge] = useState(false);
  const [cachedOwnerName, setCachedOwnerName] = useState<string | null>(null);

  const [lanModalOpen, setLanModalOpen] = useState(false);
  const [lanInput, setLanInput] = useState(apiBaseUrl);
  const [demoWorkers, setDemoWorkers] = useState<DemoAccount[]>([]);

  useEffect(() => {
    setLanInput(apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    let active = true;
    (async () => {
      const badge = await loadOfflineBadge();
      if (active && badge?.worker) {
        setHasCachedBadge(true);
        setCachedOwnerName(`${badge.worker.full_name} · DNI ${badge.worker.dni}`);
      }
      try {
        const res = await authService.getDemoAccounts();
        if (active) {
          setDemoWorkers(
            res.accounts.filter((a) => a.role === "TRABAJADOR").slice(0, 4)
          );
        }
      } catch {
        // Sin conexión al backend: modo offline disponible igualmente
      }
    })();
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  const routeWorkerByStep = (targetWorker: {
    id: number;
    exam_passed: boolean;
    exam_score: number;
    medical_cert_status: string;
    is_authorized: boolean;
  }) => {
    if (!targetWorker.exam_passed || targetWorker.exam_score < 80) {
      navigation.navigate("InductionQuiz", { workerId: targetWorker.id });
    } else if (
      targetWorker.medical_cert_status !== "VALIDADA_POR_IA" ||
      !targetWorker.is_authorized
    ) {
      navigation.navigate("MedicalUpload", { workerId: targetWorker.id });
    } else {
      navigation.navigate("DigitalBadge", { offlineMode: false });
    }
  };

  const handleLogin = async () => {
    const cleanId = identifier.trim();
    if (!cleanId || !password.trim()) {
      Alert.alert(
        "Campos requeridos",
        "Ingrese su DNI (o usuario op.<DNI>) y su contraseña temporal."
      );
      return;
    }

    setLoading(true);
    try {
      const { worker: loggedWorker } = await loginOperario(
        cleanId,
        password.trim()
      );
      routeWorkerByStep(loggedWorker);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No fue posible conectar con el servidor SafeMine AI.";
      Alert.alert("Error de autenticación", message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOfflineBadge = async () => {
    const cleanDni = /^\d{8}$/.test(identifier.trim())
      ? identifier.trim()
      : undefined;
    const badge = await loadOfflineBadge(cleanDni);
    if (!badge) {
      Alert.alert(
        "Sin Fotocheck guardado",
        "Aún no existe una credencial autorizada almacenada en este teléfono. Inicie sesión y complete su acreditación una vez con red."
      );
      return;
    }
    navigation.navigate("DigitalBadge", {
      offlineMode: true,
      dniHint: cleanDni,
    });
  };

  const handleSaveLanUrl = async () => {
    const saved = await setLanApiUrl(lanInput.trim() || null);
    setLanInput(saved);
    setLanModalOpen(false);
    Alert.alert("Servidor actualizado", `Conectado a: ${saved}`);
  };

  const handleResetLanUrl = async () => {
    const saved = await setLanApiUrl(null);
    setLanInput(saved);
    setLanModalOpen(false);
    Alert.alert("Servidor restablecido", `URL automática: ${saved}`);
  };

  const hasActiveSession = Boolean(user && worker);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cabecera mínima */}
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <View style={styles.brandIconBox}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.brandText}>SafeMine</Text>
            </View>

            <Pressable
              style={styles.settingsBtn}
              onPress={() => setLanModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Configurar servidor"
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Encabezado */}
          <View style={styles.heroBlock}>
            <Text style={styles.title}>Acreditación de Operarios</Text>
            <Text style={styles.subtitle}>
              Completa tu inducción IPERC, valida tu certificado EMO y obtén tu
              Fotocheck QR para ingreso a mina.
            </Text>
          </View>

          {/* Flujo único: sesión activa O formulario de ingreso (nunca doble CTA) */}
          {hasActiveSession && worker ? (
            <View style={styles.card}>
              <View style={styles.sessionTopRow}>
                <View style={styles.sessionBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: worker.is_authorized
                          ? colors.success
                          : colors.accent,
                      },
                    ]}
                  />
                  <Text style={styles.sessionBadgeText}>
                    {worker.is_authorized
                      ? "Habilitado"
                      : "Acreditación en curso"}
                  </Text>
                </View>
              </View>

              <Text style={styles.sessionName}>{worker.full_name}</Text>
              <Text style={styles.sessionMeta}>
                DNI {worker.dni} · {worker.position}
              </Text>

              <Pressable
                style={styles.primaryBtn}
                onPress={() => routeWorkerByStep(worker)}
              >
                <Text style={styles.primaryBtnText}>
                  {worker.is_authorized
                    ? "Abrir mi Fotocheck QR"
                    : !worker.exam_passed
                    ? "Continuar: Paso 1 (IPERC)"
                    : "Continuar: Paso 2 (EMO)"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.onAccent}
                />
              </Pressable>

              <Pressable style={styles.secondaryGhostBtn} onPress={logout}>
                <Ionicons
                  name="log-out-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.secondaryGhostBtnText}>
                  Cambiar de operario
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.inputLabel}>DNI o usuario</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 46102938"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={(val) => {
                  setIdentifier(val);
                  if (/^\d{8}$/.test(val.trim()) && !password) {
                    setPassword(`mina${val.trim().slice(-4)}`);
                  }
                }}
              />

              <Text style={[styles.inputLabel, styles.mt14]}>
                Contraseña temporal
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />

              <Pressable
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.primaryBtnText}>Ingresar</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Acceso directo sin conexión al Fotocheck */}
          <Pressable style={styles.actionRow} onPress={handleOpenOfflineBadge}>
            <View
              style={[
                styles.actionIconBox,
                hasCachedBadge && styles.actionIconBoxSuccess,
              ]}
            >
              <Ionicons
                name="qr-code-outline"
                size={20}
                color={hasCachedBadge ? colors.success : colors.textSecondary}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.actionTitle}>
                Ver mi Fotocheck guardado (Offline)
              </Text>
              <Text style={styles.actionSubtitle} numberOfLines={1}>
                {hasCachedBadge && cachedOwnerName
                  ? cachedOwnerName
                  : "Disponible sin señal tras completar tu acreditación"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>

          {/* Separador hacia Modo Garita */}
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionLabel}>CONTROL DE ACCESO</Text>
            <Pressable
              style={styles.actionRow}
              onPress={() => navigation.navigate("GateScanner")}
            >
              <View style={styles.actionIconBox}>
                <Ionicons
                  name="scan-outline"
                  size={20}
                  color={colors.textPrimary}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.actionTitle}>Modo Garita</Text>
                <Text style={styles.actionSubtitle}>
                  Escaneo de Fotocheck QR e inspección de EPPs
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {/* Cuentas de prueba colapsadas */}
          {!hasActiveSession && demoWorkers.length > 0 && (
            <CollapsibleTestTools title="Cuentas de prueba">
              <View style={styles.demoChipsWrap}>
                {demoWorkers.map((acc) => (
                  <Pressable
                    key={acc.id}
                    style={styles.demoChip}
                    onPress={() => {
                      setIdentifier(acc.dni || acc.username);
                      setPassword(acc.password);
                    }}
                  >
                    <Text style={styles.demoChipName} numberOfLines={1}>
                      {acc.full_name}
                    </Text>
                    <Text style={styles.demoChipMeta}>
                      DNI {acc.dni || acc.username} ·{" "}
                      {acc.is_authorized ? "Habilitado" : "Pendiente"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </CollapsibleTestTools>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de configuración del servidor LAN */}
      <Modal
        visible={lanModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLanModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuración de servidor</Text>
              <Pressable
                onPress={() => setLanModalOpen(false)}
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalDesc}>
              Dirección del servidor SafeMine API en la red local (LAN).
            </Text>
            <TextInput
              style={styles.input}
              value={lanInput}
              onChangeText={setLanInput}
              placeholder="http://192.168.1.100:8000"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondaryBtn}
                onPress={handleResetLanUrl}
              >
                <Text style={styles.modalSecondaryText}>Automático</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={handleSaveLanUrl}
              >
                <Text style={styles.modalPrimaryText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: spacing.xl,
    paddingBottom: 36,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBlock: {
    gap: 6,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sessionName: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  sessionMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  inputLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  mt14: {
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryGhostBtn: {
    marginTop: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryGhostBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBoxSuccess: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  actionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  actionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionDivider: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingHorizontal: 2,
  },
  demoChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  demoChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "48%",
  },
  demoChipName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  demoChipMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  modalDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.xs,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: colors.onAccent,
    fontWeight: "700",
    fontSize: 14,
  },
});
