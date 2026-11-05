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
import { useAuth } from "../context/AuthContext";
import { trabajadorService } from "../services/trabajadorService";
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
          `¡Inducción Aprobada (${res.score}%)!`,
          "Has superado el mínimo exigido (80%). Se ha desbloqueado el Paso 2: Auditoría de Certificado Médico EMO.",
          [
            {
              text: "Continuar al Paso 2 (EMO)",
              onPress: () =>
                navigation.navigate("MedicalUpload", { workerId }),
            },
          ]
        );
      } else {
        Alert.alert(
          `Nota insuficiente (${res.score}%)`,
          "Se requiere al menos 80% para desbloquear el paso médico. Revisa tus respuestas e inténtalo nuevamente."
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
        "Debes responder todas las preguntas de seguridad minera antes de enviar."
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
  const isUnlocked = Boolean(
    (worker?.exam_passed && (worker?.exam_score ?? 0) >= 80) ||
      (lastResult?.passed && lastResult.score >= 80)
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Cabecera normativa */}
        <View style={styles.headerCard}>
          <View style={styles.stepPillRow}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>PASO 1 DE 2 · BLOQUEANTE</Text>
            </View>
            <Text style={styles.progressText}>
              {answeredCount}/{questions.length} respondidas
            </Text>
          </View>
          <Text style={styles.headerTitle}>
            Inducción de Seguridad IPERC (DS 024-2016-EM)
          </Text>
          <Text style={styles.headerDesc}>
            Obtén una calificación mínima de{" "}
            <Text style={styles.boldAmber}>80%</Text> para desbloquear la carga
            y auditoría IA de tu Certificado Médico Ocupacional.
          </Text>

          {/* Botones discretos de demostración rápida */}
          <View style={styles.demoRow}>
            <Text style={styles.demoLabel}>Demo rápida:</Text>
            <Pressable
              style={styles.demoBtnPass}
              onPress={() => handleQuickDemo("PASS_100")}
              disabled={submitting}
            >
              <Text style={styles.demoBtnPassText}>Aprobar 100%</Text>
            </Pressable>
            <Pressable
              style={styles.demoBtnFail}
              onPress={() => handleQuickDemo("FAIL_60")}
              disabled={submitting}
            >
              <Text style={styles.demoBtnFailText}>Fallar 60%</Text>
            </Pressable>
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
              color={lastResult.passed ? "#34d399" : "#f87171"}
            />
            <View style={styles.flex}>
              <Text style={styles.resultScoreText}>
                Puntaje obtenido: {lastResult.score}%
              </Text>
              <Text style={styles.resultMsgText}>{lastResult.message}</Text>
            </View>
          </View>
        )}

        {loadingQuestions ? (
          <ActivityIndicator
            color="#f59e0b"
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

        {/* Botón de envío */}
        <Pressable
          style={[styles.submitBtn, submitting && styles.disabledBtn]}
          onPress={handleManualSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#020617" />
              <Text style={styles.submitBtnText}>
                Calificar Inducción IPERC
              </Text>
            </>
          )}
        </Pressable>

        {/* Acceso al Paso 2 únicamente cuando >= 80% */}
        {isUnlocked && (
          <Pressable
            style={styles.nextStepBtn}
            onPress={() => navigation.navigate("MedicalUpload", { workerId })}
          >
            <Text style={styles.nextStepBtnText}>
              Ir al Paso 2: Subir Certificado Médico EMO
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#ecfdf5" />
          </Pressable>
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
  container: {
    padding: 18,
    paddingBottom: 36,
    gap: 14,
  },
  headerCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 8,
  },
  stepPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepPill: {
    backgroundColor: "#f59e0b22",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f59e0b66",
  },
  stepPillText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  progressText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
  },
  headerDesc: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },
  boldAmber: {
    color: "#fbbf24",
    fontWeight: "800",
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  demoLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  demoBtnPass: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#064e3b",
    borderWidth: 1,
    borderColor: "#10b98166",
  },
  demoBtnPassText: {
    color: "#6ee7b7",
    fontSize: 11,
    fontWeight: "700",
  },
  demoBtnFail: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: "#ef444466",
  },
  demoBtnFailText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "700",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultPass: {
    backgroundColor: "#064e3b88",
    borderColor: "#10b981",
  },
  resultFail: {
    backgroundColor: "#450a0a88",
    borderColor: "#ef4444",
  },
  resultScoreText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  resultMsgText: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },
  questionCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 12,
  },
  questionTitle: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
  },
  optionItemSelected: {
    borderColor: "#f59e0b",
    backgroundColor: "#f59e0b14",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#f59e0b",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  optionText: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 18,
  },
  optionTextSelected: {
    color: "#fef3c7",
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#020617",
    fontSize: 15,
    fontWeight: "800",
  },
  nextStepBtn: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextStepBtnText: {
    color: "#ecfdf5",
    fontSize: 14,
    fontWeight: "800",
  },
});

