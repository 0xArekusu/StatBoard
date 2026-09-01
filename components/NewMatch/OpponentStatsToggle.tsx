/**
 * Opponent Stats Toggle Component
 *
 * Toggle to enable/disable opponent statistics tracking.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, SLATE_COLORS, COMMON_COLORS } from "../../src/theme";
import { getMatchCreationInfoMessage } from "../../constants";
import { useResponsive } from "../../src/hooks/useResponsive";

interface OpponentStatsToggleProps {
  /** Whether opponent stats tracking is enabled */
  enabled: boolean;
  /** Callback when toggle changes */
  onToggle: () => void;
  /** Whether dark mode is enabled */
  isDark: boolean;
  /** Theme colors */
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

/**
 * Toggleable option card for opponent statistics tracking
 */
export const OpponentStatsToggle: React.FC<OpponentStatsToggleProps> = ({
  enabled,
  onToggle,
  isDark,
  colors,
}) => {
  const { sp, font, sizes } = useResponsive();
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.optionCard,
        {
          backgroundColor: colors.surfaceColor,
          borderColor: enabled ? BRAND_COLORS[500] : colors.borderColor,
          padding: sp.md,
          borderRadius: sp.md,
        },
      ]}
    >
      <View style={[styles.optionCardLeft, { gap: sp.sm + sp.xs }]}>
        <View
          style={[
            styles.optionIcon,
            {
              backgroundColor: enabled
                ? `${BRAND_COLORS[500]}20`
                : isDark
                ? SLATE_COLORS[800]
                : SLATE_COLORS[200],
              width: sizes.avatarMd,
              height: sizes.avatarMd,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chart-bar"
            size={sizes.iconMd}
            color={enabled ? BRAND_COLORS[600] : colors.textSecondary}
          />
        </View>
        <View style={styles.optionTextContainer}>
          <Text
            style={[
              styles.optionTitle,
              {
                color: enabled ? colors.textPrimary : colors.textSecondary,
                fontSize: font.md,
              },
            ]}
          >
            {getMatchCreationInfoMessage("OPPONENT_STATS_TITLE")}
          </Text>
          <Text style={[styles.optionSubtitle, { color: colors.textSecondary, fontSize: font.sm, marginTop: sp.xs }]}>
            {getMatchCreationInfoMessage("OPPONENT_STATS_OPTION")}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: enabled ? BRAND_COLORS[500] : colors.borderColor,
            backgroundColor: enabled ? BRAND_COLORS[500] : "transparent",
            width: sizes.avatarSm * 0.6,
            height: sizes.avatarSm * 0.6,
          },
        ]}
      >
        {enabled && (
          <MaterialCommunityIcons
            name="check"
            size={sizes.iconSm}
            color={COMMON_COLORS.white}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
