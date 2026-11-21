import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/tokens";

interface StepHeaderProps {
  currentStep: 1 | 2 | 3;
}

const STEPS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: "IPERC" },
  { id: 2, label: "EMO" },
  { id: 3, label: "Fotocheck" },
];

export function StepHeader({ currentStep }: StepHeaderProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Paso ${currentStep} de 3`}
    >
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isActive = step.id === currentStep;
        const isLast = idx === STEPS.length - 1;

        return (
          <React.Fragment key={step.id}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={13} color={colors.onAccent} />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      isActive && styles.circleTextActive,
                    ]}
                  >
                    {step.id}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCompleted && styles.labelCompleted,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>

            {!isLast && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  circleCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  circleText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  circleTextActive: {
    color: colors.onAccent,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  labelCompleted: {
    color: colors.textSecondary,
  },
  connector: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  connectorCompleted: {
    backgroundColor: colors.successBorder,
  },
});
