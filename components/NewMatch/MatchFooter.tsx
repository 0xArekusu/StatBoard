/**
 * Match Footer Component
 *
 * Footer with action button for match creation flow.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, SLATE_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import { MATCH_CREATION_BUTTON_LABELS } from "../../constants";
import { useResponsive } from "../../src/hooks/useResponsive";

interface MatchFooterProps {
  /** Current step (1 or 2) */
  step: 1 | 2;
  /** Whether the primary action button is enabled */
  enabled: boolean;
  /** Callback when button is pressed */
  onPress: () => void;
  /** Whether dark mode is enabled */
  isDark: boolean;
  /** Theme colors */
  colors: {
    surfaceColor: string;
    borderColor: string;
  };
}

/**
 * Footer with action button (Next or Start)
 */
export const MatchFooter: React.FC<MatchFooterProps> = ({
  step,
  enabled,
  onPress,
  isDark,
  colors,
}) => {
  const { sp, font, sizes } = useResponsive();
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.surfaceColor,
          borderTopColor: colors.borderColor,
          padding: sp.lg,
        },
      ]}
    >
      {step === 1 ? (
        <TouchableOpacity
          onPress={onPress}
          disabled={!enabled}
          style={[
            styles.primaryButton,
            {
              backgroundColor: enabled
                ? BRAND_COLORS[600]
                : isDark
                ? SLATE_COLORS[800]
                : SLATE_COLORS[300],
              opacity: enabled ? 1 : OPACITY.disabled,
              gap: sp.sm,
              padding: sp.md,
              borderRadius: sp.md,
            },
          ]}
        >
          <Text
            style={[styles.primaryButtonText, { color: COMMON_COLORS.white, fontSize: font.md }]}
          >
            {MATCH_CREATION_BUTTON_LABELS.NEXT}
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={sizes.iconMd}
            color={COMMON_COLORS.white}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={!enabled}
          style={[
            styles.primaryButton,
            {
              backgroundColor: enabled
                ? BRAND_COLORS[600]
                : isDark
                ? SLATE_COLORS[800]
                : SLATE_COLORS[300],
              opacity: enabled ? 1 : OPACITY.disabled,
              gap: sp.sm,
              padding: sp.md,
              borderRadius: sp.md,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="play-circle"
            size={sizes.iconMd}
            color={COMMON_COLORS.white}
          />
          <Text
            style={[styles.primaryButtonText, { color: COMMON_COLORS.white, fontSize: font.md }]}
          >
            {MATCH_CREATION_BUTTON_LABELS.START}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopWidth: 1,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
