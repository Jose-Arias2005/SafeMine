import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/tokens";

interface CollapsibleTestToolsProps {
  title?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleTestTools({
  title = "Opciones de prueba",
  children,
  defaultOpen = false,
}: CollapsibleTestToolsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.triggerLeft}>
          <Ionicons
            name="construct-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={styles.triggerText}>{title}</Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
