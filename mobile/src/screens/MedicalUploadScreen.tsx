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
import { CollapsibleTestTools } from "../components/CollapsibleTestTools";
import { StepHeader } from "../components/StepHeader";
import { useAuth } from "../context/AuthContext";
import { trabajadorService } from "../services/trabajadorService";
import { colors, radius, spacing } from "../theme/tokens";
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
      const photoUri = photo?.uri ? String(photo.uri).trim() : "";
      if (photoUri) {
        const suffix =
          mockBehavior === "mock_rechazado" ? "falso_emo" : "anexo16_emo";
        setSelectedAsset({
          uri: photoUri,
          name: `${suffix}_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        });
        setCameraModalVisible(false);
      } else {
        Alert.alert(
          "Error de captura",
          "No se obtuvo una ruta válida de la fotografía capturada. Intenta nuevamente."
        );
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
        const docUri = doc?.uri ? String(doc.uri).trim() : "";
        if (!docUri) {
          Alert.alert(
            "Archivo inválido",
            "No se pudo leer la ruta (URI) del archivo seleccionado. Intenta elegir otro documento."
          );
          return;
        }
        const safeName = String(
          doc.name || `constancia_emo_${Date.now()}.pdf`
        );
        const lowerName = safeName.toLowerCase();
        const inferredMime =
          doc.mimeType ||
          (lowerName.endsWith(".png")
            ? "image/png"
            : lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")
            ? "image/jpeg"
            : lowerName.endsWith(".webp")
            ? "image/webp"
            : "application/pdf");
        setSelectedAsset({
          uri: docUri,
          name: safeName,
          mimeType: String(inferredMime),
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
    if (!selectedAsset || !String(selectedAsset.uri || "").trim()) {
      Alert.alert(
        "Documento requerido",
        "Captura una fotografía con la cámara o selecciona un PDF/imagen válido de tu certificado EMO."
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
          "Certificado EMO validado (APTO)",
          "Tu constancia médica fue aprobada. Tu Fotocheck QR ya está disponible incluso sin conexión.",
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
  const isAuthorized = Boolean(worker?.is_authorized);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <StepHeader currentStep={2} />

        {/* Introducción */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>Certificado Médico Ocupacional</Text>
          <Text style={styles.subtitle}>
            Fotografía o adjunta tu Anexo 16 (DS 024-2016-EM) en PDF o imagen
            para validar tu aptitud médica.
          </Text>
        </View>

        {/* Estado ya autorizado */}
        {isAuthorized && !selectedAsset && (
          <View style={styles.authorizedCard}>
            <View style={styles.authorizedHeader}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.success}
              />
              <Text style={styles.authorizedTitle}>
                Certificado EMO validado (APTO)
              </Text>
            </View>
            <Text style={styles.authorizedDesc}>
              Tu acreditación está completa. Ya puedes abrir tu Fotocheck QR.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() =>
                navigation.navigate("DigitalBadge", { offlineMode: false })
              }
            >
              <Ionicons name="qr-code" size={18} color={colors.onAccent} />
              <Text style={styles.primaryBtnText}>
                Abrir mi Fotocheck QR
              </Text>
            </Pressable>
          </View>
        )}

        {/* Estado A: Sin documento adjunto -> opciones claras de captura */}
        {!selectedAsset ? (
          <View style={styles.captureCard}>
            <Text style={styles.sectionLabel}>
              {isAuthorized
                ? "ACTUALIZAR DOCUMENTO (OPCIONAL)"
                : "ADJUNTA TU CONSTANCIA EMO"}
            </Text>

            <Pressable
              style={isAuthorized ? styles.secondaryBtn : styles.primaryBtn}
              onPress={openNativeCamera}
            >
              <Ionicons
                name="camera-outline"
                size={20}
                color={isAuthorized ? colors.textPrimary : colors.onAccent}
              />
              <Text
                style={
                  isAuthorized
                    ? styles.secondaryBtnText
                    : styles.primaryBtnText
                }
              >
                Tomar foto con cámara
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={handlePickDocument}>
              <Ionicons
                name="document-attach-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.secondaryBtnText}>
                Elegir archivo (PDF o imagen)
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Estado B: Documento adjunto -> vista previa + único CTA primario */
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIconBox}>
                <Ionicons
                  name={
                    isImagePreview ? "image-outline" : "document-text-outline"
                  }
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {selectedAsset.name}
                </Text>
                <Text style={styles.previewMime}>{selectedAsset.mimeType}</Text>
              </View>
              <Pressable
                onPress={() => setSelectedAsset(null)}
                accessibilityLabel="Quitar archivo"
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {isImagePreview && (
              <Image
                source={{ uri: selectedAsset.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.replaceRow}>
              <Pressable style={styles.replaceLink} onPress={openNativeCamera}>
                <Ionicons
                  name="camera-outline"
                  size={15}
                  color={colors.textSecondary}
                />
                <Text style={styles.replaceLinkText}>Tomar otra foto</Text>
              </Pressable>
              <Pressable
                style={styles.replaceLink}
                onPress={handlePickDocument}
              >
                <Ionicons
                  name="document-outline"
                  size={15}
                  color={colors.textSecondary}
                />
                <Text style={styles.replaceLinkText}>Cambiar archivo</Text>
              </Pressable>
            </View>

            {isAuthorized && auditFeedback?.valid ? (
              <Pressable
                style={styles.primaryBtn}
                onPress={() =>
                  navigation.navigate("DigitalBadge", { offlineMode: false })
                }
              >
                <Ionicons name="qr-code" size={18} color={colors.onAccent} />
                <Text style={styles.primaryBtnText}>
                  Abrir mi Fotocheck QR
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.primaryBtn, uploading && styles.disabledBtn]}
                onPress={handleUploadToGemini}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={colors.onAccent}
                    />
                    <Text style={styles.primaryBtnText}>
                      Validar certificado EMO
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Dictamen estructurado */}
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
                  auditFeedback.valid ? "checkmark-circle" : "close-circle"
                }
                size={22}
                color={auditFeedback.valid ? colors.success : colors.danger}
              />
              <Text
                style={[
                  styles.verdictTitle,
                  {
                    color: auditFeedback.valid
                      ? colors.successText
                      : colors.dangerText,
                  },
                ]}
              >
                Resultado:{" "}
                {auditFeedback.audit?.aptitude_result ||
                  (auditFeedback.valid ? "APTO" : "RECHAZADO")}
              </Text>
            </View>
            <Text style={styles.verdictSummary}>{auditFeedback.summary}</Text>
            {auditFeedback.audit && (
              <Text style={styles.verdictConfidence}>
                Confianza de lectura:{" "}
                {Math.round((auditFeedback.audit.confidence_score || 0) * 100)}%
              </Text>
            )}
          </View>
        )}

        {/* Selector de prueba oculto por defecto */}
        <CollapsibleTestTools title="Opciones de prueba (Evaluación IA)">
          <Text style={styles.testHint}>
            Selecciona el modo de respuesta del backend para pruebas:
          </Text>
          <View style={styles.modePills}>
            {(
              [
                { id: "auto", label: "Automático" },
                { id: "mock_apto", label: "Simular APTO" },
                { id: "mock_rechazado", label: "Simular Rechazo" },
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
        </CollapsibleTestTools>
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
                Encuadra tu Certificado Médico EMO
              </Text>
              <Pressable
                style={styles.cameraCloseBtn}
                onPress={() => setCameraModalVisible(false)}
                accessibilityLabel="Cerrar cámara"
              >
                <Ionicons name="close" size={24} color={colors.onDark} />
              </Pressable>
            </View>

            <View style={styles.documentFrameGuide} />

            <View style={styles.cameraBottomBar}>
              <Pressable
                style={styles.shutterOuter}
                onPress={handleCapturePhoto}
                disabled={capturing}
                accessibilityLabel="Tomar fotografía"
              >
                {capturing ? (
                  <ActivityIndicator color={colors.textPrimary} />
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
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 36,
    gap: 14,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  authorizedCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    gap: spacing.sm,
  },
  authorizedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  authorizedTitle: {
    color: colors.successText,
    fontSize: 15,
    fontWeight: "800",
  },
  authorizedDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  captureCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
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
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
  disabledBtn: {
    opacity: 0.6,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  previewMime: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replaceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  replaceLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  replaceLinkText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  verdictCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: 6,
  },
  verdictOk: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  verdictRejected: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  verdictTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  verdictSummary: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  verdictConfidence: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  testHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  modePills: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  modePillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  modePillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  modePillTextActive: {
    color: colors.accentText,
    fontWeight: "700",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: colors.cameraBg,
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
    padding: spacing.xl,
  },
  cameraTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cameraOverlay,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  cameraGuideTitle: {
    color: colors.onDark,
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
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radius.lg,
    backgroundColor: "transparent",
  },
  cameraBottomBar: {
    alignItems: "center",
    paddingBottom: spacing.lg,
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 3,
    borderColor: colors.onDark,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.onDark,
  },
});
