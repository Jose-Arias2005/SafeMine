import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getWsUrl } from "../services/apiClient";
import { kioscoService } from "../services/kioscoService";
import { EppVerificationResponse, Worker } from "../types";

type GateStage = "SCAN_QR" | "CAPTURE_EPP" | "SEMAFORO_RESULT";

const EPP_LABELS: Record<string, string> = {
  HEAD_COVER: "Casco de Seguridad (HEAD_COVER)",
  HAND_COVER: "Guantes Protectores (HAND_COVER)",
  FACE_COVER: "Protección Facial / Lentes (FACE_COVER)",
};

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
        "QR No Reconocido",
        err instanceof Error
          ? err.message
          : "No se pudo verificar el código QR en el padrón."
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
    try {
      let frameAsset = null;
      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.72,
          });
          if (photo?.uri) {
            frameAsset = {
              uri: photo.uri,
              name: `garita_epp_${activeWorker.dni}_${Date.now()}.jpg`,
              mimeType: "image/jpeg",
            };
          }
        } catch {
          // Si se usa botón de simulación rápida sin cámara lista, continúa con simulateMode
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
        "Error en verificación Rekognition",
        err instanceof Error
          ? err.message
          : "No se pudo procesar el fotograma de EPPs."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="videocam-off-outline" size={52} color="#38bdf8" />
        <Text style={styles.permTitle}>Acceso a Cámara para Garita IA</Text>
        <Text style={styles.permDesc}>
          Modo Garita utiliza `expo-camera` para escanear el Fotocheck QR del
          operario y capturar fotogramas de EPPs hacia AWS Rekognition.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Conceder Permiso de Cámara</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isGreen = eppResult?.status === "VERDE";

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Barra de estado Garita + WebSocket */}
        <View style={styles.statusRow}>
          <View style={styles.stageTabs}>
            <View
              style={[
                styles.stagePill,
                stage === "SCAN_QR" && styles.stagePillActiveBlue,
              ]}
            >
              <Text style={styles.stagePillText}>1. QR</Text>
            </View>
            <View
              style={[
                styles.stagePill,
                stage === "CAPTURE_EPP" && styles.stagePillActiveAmber,
              ]}
            >
              <Text style={styles.stagePillText}>2. EPPs IA</Text>
            </View>
            <View
              style={[
                styles.stagePill,
                stage === "SEMAFORO_RESULT" && styles.stagePillActiveEmerald,
              ]}
            >
              <Text style={styles.stagePillText}>3. Semáforo</Text>
            </View>
          </View>

          <View style={styles.wsBadge}>
            <View
              style={[
                styles.wsDot,
                { backgroundColor: wsOnline ? "#34d399" : "#64748b" },
              ]}
            />
            <Text style={styles.wsText}>
              {wsOnline ? "WS Garita" : "HTTP"}
            </Text>
          </View>
        </View>

        {/* Visor de cámara nativa en etapas 1 y 2 */}
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
                    ? "FASE 1 · APUNTA AL FOTOCHECK QR"
                    : "FASE 2 · ENCUADRA CASCO, GUANTES Y ROSTRO"}
                </Text>
                <Pressable
                  style={styles.flipBtn}
                  onPress={() =>
                    setFacing((prev) => (prev === "back" ? "front" : "back"))
                  }
                >
                  <Ionicons name="camera-reverse" size={20} color="#f8fafc" />
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
                  ? "Decodificación óptica instantánea con expo-camera"
                  : `Operario identificado: ${activeWorker?.full_name}`}
              </Text>
            </View>
          </View>
        )}

        {/* Controles específicos de FASE 1: Ingreso manual alternativo por DNI */}
        {stage === "SCAN_QR" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Verificación Manual por DNI (Respaldo)
            </Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="DNI del operario (ej. 45892310)"
                placeholderTextColor="#64748b"
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
                  <ActivityIndicator color="#020617" size="small" />
                ) : (
                  <Text style={styles.manualBtnText}>Validar</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Controles específicos de FASE 2: Disparo hacia AWS Rekognition */}
        {stage === "CAPTURE_EPP" && activeWorker && (
          <View style={styles.card}>
            <View style={styles.workerBanner}>
              <Ionicons name="person-circle" size={34} color="#34d399" />
              <View style={styles.flex}>
                <Text style={styles.workerBannerName}>
                  {activeWorker.full_name}
                </Text>
                <Text style={styles.workerBannerMeta}>
                  DNI {activeWorker.dni} · {activeWorker.position}
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.captureEppBtn, processing && styles.disabledBtn]}
              onPress={() => handleCaptureAndVerifyEpp()}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#020617" />
              ) : (
                <>
                  <Ionicons name="aperture" size={22} color="#020617" />
                  <Text style={styles.captureEppBtnText}>
                    Capturar Fotograma y Auditar EPPs (Rekognition)
                  </Text>
                </>
              )}
            </Pressable>

            {/* Botones discretos de simulación para pruebas en campo */}
            <View style={styles.simRow}>
              <Pressable
                style={styles.simGreenBtn}
                disabled={processing}
                onPress={() => handleCaptureAndVerifyEpp("CON_EPP")}
              >
                <Text style={styles.simGreenText}>Simular EPPs OK</Text>
              </Pressable>
              <Pressable
                style={styles.simRedBtn}
                disabled={processing}
                onPress={() => handleCaptureAndVerifyEpp("SIN_EPP")}
              >
                <Text style={styles.simRedText}>Simular Falta EPP</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* FASE 3: SEMÁFORO DE DECISIÓN (VERDE / ROJO) */}
        {stage === "SEMAFORO_RESULT" && (
          <View
            style={[
              styles.semaforoCard,
              isGreen ? styles.semaforoGreen : styles.semaforoRed,
            ]}
          >
            {/* Luces del semáforo industrial */}
            <View style={styles.trafficHousing}>
              <View
                style={[
                  styles.trafficLamp,
                  !isGreen ? styles.lampRedOn : styles.lampOff,
                ]}
              />
              <View
                style={[
                  styles.trafficLamp,
                  isGreen ? styles.lampGreenOn : styles.lampOff,
                ]}
              />
            </View>

            <Text style={styles.semaforoStatusTitle}>
              {isGreen ? "SEMÁFORO VERDE · PASE" : "SEMÁFORO ROJO · ALTO"}
            </Text>

            <Text style={styles.semaforoMessage}>
              {eppResult?.message ||
                qrRejectionMessage ||
                "Acceso Denegado en Control de Garita."}
            </Text>

            {activeWorker && (
              <View style={styles.semaforoWorkerBox}>
                <Text style={styles.semaforoWorkerName}>
                  {activeWorker.full_name}
                </Text>
                <Text style={styles.semaforoWorkerMeta}>
                  DNI {activeWorker.dni} · Faltas EPP acumuladas:{" "}
                  {activeWorker.faltas_epp_count}
                </Text>
              </View>
            )}

            {/* Motivos de bloqueo en Fase 1 (QR no acreditado) */}
            {qrRejectionReasons.length > 0 && (
              <View style={styles.missingBox}>
                <Text style={styles.missingTitle}>
                  Requisitos de Acreditación Incumplidos:
                </Text>
                {qrRejectionReasons.map((reason, idx) => (
                  <Text key={idx} style={styles.missingItem}>
                    • {reason}
                  </Text>
                ))}
              </View>
            )}

            {/* Lista exacta de EPPs faltantes devuelta por AWS Rekognition */}
            {eppResult && eppResult.missing_epps.length > 0 && (
              <View style={styles.missingBox}>
                <Text style={styles.missingTitle}>
                  EPPs Faltantes Detectados por Cámara IA:
                </Text>
                {eppResult.missing_epps.map((code) => (
                  <View key={code} style={styles.missingRow}>
                    <Ionicons name="warning" size={16} color="#fecaca" />
                    <Text style={styles.missingItem}>
                      {EPP_LABELS[code] || code}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Lista de EPPs validados */}
            {eppResult && eppResult.detected_epps.length > 0 && (
              <View style={styles.detectedWrap}>
                {eppResult.detected_epps.map((code) => (
                  <View key={code} style={styles.detectedChip}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#6ee7b7"
                    />
                    <Text style={styles.detectedChipText}>{code}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.resultActions}>
              {activeWorker?.is_authorized && !isGreen && (
                <Pressable
                  style={styles.retryEppBtn}
                  onPress={() => {
                    setEppResult(null);
                    setStage("CAPTURE_EPP");
                  }}
                >
                  <Ionicons name="refresh" size={18} color="#f8fafc" />
                  <Text style={styles.retryEppText}>Reintentar Cámara EPP</Text>
                </Pressable>
              )}

              <Pressable style={styles.nextWorkerBtn} onPress={resetGateFlow}>
                <Ionicons name="qr-code-outline" size={18} color="#020617" />
                <Text style={styles.nextWorkerText}>
                  Escanear Siguiente Operario
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
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
  centered: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    gap: 12,
  },
  permTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  permDesc: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  permBtn: {
    marginTop: 8,
    backgroundColor: "#38bdf8",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
  },
  permBtnText: {
    color: "#020617",
    fontWeight: "800",
    fontSize: 14,
  },
  container: {
    padding: 16,
    paddingBottom: 34,
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageTabs: {
    flexDirection: "row",
    gap: 6,
  },
  stagePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  stagePillActiveBlue: {
    backgroundColor: "#0369a1",
    borderColor: "#38bdf8",
  },
  stagePillActiveAmber: {
    backgroundColor: "#b45309",
    borderColor: "#f59e0b",
  },
  stagePillActiveEmerald: {
    backgroundColor: "#047857",
    borderColor: "#34d399",
  },
  stagePillText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
  },
  wsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  wsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wsText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "700",
  },
  cameraBox: {
    height: 360,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#1e293b",
    backgroundColor: "#000",
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
  },
  cameraHudBadge: {
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  flipBtn: {
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    padding: 8,
    borderRadius: 999,
  },
  reticle: {
    alignSelf: "center",
    width: 210,
    height: 210,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#38bdf8",
  },
  reticleEpp: {
    width: "86%",
    height: 230,
    borderColor: "#f59e0b",
  },
  cameraBottomHint: {
    alignSelf: "center",
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 12,
  },
  cardTitle: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  manualRow: {
    flexDirection: "row",
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14,
  },
  manualBtn: {
    backgroundColor: "#38bdf8",
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  manualBtnText: {
    color: "#020617",
    fontWeight: "800",
    fontSize: 13,
  },
  workerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#020617",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#10b98144",
  },
  workerBannerName: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
  },
  workerBannerMeta: {
    color: "#94a3b8",
    fontSize: 12,
  },
  captureEppBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  captureEppBtnText: {
    color: "#020617",
    fontSize: 14,
    fontWeight: "900",
  },
  simRow: {
    flexDirection: "row",
    gap: 10,
  },
  simGreenBtn: {
    flex: 1,
    backgroundColor: "#064e3b",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#10b98155",
  },
  simGreenText: {
    color: "#6ee7b7",
    fontSize: 12,
    fontWeight: "700",
  },
  simRedBtn: {
    flex: 1,
    backgroundColor: "#450a0a",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef444455",
  },
  simRedText: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "700",
  },
  semaforoCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    alignItems: "center",
    gap: 14,
  },
  semaforoGreen: {
    backgroundColor: "#042f2e",
    borderColor: "#10b981",
  },
  semaforoRed: {
    backgroundColor: "#450a0a",
    borderColor: "#ef4444",
  },
  trafficHousing: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: "#020617",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  trafficLamp: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  lampRedOn: {
    backgroundColor: "#ef4444",
  },
  lampGreenOn: {
    backgroundColor: "#10b981",
  },
  lampOff: {
    backgroundColor: "#1e293b",
  },
  semaforoStatusTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  semaforoMessage: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  semaforoWorkerBox: {
    width: "100%",
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  semaforoWorkerName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  semaforoWorkerMeta: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },
  missingBox: {
    width: "100%",
    backgroundColor: "rgba(2, 6, 23, 0.65)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f8717166",
    gap: 6,
  },
  missingTitle: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "800",
  },
  missingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  missingItem: {
    color: "#fee2e2",
    fontSize: 13,
    fontWeight: "700",
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
    backgroundColor: "rgba(6, 78, 59, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  detectedChipText: {
    color: "#d1fae5",
    fontSize: 11,
    fontWeight: "800",
  },
  resultActions: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  retryEppBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retryEppText: {
    color: "#f8fafc",
    fontWeight: "800",
    fontSize: 14,
  },
  nextWorkerBtn: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextWorkerText: {
    color: "#020617",
    fontWeight: "900",
    fontSize: 14,
  },
});
