import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { trabajadorService } from "../services/trabajadorService";
import {
  MedicalAuditResult,
  NativeUploadAsset,
  RootStackParamList,
} from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "MedicalUpload">;

export function MedicalUploadScreen({ navigation, route }: Props) {
  const { worker, syncWorkerState } = useAuth();
  const workerId = route.params.workerId || worker?.id || 0;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<NativeUploadAsset | null>(
    null
  );
  const [mockBehavior, setMockBehavior] = useState<
    "auto" | "mock_apto" | "mock_rechazado"
  >("auto");
  const [uploading, setUploading] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState<{
    valid: boolean;
    summary: string;
    audit?: MedicalAuditResult;
  } | null>(null);

  const openNativeCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Permiso de cámara requerido",
          "Habilita el acceso a la cámara para fotografiar tu Certificado Médico Ocupacional (Anexo 16)."
        );
        return;
      }
    }
    setCameraModalVisible(true);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.82,
      });
      if (photo?.uri) {
        const suffix =
          mockBehavior === "mock_rechazado" ? "falso_emo" : "anexo16_emo";
        setSelectedAsset({
          uri: photo.uri,
          name: `${suffix}_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        });
        setCameraModalVisible(false);
      }
    } catch (err) {
      Alert.alert(
        "Error de captura",
        err instanceof Error ? err.message : "No se pudo capturar la fotografía."
      );
    } finally {
      setCapturing(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        setSelectedAsset({
          uri: doc.uri,
          name: doc.name || `constancia_emo_${Date.now()}.pdf`,
          mimeType: doc.mimeType || "application/pdf",
        });
      }
    } catch (err) {
      Alert.alert(
        "Error al seleccionar archivo",
        err instanceof Error
          ? err.message
          : "No fue posible abrir el selector de documentos."
      );
    }
  };

  const handleUploadToGemini = async () => {
    if (!selectedAsset) {
      Alert.alert(
        "Documento requerido",
        "Captura una fotografía con la cámara o selecciona un PDF/imagen de tu certificado EMO."
      );
      return;
    }

    setUploading(true);
    try {
      const res = await trabajadorService.uploadMedicalCert(
        workerId,
        selectedAsset,
        mockBehavior
      );
      await syncWorkerState(res.worker);
      setAuditFeedback({
        valid: res.ai_validation.valid,
        summary: res.ai_validation.resumen_validacion,
        audit: res.audit_result,
      });

      if (res.worker.is_authorized) {
        Alert.alert(
          "¡Certificado EMO Validado (APTO)!",
          "Google Gemini auditó tu constancia médica con éxito. Tu Fotocheck QR ya está activo y guardado offline.",
          [
            {
              text: "Ver mi Fotocheck QR",
              onPress: () =>
                navigation.navigate("DigitalBadge", { offlineMode: false }),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        "Error en auditoría médica",
        err instanceof Error
          ? err.message
          : "No se pudo enviar el documento al servidor."
      );
    } finally {
      setUploading(false);
    }
  };

  const isImagePreview =
    selectedAsset && selectedAsset.mimeType.startsWith("image/");

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>
              PASO 2 DE 2 · AUDITORÍA IA (GEMINI)
            </Text>
          </View>
          <Text style={styles.title}>Certificado Médico Ocupacional (EMO)</Text>
          <Text style={styles.subtitle}>
            Fotografía o adjunta tu Anexo 16 (DS 024-2016-EM). Google Gemini
            verificará autenticidad, identidad y aptitud médica{" "}
            <Text style={styles.boldEmerald}>APTO</Text>.
          </Text>
        </View>

        {/* Disparadores: Cámara Nativa expo-camera + Selector de archivo */}
        <View style={styles.captureRow}>
          <Pressable style={styles.cameraTriggerBtn} onPress={openNativeCamera}>
            <Ionicons name="camera" size={26} color="#020617" />
            <Text style={styles.cameraTriggerTitle}>Capturar con Cámara</Text>
            <Text style={styles.cameraTriggerSub}>Foto directa al EMO</Text>
          </Pressable>

          <Pressable
            style={styles.fileTriggerBtn}
            onPress={handlePickDocument}
          >
            <Ionicons name="document-attach-outline" size={26} color="#38bdf8" />
            <Text style={styles.fileTriggerTitle}>Elegir Archivo</Text>
            <Text style={styles.fileTriggerSub}>PDF o Imagen</Text>
          </Pressable>
        </View>

        {/* Vista previa del archivo seleccionado */}
        {selectedAsset && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons
                name={isImagePreview ? "image-outline" : "document-text-outline"}
                size={20}
                color="#f59e0b"
              />
              <View style={styles.flex}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {selectedAsset.name}
                </Text>
                <Text style={styles.previewMime}>{selectedAsset.mimeType}</Text>
              </View>
              <Pressable onPress={() => setSelectedAsset(null)}>
                <Ionicons name="close-circle" size={22} color="#94a3b8" />
              </Pressable>
            </View>

            {isImagePreview && (
              <Image
                source={{ uri: selectedAsset.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}
          </View>
        )}

        {/* Selector discreto de escenario IA (útil para demostración con USE_MOCK_AI) */}
        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>Modo de Evaluación IA (Demo / Cloud)</Text>
          <View style={styles.modePills}>
            {(
              [
                { id: "auto", label: "Auto Gemini" },
                { id: "mock_apto", label: "Demo: APTO" },
                { id: "mock_rechazado", label: "Demo: Rechazar" },
              ] as const
            ).map((item) => {
              const active = mockBehavior === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.modePill, active && styles.modePillActive]}
                  onPress={() => setMockBehavior(item.id)}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active && styles.modePillTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Botón de envío multipart/form-data */}
        <Pressable
          style={[
            styles.uploadBtn,
            (!selectedAsset || uploading) && styles.disabledBtn,
          ]}
          onPress={handleUploadToGemini}
          disabled={!selectedAsset || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#020617" />
              <Text style={styles.uploadBtnText}>
                Auditar Certificado con Google Gemini
              </Text>
            </>
          )}
        </Pressable>

        {/* Dictamen estructurado de Gemini */}
        {auditFeedback && (
          <View
            style={[
              styles.verdictCard,
              auditFeedback.valid ? styles.verdictOk : styles.verdictRejected,
            ]}
          >
            <View style={styles.verdictHeader}>
              <Ionicons
                name={
                  auditFeedback.valid ? "shield-checkmark" : "close-circle"
                }
                size={24}
                color={auditFeedback.valid ? "#34d399" : "#f87171"}
              />
              <Text style={styles.verdictTitle}>
                Dictamen IA:{" "}
                {auditFeedback.audit?.aptitude_result ||
                  (auditFeedback.valid ? "APTO" : "RECHAZADO")}
              </Text>
            </View>
            <Text style={styles.verdictSummary}>{auditFeedback.summary}</Text>
            {auditFeedback.audit && (
              <Text style={styles.verdictConfidence}>
                Confianza del modelo:{" "}
                {Math.round((auditFeedback.audit.confidence_score || 0) * 100)}%
              </Text>
            )}
          </View>
        )}

        {/* Acceso al Fotocheck QR si el operario ya está autorizado */}
        {worker?.is_authorized && (
          <Pressable
            style={styles.badgeBtn}
            onPress={() =>
              navigation.navigate("DigitalBadge", { offlineMode: false })
            }
          >
            <Ionicons name="qr-code" size={20} color="#ecfdf5" />
            <Text style={styles.badgeBtnText}>
              Abrir mi Fotocheck QR Autorizado
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Visor de Cámara Nativa expo-camera a pantalla completa */}
      <Modal
        visible={cameraModalVisible}
        animationType="slide"
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing="back"
          />
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <Text style={styles.cameraGuideTitle}>
                Encuadra el Certificado Médico EMO
              </Text>
              <Pressable
                style={styles.cameraCloseBtn}
                onPress={() => setCameraModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#f8fafc" />
              </Pressable>
            </View>

            <View style={styles.documentFrameGuide} />

            <View style={styles.cameraBottomBar}>
              <Pressable
                style={styles.shutterOuter}
                onPress={handleCapturePhoto}
                disabled={capturing}
              >
                {capturing ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </Pressable>
            </View>
          </SafeAreaView>
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
    padding: 18,
    paddingBottom: 36,
    gap: 16,
  },
  headerCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 8,
  },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: "#38bdf822",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#38bdf866",
  },
  stepPillText: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 19,
  },
  boldEmerald: {
    color: "#34d399",
    fontWeight: "800",
  },
  captureRow: {
    flexDirection: "row",
    gap: 12,
  },
  cameraTriggerBtn: {
    flex: 1,
    backgroundColor: "#f59e0b",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  cameraTriggerTitle: {
    color: "#020617",
    fontSize: 14,
    fontWeight: "800",
  },
  cameraTriggerSub: {
    color: "#451a03",
    fontSize: 11,
    fontWeight: "600",
  },
  fileTriggerBtn: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#38bdf855",
  },
  fileTriggerTitle: {
    color: "#f0f9ff",
    fontSize: 14,
    fontWeight: "800",
  },
  fileTriggerSub: {
    color: "#7dd3fc",
    fontSize: 11,
  },
  previewCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewName: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  previewMime: {
    color: "#94a3b8",
    fontSize: 11,
  },
  previewImage: {
    width: "100%",
    height: 210,
    borderRadius: 12,
    backgroundColor: "#020617",
  },
  modeCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 10,
  },
  modeTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modePills: {
    flexDirection: "row",
    gap: 8,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  modePillActive: {
    borderColor: "#f59e0b",
    backgroundColor: "#f59e0b22",
  },
  modePillText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  modePillTextActive: {
    color: "#fbbf24",
  },
  uploadBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: "#020617",
    fontSize: 15,
    fontWeight: "800",
  },
  verdictCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  verdictOk: {
    backgroundColor: "#064e3b88",
    borderColor: "#10b981",
  },
  verdictRejected: {
    backgroundColor: "#450a0a88",
    borderColor: "#ef4444",
  },
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verdictTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },
  verdictSummary: {
    color: "#e2e8f0",
    fontSize: 13,
    lineHeight: 19,
  },
  verdictConfidence: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  badgeBtn: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  badgeBtnText: {
    color: "#ecfdf5",
    fontSize: 15,
    fontWeight: "800",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraPreview: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  cameraTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  cameraGuideTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  cameraCloseBtn: {
    padding: 4,
  },
  documentFrameGuide: {
    alignSelf: "center",
    width: "88%",
    height: "58%",
    borderWidth: 2,
    borderColor: "#f59e0b",
    borderRadius: 18,
    backgroundColor: "transparent",
  },
  cameraBottomBar: {
    alignItems: "center",
    paddingBottom: 16,
  },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#f8fafc",
    borderWidth: 5,
    borderColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#f59e0b",
  },
});
