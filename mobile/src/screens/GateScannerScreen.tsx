import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { CollapsibleTestTools } from "../components/CollapsibleTestTools";
import { GateConnectionModal } from "../components/gate/GateConnectionModal";
import {
  formatEppLabel,
  GateTrafficLight,
} from "../components/gate/GateTrafficLight";
import { getWsUrl } from "../services/apiClient";
import { kioscoService } from "../services/kioscoService";
import { colors, radius, spacing } from "../theme/tokens";
import {
  clearPendingOfflineLogs,
  enqueueOfflineLog,
  getGateOfflineMode,
  getPendingLogsCount,
  getPendingOfflineLogs,
  loadCachedRoster,
  saveCachedRoster,
  setGateOfflineMode,
} from "../utils/offlineStorage";
import {
  CachedWorkerRosterItem,
  EppVerificationResponse,
  Worker,
} from "../types";

type GateStage = "SCAN_QR" | "CAPTURE_EPP" | "SEMAFORO_RESULT";

const DEFAULT_DEMO_ROSTER: CachedWorkerRosterItem[] = [
  {
    worker_id: 1,
    id: 1,
    dni: "45891021",
    full_name: "Carlos Mendoza Prado",
    position: "Técnico Mecánico de Planta",
    company_name: "Contratistas Mineros del Perú S.A.",
    is_authorized: true,
    exam_passed: true,
    exam_score: 100,
    medical_cert_status: "VALIDADA_POR_IA",
    qr_token:
      '{"app":"SAFEMINE_AI","worker_id":1,"dni":"45891021","name":"Carlos Mendoza Prado"}',
    required_epps: ["HEAD_COVER", "HAND_COVER", "FACE_COVER"],
  },
  {
    worker_id: 2,
    id: 2,
    dni: "46102938",
    full_name: "Jorge Quispe Rojas",
    position: "Operador de Volquete 797F",
    company_name: "Contratistas Mineros del Perú S.A.",
    is_authorized: false,
    exam_passed: false,
    exam_score: 40,
    medical_cert_status: "PENDIENTE",
    qr_token:
      '{"app":"SAFEMINE_AI","worker_id":2,"dni":"46102938","name":"Jorge Quispe Rojas"}',
    required_epps: ["HEAD_COVER", "HAND_COVER", "FACE_COVER"],
  },
];

export function GateScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const scanLockRef = useRef<boolean>(false);

  const [facing, setFacing] = useState<CameraType>("back");
  const [stage, setStage] = useState<GateStage>("SCAN_QR");
  const [manualDni, setManualDni] = useState("");
  const [processing, setProcessing] = useState(false);
  const [wsOnline, setWsOnline] = useState(false);

  const [activeWorker, setActiveWorker] = useState<Worker | null>(null);
  const [qrRejectionReasons, setQrRejectionReasons] = useState<string[]>([]);
  const [qrRejectionMessage, setQrRejectionMessage] = useState<string | null>(
    null
  );
  const [eppResult, setEppResult] = useState<EppVerificationResponse | null>(
    null
  );

  // Estados de Operación Offline (Store-and-Forward en Garita)
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [cachedRoster, setCachedRoster] = useState<CachedWorkerRosterItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isUpdatingRoster, setIsUpdatingRoster] = useState<boolean>(false);
  const [connectionModalOpen, setConnectionModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const offline = await getGateOfflineMode();
        const count = await getPendingLogsCount();
        const roster = await loadCachedRoster();
        if (active) {
          setIsOfflineMode(offline);
          setPendingCount(count);
          setCachedRoster(roster);
        }
      } catch {
        // Ignora errores de lectura inicial
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleOfflineMode = async () => {
    const nextVal = !isOfflineMode;
    setIsOfflineMode(nextVal);
    await setGateOfflineMode(nextVal);
    if (nextVal) {
      Alert.alert(
        "Modo sin conexión activado",
        "Las lecturas de QR se validarán con el padrón local y los registros se guardarán en la cola del dispositivo."
      );
    } else {
      Alert.alert(
        "Modo en línea restablecido",
        pendingCount > 0
          ? "Conexión activa. Puedes sincronizar los registros pendientes desde este panel."
          : "Conexión activa con el servidor SafeMine."
      );
    }
  };

  const handleDownloadRoster = async () => {
    setIsUpdatingRoster(true);
    try {
      const roster = await kioscoService.getAuthorizedRoster();
      await saveCachedRoster(roster);
      setCachedRoster(roster);
      Alert.alert(
        "Padrón local actualizado",
        `Se guardaron ${roster.length} operarios en el dispositivo para validación sin conexión.`
      );
    } catch (err) {
      Alert.alert(
        "Error al actualizar padrón",
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor para descargar el padrón."
      );
    } finally {
      setIsUpdatingRoster(false);
    }
  };

  const handleSyncWithAws = async () => {
    const pending = await getPendingOfflineLogs();
    if (pending.length === 0) {
      Alert.alert("Sin pendientes", "No hay registros en cola por sincronizar.");
      return;
    }

    setIsSyncing(true);
    try {
      const res = await kioscoService.syncOfflineLogs(pending);
      await clearPendingOfflineLogs();
      setPendingCount(0);
      Alert.alert(
        "Sincronización completada",
        `${res.synced_count} registro(s) enviados correctamente al servidor.`
      );
    } catch (err) {
      Alert.alert(
        "Error de sincronización",
        err instanceof Error
          ? err.message
          : "No fue posible conectar con el servidor para enviar los registros."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let mounted = true;
    (async () => {
      try {
        const wsUrl = await getWsUrl();
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          if (mounted) setWsOnline(true);
        };
        ws.onclose = () => {
          if (mounted) setWsOnline(false);
        };
        ws.onerror = () => {
          if (mounted) setWsOnline(false);
        };
      } catch {
        if (mounted) setWsOnline(false);
      }
    })();
    return () => {
      mounted = false;
      if (ws) ws.close();
    };
  }, []);

  const resetGateFlow = () => {
    scanLockRef.current = false;
    setActiveWorker(null);
    setQrRejectionReasons([]);
    setQrRejectionMessage(null);
    setEppResult(null);
    setManualDni("");
    setStage("SCAN_QR");
  };

  const evaluateQrPayload = async (rawPayload: string) => {
    if (processing) return;
    setProcessing(true);

    if (isOfflineMode) {
      try {
        const rosterToUse =
          cachedRoster && cachedRoster.length > 0
            ? cachedRoster
            : DEFAULT_DEMO_ROSTER;

        let matched: CachedWorkerRosterItem | undefined = undefined;
        try {
          const parsed = JSON.parse(rawPayload);
          if (parsed && typeof parsed === "object") {
            const wid = parsed.worker_id;
            const dni = parsed.dni;
            matched = rosterToUse.find(
              (w) =>
                (wid && w.worker_id === Number(wid)) ||
                (dni && w.dni === String(dni))
            );
          }
        } catch {
          // Puede ser DNI en texto plano
        }

        if (!matched) {
          const clean = rawPayload.trim();
          matched = rosterToUse.find(
            (w) => w.dni === clean || String(w.worker_id) === clean
          );
        }

        if (!matched) {
          scanLockRef.current = false;
          Alert.alert(
            "No encontrado en padrón local",
            "El QR o DNI no figura en el padrón guardado en este equipo. Actualiza el padrón cuando tengas cobertura."
          );
          return;
        }

        const mappedWorker: Worker = {
          id: matched.worker_id,
          user_id: matched.worker_id,
          proposal_id: 1,
          first_name: matched.full_name.split(" ")[0] || matched.full_name,
          last_name: matched.full_name.split(" ").slice(1).join(" ") || "",
          full_name: matched.full_name,
          dni: matched.dni,
          email: `op.${matched.dni}@safemine.pe`,
          position: matched.position,
          generated_username: `op.${matched.dni}`,
          generated_password: `mina${matched.dni.slice(-4)}`,
          exam_score: matched.exam_score,
          exam_attempts: 1,
          exam_passed: matched.exam_passed,
          medical_cert_filename: null,
          medical_cert_url: null,
          medical_cert_status: matched.medical_cert_status as any,
          medical_ai_feedback: null,
          is_authorized: matched.is_authorized,
          mala_conducta: false,
          mal_trabajo: false,
          no_lleva_epps: false,
          faltas_epp_count: 0,
          observaciones: "",
          qr_payload: matched.qr_token,
        };

        if (!matched.is_authorized) {
          const reasons: string[] = [];
          if (!matched.exam_passed || matched.exam_score < 80) {
            reasons.push(
              `Inducción IPERC no aprobada (${matched.exam_score}/100, mínimo 80)`
            );
          }
          if (matched.medical_cert_status !== "VALIDADA_POR_IA") {
            reasons.push(`Certificado médico (${matched.medical_cert_status})`);
          }
          if (reasons.length === 0) {
            reasons.push("Operario no habilitado en padrón local");
          }

          const offlineLog = {
            worker_id: matched.worker_id,
            worker_name: matched.full_name,
            worker_dni: matched.dni,
            phase: "FASE_1_QR",
            status: "ROJO" as const,
            detected_epps: [],
            missing_epps: reasons,
            missing_items: reasons,
            message: `Acceso denegado (Sin conexión): ${matched.full_name} no está habilitado.`,
            timestamp: new Date().toISOString(),
          };

          const newCount = await enqueueOfflineLog(offlineLog);
          setPendingCount(newCount);

          setActiveWorker(mappedWorker);
          setQrRejectionReasons(reasons);
          setQrRejectionMessage(offlineLog.message);
          setEppResult(null);
          setStage("SEMAFORO_RESULT");
          return;
        }

        // Trabajador autorizado en modo offline
        setActiveWorker(mappedWorker);
        setQrRejectionReasons([]);
        setQrRejectionMessage(null);
        setStage("CAPTURE_EPP");
      } catch (err) {
        scanLockRef.current = false;
        Alert.alert(
          "Error en validación offline",
          err instanceof Error
            ? err.message
            : "No se pudo validar el código en memoria local."
        );
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Modo Online estándar
    try {
      const res = await kioscoService.verifyQr(rawPayload);
      setActiveWorker(res.worker);

      if (!res.authorized) {
        setQrRejectionReasons(res.reasons || []);
        setQrRejectionMessage(res.message);
        setEppResult(null);
        setStage("SEMAFORO_RESULT");
        return;
      }

      setQrRejectionReasons([]);
      setQrRejectionMessage(null);
      setStage("CAPTURE_EPP");
    } catch (err) {
      scanLockRef.current = false;
      Alert.alert(
        "No se pudo validar el QR",
        (err instanceof Error
          ? err.message
          : "No se pudo verificar el código QR.") +
          "\n\n¿Deseas activar el modo sin conexión para trabajar con el padrón local?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Usar modo offline", onPress: handleToggleOfflineMode },
        ]
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (stage !== "SCAN_QR" || scanLockRef.current || processing) return;
    if (!result.data) return;
    scanLockRef.current = true;
    evaluateQrPayload(result.data);
  };

  const handleCaptureAndVerifyEpp = async (simulateMode?: string) => {
    if (!activeWorker || processing) return;
    setProcessing(true);

    if (isOfflineMode) {
      try {
        const isRejected =
          simulateMode === "SIN_EPP" || simulateMode === "mock_sin_epps";
        const detectedEpps = isRejected
          ? ["HEAD_COVER"]
          : ["HEAD_COVER", "HAND_COVER", "FACE_COVER"];
        const missingEpps = isRejected ? ["HAND_COVER", "FACE_COVER"] : [];
        const status = isRejected ? "ROJO" : "VERDE";
        const message = isRejected
          ? `Acceso denegado (Sin conexión). Falta: ${missingEpps
              .map(formatEppLabel)
              .join(", ")}.`
          : "Acceso autorizado en modo sin conexión. EPPs completos.";

        const offlineLog = {
          worker_id: activeWorker.id,
          worker_name: activeWorker.full_name,
          worker_dni: activeWorker.dni,
          phase: "FASE_2_EPP",
          status: status as "VERDE" | "ROJO",
          detected_epps: detectedEpps,
          missing_epps: missingEpps,
          missing_items: missingEpps,
          message,
          timestamp: new Date().toISOString(),
        };

        const newCount = await enqueueOfflineLog(offlineLog);
        setPendingCount(newCount);

        const verification: EppVerificationResponse = {
          status: status as "VERDE" | "ROJO",
          all_epp_present: !isRejected,
          required_epps: ["HEAD_COVER", "HAND_COVER", "FACE_COVER"],
          detected_epps: detectedEpps,
          missing_epps: missingEpps,
          mode: "OFFLINE_STORE_AND_FORWARD",
          confidence_summary: `Validación local: ${detectedEpps.length}/3 EPPs detectados`,
          message,
          worker: activeWorker,
        };

        setEppResult(verification);
        setStage("SEMAFORO_RESULT");
      } catch (err) {
        Alert.alert(
          "Error en registro offline",
          err instanceof Error
            ? err.message
            : "No se pudo guardar el registro en la cola local."
        );
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Modo Online estándar
    try {
      let frameAsset = null;
      if (!simulateMode && cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.72,
          });
          const photoUri = photo?.uri ? String(photo.uri).trim() : "";
          if (photoUri) {
            frameAsset = {
              uri: photoUri,
              name: `garita_epp_${activeWorker.dni}_${Date.now()}.jpg`,
              mimeType: "image/jpeg",
            };
          }
        } catch {
          // Si falla la captura local, el backend gestiona el fallback
        }
      }

      const verification = await kioscoService.verifyEpp({
        workerId: activeWorker.id,
        frameAsset,
        simulateMode,
      });
      setActiveWorker(verification.worker);
      setEppResult(verification);
      setStage("SEMAFORO_RESULT");
    } catch (err) {
      Alert.alert(
        "Error al verificar EPPs",
        err instanceof Error
          ? err.message
          : "No se pudo procesar la verificación de EPPs."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.permIconBox}>
          <Ionicons
            name="videocam-off-outline"
            size={36}
            color={colors.textSecondary}
          />
        </View>
        <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
        <Text style={styles.permDesc}>
          Modo Garita necesita acceso a la cámara para escanear el Fotocheck QR
          y verificar los EPPs del operario.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir cámara</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isGreen = eppResult?.status === "VERDE";
  const showWarningBanner = isOfflineMode || pendingCount > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Barra superior compacta en 1 sola línea */}
          <View style={styles.topBar}>
            <View style={styles.stepStrip}>
              <Text
                style={[
                  styles.stepText,
                  stage === "SCAN_QR" && styles.stepTextActive,
                ]}
              >
                1. QR
              </Text>
              <Text style={styles.stepDot}>·</Text>
              <Text
                style={[
                  styles.stepText,
                  stage === "CAPTURE_EPP" && styles.stepTextActive,
                ]}
              >
                2. EPPs
              </Text>
              <Text style={styles.stepDot}>·</Text>
              <Text
                style={[
                  styles.stepText,
                  stage === "SEMAFORO_RESULT" && styles.stepTextActive,
                ]}
              >
                3. Resultado
              </Text>
            </View>

            <Pressable
              style={[
                styles.statusPill,
                showWarningBanner && styles.statusPillWarning,
              ]}
              onPress={() => setConnectionModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Estado de conexión y padrón"
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isOfflineMode
                      ? colors.warning
                      : pendingCount > 0
                      ? colors.warning
                      : colors.success,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  showWarningBanner && styles.statusPillTextWarning,
                ]}
              >
                {isOfflineMode ? "Offline" : "En línea"}
                {pendingCount > 0 ? ` · ${pendingCount}` : ""}
              </Text>
              <Ionicons
                name="chevron-down"
                size={13}
                color={
                  showWarningBanner ? colors.warningText : colors.textSecondary
                }
              />
            </Pressable>
          </View>

          {/* Banner ámbar discreto únicamente cuando hay modo offline o pendientes */}
          {showWarningBanner && (
            <Pressable
              style={styles.warningBanner}
              onPress={() => setConnectionModalOpen(true)}
            >
              <Ionicons
                name={
                  isOfflineMode
                    ? "cloud-offline-outline"
                    : "cloud-upload-outline"
                }
                size={15}
                color={colors.warningText}
              />
              <Text style={styles.warningBannerText} numberOfLines={1}>
                {isOfflineMode
                  ? `Sin conexión · ${pendingCount} registro(s) en cola`
                  : `${pendingCount} registro(s) pendientes por sincronizar`}
              </Text>
              <Text style={styles.warningBannerAction}>Gestionar</Text>
            </Pressable>
          )}

          {/* Visor de cámara protagonista en Fases 1 y 2 */}
          {stage !== "SEMAFORO_RESULT" && (
            <View style={styles.cameraBox}>
              <CameraView
                ref={cameraRef}
                style={styles.cameraView}
                facing={facing}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={
                  stage === "SCAN_QR" ? handleBarcodeScanned : undefined
                }
              />
              <View style={styles.cameraHud}>
                <View style={styles.cameraTopHud}>
                  <Text style={styles.cameraHudBadge}>
                    {stage === "SCAN_QR"
                      ? "Apunta al Fotocheck QR"
                      : "Encuadra casco, guantes y rostro"}
                  </Text>
                  <Pressable
                    style={styles.flipBtn}
                    onPress={() =>
                      setFacing((prev) => (prev === "back" ? "front" : "back"))
                    }
                    accessibilityLabel="Cambiar cámara"
                  >
                    <Ionicons
                      name="camera-reverse-outline"
                      size={20}
                      color={colors.onDark}
                    />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.reticle,
                    stage === "CAPTURE_EPP" && styles.reticleEpp,
                  ]}
                />

                <Text style={styles.cameraBottomHint}>
                  {stage === "SCAN_QR"
                    ? processing
                      ? "Verificando código QR..."
                      : "Escaneo automático activo"
                    : `${activeWorker?.full_name || "Operario"} · DNI ${
                        activeWorker?.dni || ""
                      }`}
                </Text>
              </View>
            </View>
          )}

          {/* Fase 1: Acceso compacto a ingreso manual por DNI */}
          {stage === "SCAN_QR" && (
            <View style={styles.manualCard}>
              <TextInput
                style={styles.manualInput}
                placeholder="Ingreso manual por DNI (ej. 45891021)"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={manualDni}
                onChangeText={setManualDni}
              />
              <Pressable
                style={[
                  styles.manualBtn,
                  (!manualDni.trim() || processing) && styles.disabledBtn,
                ]}
                disabled={!manualDni.trim() || processing}
                onPress={() => {
                  scanLockRef.current = true;
                  evaluateQrPayload(manualDni.trim());
                }}
              >
                {processing ? (
                  <ActivityIndicator color={colors.onAccent} size="small" />
                ) : (
                  <Text style={styles.manualBtnText}>Validar</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Fase 2: Resumen limpio del operario + único CTA primario + simulación oculta */}
          {stage === "CAPTURE_EPP" && activeWorker && (
            <View style={styles.eppPanel}>
              <View style={styles.workerRow}>
                <View style={styles.workerAvatar}>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={colors.success}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.workerName} numberOfLines={1}>
                    {activeWorker.full_name}
                  </Text>
                  <Text style={styles.workerMeta} numberOfLines={1}>
                    DNI {activeWorker.dni} · {activeWorker.position}
                  </Text>
                </View>
                <Pressable
                  style={styles.resetIconBtn}
                  onPress={resetGateFlow}
                  accessibilityLabel="Volver a escanear QR"
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Pressable
                style={[styles.primaryBtn, processing && styles.disabledBtn]}
                onPress={() => handleCaptureAndVerifyEpp()}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <>
                    <Ionicons
                      name="camera-outline"
                      size={20}
                      color={colors.onAccent}
                    />
                    <Text style={styles.primaryBtnText}>
                      Capturar y verificar EPPs
                    </Text>
                  </>
                )}
              </Pressable>

              <CollapsibleTestTools title="Opciones de simulación">
                <View style={styles.simRow}>
                  <Pressable
                    style={styles.simBtn}
                    disabled={processing}
                    onPress={() => handleCaptureAndVerifyEpp("CON_EPP")}
                  >
                    <Text style={styles.simBtnText}>Simular EPPs OK</Text>
                  </Pressable>
                  <Pressable
                    style={styles.simBtn}
                    disabled={processing}
                    onPress={() => handleCaptureAndVerifyEpp("SIN_EPP")}
                  >
                    <Text style={styles.simBtnText}>Simular Falta EPP</Text>
                  </Pressable>
                </View>
              </CollapsibleTestTools>
            </View>
          )}

          {/* Fase 3: Semáforo VERDE / ROJO extraído */}
          {stage === "SEMAFORO_RESULT" && (
            <GateTrafficLight
              isGreen={isGreen}
              activeWorker={activeWorker}
              eppResult={eppResult}
              qrRejectionMessage={qrRejectionMessage}
              qrRejectionReasons={qrRejectionReasons}
              isOfflineMode={isOfflineMode}
              pendingCount={pendingCount}
              onRetryEpp={() => {
                setEppResult(null);
                setStage("CAPTURE_EPP");
              }}
              onNextWorker={resetGateFlow}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <GateConnectionModal
        visible={connectionModalOpen}
        onClose={() => setConnectionModalOpen(false)}
        isOfflineMode={isOfflineMode}
        wsOnline={wsOnline}
        pendingCount={pendingCount}
        cachedRosterCount={cachedRoster.length}
        isUpdatingRoster={isUpdatingRoster}
        isSyncing={isSyncing}
        onToggleOfflineMode={handleToggleOfflineMode}
        onDownloadRoster={handleDownloadRoster}
        onSyncWithAws={handleSyncWithAws}
      />
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
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: spacing.md,
  },
  permIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  permTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  permDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  permBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  permBtnText: {
    color: colors.onAccent,
    fontWeight: "700",
    fontSize: 14,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 28,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  stepStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  stepText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  stepTextActive: {
    color: colors.accentText,
    fontWeight: "800",
  },
  stepDot: {
    color: colors.borderStrong,
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statusPillWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  statusPillTextWarning: {
    color: colors.warningText,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  warningBannerText: {
    flex: 1,
    color: colors.warningText,
    fontSize: 12,
    fontWeight: "600",
  },
  warningBannerAction: {
    color: colors.warningText,
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  cameraBox: {
    height: 360,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cameraBg,
  },
  cameraView: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  cameraHud: {
    flex: 1,
    justifyContent: "space-between",
    padding: 14,
  },
  cameraTopHud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  cameraHudBadge: {
    backgroundColor: colors.cameraOverlay,
    color: colors.onDark,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  flipBtn: {
    backgroundColor: colors.cameraOverlay,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    alignSelf: "center",
    width: 204,
    height: 204,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  reticleEpp: {
    width: "86%",
    height: 224,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  cameraBottomHint: {
    alignSelf: "center",
    backgroundColor: colors.cameraOverlay,
    color: colors.onDark,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  manualCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  manualBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  manualBtnText: {
    color: colors.onAccent,
    fontWeight: "700",
    fontSize: 13,
  },
  eppPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  workerName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  workerMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  resetIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
  },
  simRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  simBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  simBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
