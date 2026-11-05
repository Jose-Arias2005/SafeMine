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
import { useAuth } from "../context/AuthContext";
import { CachedOfflineBadge, RootStackParamList, Worker } from "../types";
import {
  loadOfflineBadge,
  saveOfflineBadge,
} from "../utils/offlineStorage";

type Props = NativeStackScreenProps<RootStackParamList, "DigitalBadge">;

const EPP_LABELS: Record<string, string> = {
  HEAD_COVER: "Casco Minero",
  HAND_COVER: "Guantes de Seguridad",
  FACE_COVER: "Protección Facial",
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
        <ActivityIndicator size="large" color="#34d399" />
        <Text style={styles.loadingText}>Cargando Fotocheck QR...</Text>
      </SafeAreaView>
    );
  }

  const displayWorker: Worker | null = badgeData?.worker ?? worker;

  if (!displayWorker || !displayWorker.is_authorized) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="lock-closed" size={48} color="#f59e0b" />
        <Text style={styles.emptyTitle}>Credencial aún no autorizada</Text>
        <Text style={styles.emptyDesc}>
          Completa el Paso 1 (Inducción IPERC &gt;= 80%) y el Paso 2 (Certificado
          EMO validado como APTO por IA) para activar tu Fotocheck QR.
        </Text>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.backBtnText}>Volver al Inicio</Text>
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
        {/* Cinta superior de estado Offline / Autorizado */}
        <View style={styles.statusHeader}>
          <View style={styles.authorizedPill}>
            <Ionicons name="checkmark-circle" size={16} color="#022c22" />
            <Text style={styles.authorizedPillText}>
              HABILITADO PARA INGRESO A MINA
            </Text>
          </View>
          <View style={styles.offlineTag}>
            <Ionicons
              name={isUsingCachedCopy ? "cloud-offline" : "shield-checkmark"}
              size={14}
              color="#6ee7b7"
            />
            <Text style={styles.offlineTagText}>
              {isUsingCachedCopy ? "MODO OFFLINE ACTIVO" : "GUARDADO OFFLINE"}
            </Text>
          </View>
        </View>

        {/* Tarjeta Fotocheck de Alta Resolución */}
        <View style={styles.badgeCard}>
          <View style={styles.badgeTopStripe}>
            <Text style={styles.companyLabel}>
              {badgeData?.companyName ||
                proposal?.provider_company_name ||
                "CONTRATISTA MINERO ACREDITADO"}
            </Text>
            <Text style={styles.workerName}>{displayWorker.full_name}</Text>
            <Text style={styles.workerRole}>{displayWorker.position}</Text>
          </View>

          {/* Renderizado nativo SVG del QR */}
          <View style={styles.qrFrame}>
            <QRCodeSVG
              value={qrValue}
              size={224}
              color="#020617"
              backgroundColor="#ffffff"
              ecl="M"
            />
          </View>

          <Text style={styles.scanHint}>
            Presenta este código frente al escáner óptico en Garita de Control
          </Text>

          {/* Metadatos verificados */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaKey}>DNI OPERARIO</Text>
              <Text style={styles.metaVal}>{displayWorker.dni}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaKey}>INDUCCIÓN IPERC</Text>
              <Text style={styles.metaValEmerald}>
                {displayWorker.exam_score}% APROBADO
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaKey}>DICTAMEN EMO IA</Text>
              <Text style={styles.metaValEmerald}>APTO (GEMINI)</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaKey}>ID PADRÓN</Text>
              <Text style={styles.metaVal}>#{displayWorker.id}</Text>
            </View>
          </View>

          {/* EPPs obligatorios de su convocatoria */}
          <View style={styles.eppSection}>
            <Text style={styles.eppSectionTitle}>
              EPPs Exigidos en Garita para tu Convocatoria
            </Text>
            <View style={styles.eppChips}>
              {requiredEpps.map((code) => (
                <View key={code} style={styles.eppChip}>
                  <Ionicons name="shield" size={12} color="#fbbf24" />
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
            Respaldo local sincronizado:{" "}
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
    backgroundColor: "#020617",
  },
  centered: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 8,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDesc: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  backBtn: {
    marginTop: 10,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: "#020617",
    fontWeight: "800",
  },
  container: {
    padding: 18,
    paddingBottom: 34,
    gap: 14,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  authorizedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#34d399",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  authorizedPillText: {
    color: "#022c22",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  offlineTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#064e3b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#10b98166",
  },
  offlineTagText: {
    color: "#a7f3d0",
    fontSize: 10,
    fontWeight: "800",
  },
  badgeCard: {
    backgroundColor: "#0f172a",
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#10b98188",
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 20,
  },
  badgeTopStripe: {
    width: "100%",
    backgroundColor: "#064e3b",
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#10b98144",
  },
  companyLabel: {
    color: "#6ee7b7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  workerName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
  },
  workerRole: {
    color: "#a7f3d0",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  qrFrame: {
    marginTop: 22,
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 22,
  },
  scanHint: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  metaGrid: {
    width: "90%",
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    rowGap: 12,
  },
  metaCell: {
    width: "50%",
    paddingHorizontal: 6,
  },
  metaKey: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
  },
  metaVal: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  metaValEmerald: {
    color: "#34d399",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  eppSection: {
    width: "90%",
    marginTop: 14,
    gap: 8,
  },
  eppSectionTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  eppChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  eppChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eppChipText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
  },
  cachedTimestamp: {
    color: "#64748b",
    fontSize: 11,
    textAlign: "center",
  },
});

