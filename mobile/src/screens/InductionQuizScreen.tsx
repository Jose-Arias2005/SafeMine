import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { CollapsibleTestTools } from "../components/CollapsibleTestTools";
import { StepHeader } from "../components/StepHeader";
import { useAuth } from "../context/AuthContext";
import { trabajadorService } from "../services/trabajadorService";
import { colors, radius, spacing } from "../theme/tokens";
import { ExamQuestion, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "InductionQuiz">;

const FALLBACK_IPERC_QUESTIONS: ExamQuestion[] = [
  {
    id: 1,
    question:
      "1. ¿Cuál es el equipo de protección personal (EPP) obligatorio para ingresar a la zona operativa de Planta y Mina?",
    options: [
      "Solo chaleco reflectivo",
      "Casco de seguridad con barbiquejo, guantes de seguridad, lentes/protección facial y botas con punta de acero",
      "Gorra común y guantes de tela únicamente",
      "El EPP es opcional en turnos cortos",
    ],
  },
  {
    id: 2,
    question:
      "2. ¿Qué herramienta de gestión de seguridad (DS 024-2016-EM) debe elaborarse obligatoriamente ANTES de iniciar cualquier tarea en mina?",
    options: [
      "Solo firmar asistencia a la salida del turno",
      "IPERC Continuo (Identificación de Peligros, Evaluación de Riesgos y Medidas de Control) y PETAR si es alto riesgo",
      "Ninguna si el trabajador tiene más de 1 año de experiencia",
      "Pedir autorización verbal a un compañero",
    ],
  },
  {
    id: 3,
    question:
      "3. Si durante el control en Garita con cámara IA se detecta que NO llevas tus EPPs completos, ¿qué sucede según el reglamento SafeMine?",
    options: [
      "Se permite el ingreso con una advertencia verbal",
      "Se activa la alerta ROJA en garita, se deniega el acceso físico y se registra automáticamente la falta en tu ficha de evaluación",
      "Solo se descuenta 5 minutos de refrigerio",
      "El sistema ignora la falta si llevas tu fotocheck QR",
    ],
  },
  {
    id: 4,
    question:
      "4. En trabajos de mantenimiento eléctrico o mecánico en molinos/chancadoras, ¿qué procedimiento garantiza energía cero?",
    options: [
      "Avisar por radio que no prendan la máquina",
      "Bloqueo y Etiquetado (LOTOTO - Lockout / Tagout / Tryout) con candado personal y prueba de energía cero",
      "Apagar solo el interruptor de iluminación",
      "Dejar una señal de cartón cerca del tablero",
    ],
  },
  {
    id: 5,
    question:
      "5. ¿Cuál es la nota mínima obligatoria en esta evaluación de inducción y el requisito médico para desbloquear tu Fotocheck QR?",
    options: [
      "Nota mínima 50/100 y declaración jurada simple",
      "Nota mínima 80/100 (>= 80%) y Constancia Médica Ocupacional validada como APTO por IA",
      "Nota mínima 60/100 sin examen médico",
      "Basta con estar en la lista del proveedor",
    ],
  },
];

export function InductionQuizScreen({ navigation, route }: Props) {
  const { worker, syncWorkerState } = useAuth();
  const workerId = route.params.workerId || worker?.id || 0;

  const [questions, setQuestions] = useState<ExamQuestion[]>(
    FALLBACK_IPERC_QUESTIONS
  );
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    {}
  );
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    passed: boolean;
    score: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await trabajadorService.getExamQuestions();
        if (active && res.questions?.length > 0) {
          setQuestions(res.questions);
        }
      } catch {
        // Mantiene preguntas IPERC locales sincronizadas si hay latencia de red
      } finally {
        if (active) setLoadingQuestions(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const submitAnswerArray = async (answersArray: number[]) => {
    if (!workerId) {
      Alert.alert("Sesión inválida", "Vuelve a iniciar sesión con tu DNI.");
      navigation.replace("Login");
      return;
    }

    setSubmitting(true);
    try {
      const res = await trabajadorService.submitExam(workerId, answersArray);
      await syncWorkerState(res.worker);
      setLastResult({
        passed: res.passed,
        score: res.score,
        message: res.message,
      });

      if (res.passed) {
        Alert.alert(
          `Inducción aprobada (${res.score}%)`,
          "Superaste la nota mínima (80%). Ya puedes continuar al Paso 2: Certificado Médico EMO.",
          [
            {
              text: "Continuar al Paso 2",
              onPress: () =>
                navigation.navigate("MedicalUpload", { workerId }),
            },
          ]
        );
      } else {
        Alert.alert(
          `Nota insuficiente (${res.score}%)`,
          "Se requiere al menos 80% para pasar al certificado médico. Revisa tus respuestas e inténtalo nuevamente."
        );
      }
    } catch (err) {
      Alert.alert(
        "Error al enviar evaluación",
        err instanceof Error ? err.message : "No se pudo calificar el examen."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = () => {
    const missing = questions.some((_, idx) => selectedAnswers[idx] === undefined);
    if (missing) {
      Alert.alert(
        "Preguntas pendientes",
        "Responde todas las preguntas de seguridad minera antes de enviar."
      );
      return;
    }
    const ordered = questions.map((_, idx) => selectedAnswers[idx]);
    submitAnswerArray(ordered);
  };

  const handleQuickDemo = (mode: "PASS_100" | "FAIL_60") => {
    const preset =
      mode === "PASS_100"
        ? questions.map(() => 1)
        : questions.map((_, idx) => (idx < 3 ? 1 : 0));

    const mapped: Record<number, number> = {};
    preset.forEach((ans, idx) => {
      mapped[idx] = ans;
    });
    setSelectedAnswers(mapped);
    submitAnswerArray(preset);
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPct =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isUnlocked = Boolean(
    (worker?.exam_passed && (worker?.exam_score ?? 0) >= 80) ||
      (lastResult?.passed && lastResult.score >= 80)
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <StepHeader currentStep={1} />

        {/* Cabecera normativa */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Evaluación IPERC</Text>
            <Text style={styles.progressCount}>
              {answeredCount}/{questions.length}
            </Text>
          </View>
          <Text style={styles.headerDesc}>
            DS 024-2016-EM · Obtén al menos{" "}
            <Text style={styles.boldText}>80%</Text> para habilitar la carga de
            tu Certificado Médico Ocupacional.
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>
        </View>

        {/* Resultado reciente */}
        {lastResult && (
          <View
            style={[
              styles.resultBanner,
              lastResult.passed ? styles.resultPass : styles.resultFail,
            ]}
          >
            <Ionicons
              name={lastResult.passed ? "checkmark-circle" : "alert-circle"}
              size={22}
              color={lastResult.passed ? colors.success : colors.danger}
            />
            <View style={styles.flex}>
              <Text
                style={[
                  styles.resultScoreText,
                  {
                    color: lastResult.passed
                      ? colors.successText
                      : colors.dangerText,
                  },
                ]}
              >
                Puntaje obtenido: {lastResult.score}%
              </Text>
              <Text style={styles.resultMsgText}>{lastResult.message}</Text>
            </View>
          </View>
        )}

        {loadingQuestions ? (
          <ActivityIndicator
            color={colors.accent}
            size="large"
            style={{ marginVertical: 24 }}
          />
        ) : (
          questions.map((q, qIdx) => (
            <View key={q.id} style={styles.questionCard}>
              <Text style={styles.questionTitle}>{q.question}</Text>
              <View style={styles.optionsList}>
                {q.options.map((opt, optIdx) => {
                  const selected = selectedAnswers[qIdx] === optIdx;
                  return (
                    <Pressable
                      key={optIdx}
                      style={[
                        styles.optionItem,
                        selected && styles.optionItemSelected,
                      ]}
                      onPress={() =>
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [qIdx]: optIdx,
                        }))
                      }
                    >
                      <View
                        style={[
                          styles.radioOuter,
                          selected && styles.radioOuterSelected,
                        ]}
                      >
                        {selected && <View style={styles.radioInner} />}
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Único CTA primario según el estado de aprobación */}
        {isUnlocked ? (
          <View style={styles.actionsBlock}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("MedicalUpload", { workerId })}
            >
              <Text style={styles.primaryBtnText}>
                Continuar al Paso 2: Certificado EMO
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.onAccent}
              />
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={handleManualSubmit}
              disabled={submitting}
            >
              <Text style={styles.secondaryBtnText}>
                Volver a calificar respuestas
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.primaryBtn, submitting && styles.disabledBtn]}
            onPress={handleManualSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-done"
                  size={18}
                  color={colors.onAccent}
                />
                <Text style={styles.primaryBtnText}>Enviar respuestas</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Opciones de demostración ocultas por defecto */}
        <CollapsibleTestTools title="Opciones de prueba">
          <View style={styles.demoRow}>
            <Pressable
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("PASS_100")}
              disabled={submitting}
            >
              <Text style={styles.demoBtnText}>Simular 100% (Aprobar)</Text>
            </Pressable>
            <Pressable
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("FAIL_60")}
              disabled={submitting}
            >
              <Text style={styles.demoBtnText}>Simular 60% (Reprobar)</Text>
            </Pressable>
          </View>
        </CollapsibleTestTools>
      </ScrollView>
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
    gap: spacing.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  progressCount: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  headerDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginTop: 2,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  resultPass: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  resultFail: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  resultScoreText: {
    fontSize: 14,
    fontWeight: "800",
  },
  resultMsgText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  questionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.canvas,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionItemSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  optionText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  optionTextSelected: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  actionsBlock: {
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  demoRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  demoBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
