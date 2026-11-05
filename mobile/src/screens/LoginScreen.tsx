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
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
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
        setCachedOwnerName(`${badge.worker.full_name} (DNI ${badge.worker.dni})`);
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
    Alert.alert("Red LAN actualizada", `Conectado a: ${saved}`);
  };

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
          {/* Barra superior de estado LAN */}
          <View style={styles.topRow}>
            <View style={styles.brandBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#f59e0b" />
              <Text style={styles.brandBadgeText}>SAFEMINE AI · MOBILE</Text>
            </View>
            <Pressable
              style={styles.lanChip}
              onPress={() => setLanModalOpen(true)}
            >
              <Ionicons name="wifi" size={14} color="#38bdf8" />
              <Text style={styles.lanChipText} numberOfLines={1}>
                {apiBaseUrl.replace(/^https?:\/\//, "")}
              </Text>
            </Pressable>
          </View>

          {/* Encabezado */}
          <View style={styles.heroBlock}>
            <Text style={styles.title}>Acreditación Operativa</Text>
            <Text style={styles.subtitle}>
              Ingresa con tu DNI y contraseña temporal asignada por tu empresa
              contratista para completar tu inducción IPERC, auditar tu EMO y
              obtener tu Fotocheck QR.
            </Text>
          </View>

          {/* Sesión activa rápida si ya estaba autenticado */}
          {user && worker && (
            <View style={styles.activeSessionCard}>
              <View style={styles.activeSessionHeader}>
                <View style={styles.flex}>
                  <Text style={styles.activeSessionLabel}>SESIÓN ACTIVA</Text>
                  <Text style={styles.activeSessionName}>
                    {worker.full_name}
                  </Text>
                  <Text style={styles.activeSessionMeta}>
                    DNI {worker.dni} · {worker.position}
                  </Text>
                </View>
                <Pressable onPress={logout} style={styles.logoutIconBtn}>
                  <Ionicons name="log-out-outline" size={20} color="#f87171" />
                </Pressable>
              </View>
              <Pressable
                style={styles.continueBtn}
                onPress={() => routeWorkerByStep(worker)}
              >
                <Text style={styles.continueBtnText}>
                  {worker.is_authorized
                    ? "Abrir mi Fotocheck QR Autorizado"
                    : !worker.exam_passed
                    ? "Continuar Paso 1: Inducción IPERC"
                    : "Continuar Paso 2: Certificado EMO"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#020617" />
              </Pressable>
            </View>
          )}

          {/* Formulario de Login */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>DNI o Usuario Operario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 46102938 o op.46102938"
              placeholderTextColor="#64748b"
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
              Contraseña Temporal
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: mina2938"
              placeholderTextColor="#64748b"
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
                <ActivityIndicator color="#020617" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#020617" />
                  <Text style={styles.primaryBtnText}>
                    Ingresar a mi Acreditación
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Accesos directos Offline & Modo Garita */}
          <View style={styles.quickActions}>
            <Pressable
              style={styles.offlineButton}
              onPress={handleOpenOfflineBadge}
            >
              <View style={styles.quickIconCircleEmerald}>
                <Ionicons name="qr-code-outline" size={20} color="#34d399" />
              </View>
              <View style={styles.flex}>
                <Text style={styles.offlineButtonTitle}>
                  Ver mi Fotocheck guardado (Offline)
                </Text>
                <Text style={styles.offlineButtonSub}>
                  {hasCachedBadge && cachedOwnerName
                    ? `Disponible sin red: ${cachedOwnerName}`
                    : "Abre tu credencial QR almacenada en el dispositivo"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#34d399" />
            </Pressable>

            <Pressable
              style={styles.gateButton}
              onPress={() => navigation.navigate("GateScanner")}
            >
              <View style={styles.quickIconCircleBlue}>
                <Ionicons name="scan-outline" size={20} color="#38bdf8" />
              </View>
              <View style={styles.flex}>
                <Text style={styles.gateButtonTitle}>Modo Garita</Text>
                <Text style={styles.gateButtonSub}>
                  Escáner nativo QR + Control IA de EPPs (AWS Rekognition)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#38bdf8" />
            </Pressable>
          </View>

          {/* Accesos rápidos de demostración si hay cuentas cargadas */}
          {demoWorkers.length > 0 && (
            <View style={styles.demoSection}>
              <Text style={styles.demoSectionTitle}>
                Cuentas Operario de Prueba Rápida
              </Text>
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
                      {acc.is_authorized ? "AUTORIZADO" : "PENDIENTE"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de configuración IP LAN */}
      <Modal
        visible={lanModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLanModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Configurar Servidor FastAPI (LAN)</Text>
            <Text style={styles.modalDesc}>
              Ingresa la IP WiFi local de la laptop donde se ejecuta el backend
              (`uvicorn app.main:app --host 0.0.0.0 --port 8000`).
            </Text>
            <TextInput
              style={styles.input}
              value={lanInput}
              onChangeText={setLanInput}
              placeholder="http://192.168.1.100:8000"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setLanModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleSaveLanUrl}>
                <Text style={styles.modalSaveText}>Guardar IP</Text>
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
    backgroundColor: "#020617",
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 36,
    gap: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  brandBadgeText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  lanChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    maxWidth: 175,
  },
  lanChipText: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "600",
  },
  heroBlock: {
    marginTop: 4,
    gap: 6,
  },
  title: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 19,
  },
  activeSessionCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f59e0b55",
    gap: 12,
  },
  activeSessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeSessionLabel: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  activeSessionName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  activeSessionMeta: {
    color: "#94a3b8",
    fontSize: 12,
  },
  logoutIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#1e293b",
  },
  continueBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  continueBtnText: {
    color: "#020617",
    fontWeight: "800",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  inputLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  mt14: {
    marginTop: 14,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#020617",
    fontSize: 15,
    fontWeight: "800",
  },
  quickActions: {
    gap: 12,
  },
  offlineButton: {
    backgroundColor: "#062c22",
    borderWidth: 1,
    borderColor: "#10b98155",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickIconCircleEmerald: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#064e3b",
    alignItems: "center",
    justifyContent: "center",
  },
  offlineButtonTitle: {
    color: "#ecfdf5",
    fontSize: 14,
    fontWeight: "700",
  },
  offlineButtonSub: {
    color: "#6ee7b7",
    fontSize: 11,
    marginTop: 2,
  },
  gateButton: {
    backgroundColor: "#082038",
    borderWidth: 1,
    borderColor: "#38bdf855",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickIconCircleBlue: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0c4a6e",
    alignItems: "center",
    justifyContent: "center",
  },
  gateButtonTitle: {
    color: "#f0f9ff",
    fontSize: 14,
    fontWeight: "700",
  },
  gateButtonSub: {
    color: "#7dd3fc",
    fontSize: 11,
    marginTop: 2,
  },
  demoSection: {
    marginTop: 4,
    gap: 8,
  },
  demoSectionTitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  demoChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  demoChip: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: "48%",
  },
  demoChipName: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  demoChipMeta: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.8)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderTopWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
  },
  modalDesc: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#cbd5e1",
    fontWeight: "700",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#38bdf8",
    alignItems: "center",
  },
  modalSaveText: {
    color: "#020617",
    fontWeight: "800",
  },
});

