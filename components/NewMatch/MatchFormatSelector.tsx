/**
 * Match Format Selector Component
 *
 * Allows selection of match format (quarters/halves) and customization of period count and duration.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, SLATE_COLORS } from "../../src/theme";
import {
  MATCH_CREATION_FORM_LABELS,
  MATCH_FORMAT_PRESETS,
  ROSTER_LIMITS,
} from "../../constants";
import { useResponsive } from "../../src/hooks/useResponsive";

interface MatchFormatSelectorProps {
  /** Number of periods */
  periodCount: number;
  /** Duration of each period in minutes */
  periodDuration: number;
  /** Callback when period count changes */
  onPeriodCountChange: (count: number) => void;
  /** Callback when period duration changes */
  onPeriodDurationChange: (duration: number) => void;
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
 * Match format selector with preset buttons and custom adjusters
 */
export const MatchFormatSelector: React.FC<MatchFormatSelectorProps> = ({
  periodCount,
  periodDuration,
  onPeriodCountChange,
  onPeriodDurationChange,
  isDark,
  colors,
}) => {
  const handleQuartersPreset = () => {
    onPeriodCountChange(MATCH_FORMAT_PRESETS.QUARTERS.totalPeriods);
    onPeriodDurationChange(MATCH_FORMAT_PRESETS.QUARTERS.periodDuration);
  };

  const handleHalvesPreset = () => {
    onPeriodCountChange(MATCH_FORMAT_PRESETS.HALVES.totalPeriods);
    onPeriodDurationChange(MATCH_FORMAT_PRESETS.HALVES.periodDuration);
  };

  const { sp, font, sizes } = useResponsive();

  return (
    <View style={[styles.formSection, { marginBottom: sp.lg }]}>
      <Text style={[styles.formLabel, { color: colors.textSecondary, fontSize: font.xs, marginBottom: sp.sm }]}>
        {MATCH_CREATION_FORM_LABELS.MATCH_FORMAT}
      </Text>

      {/* Preset Buttons */}
      <View style={[styles.formatButtons, { gap: sp.md, marginBottom: sp.md }]}>
        <TouchableOpacity
          onPress={handleQuartersPreset}
          style={[
            styles.formatButton,
            {
              backgroundColor:
                periodCount === 4
                  ? `${BRAND_COLORS[500]}20`
                  : colors.surfaceColor,
              borderColor:
                periodCount === 4 ? BRAND_COLORS[500] : colors.borderColor,
              paddingVertical: sp.sm + sp.xs,
              borderRadius: sp.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.formatButtonText,
              {
                color:
                  periodCount === 4 ? BRAND_COLORS[600] : colors.textSecondary,
                fontSize: font.md,
              },
            ]}
          >
            {MATCH_FORMAT_PRESETS.QUARTERS.label}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleHalvesPreset}
          style={[
            styles.formatButton,
            {
              backgroundColor:
                periodCount === 2
                  ? `${BRAND_COLORS[500]}20`
                  : colors.surfaceColor,
              borderColor:
                periodCount === 2 ? BRAND_COLORS[500] : colors.borderColor,
              paddingVertical: sp.sm + sp.xs,
              borderRadius: sp.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.formatButtonText,
              {
                color:
                  periodCount === 2 ? BRAND_COLORS[600] : colors.textSecondary,
                fontSize: font.md,
              },
            ]}
          >
            {MATCH_FORMAT_PRESETS.HALVES.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Adjusters */}
      <View style={[styles.durationRow, { gap: sp.md }]}>
        {/* Period Count Adjuster */}
        <View style={styles.durationControl}>
          <Text style={[styles.durationLabel, { color: colors.textSecondary, fontSize: font.xs, marginBottom: sp.sm }]}>
            {MATCH_CREATION_FORM_LABELS.PERIODS}
          </Text>
          <View style={[styles.durationAdjuster, { gap: sp.xs }]}>
            <TouchableOpacity
              onPress={() =>
                onPeriodCountChange(
                  Math.max(ROSTER_LIMITS.PERIOD.MIN, periodCount - 1)
                )
              }
              style={[
                styles.adjustButton,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[100],
                  width: sp.xxl,
                  height: sp.xxl,
                  borderRadius: sp.md,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="minus"
                size={sizes.iconMd * 0.75}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <View
              style={[
                styles.durationInput,
                {
                  backgroundColor: colors.surfaceColor,
                  borderColor: colors.borderColor,
                  gap: sp.xs + 2,
                  paddingVertical: sp.sm,
                  paddingHorizontal: sp.sm + sp.xs,
                  borderRadius: sp.sm,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="timeline-clock"
                size={sizes.iconSm}
                color={colors.textSecondary}
              />
              <Text style={[styles.durationValue, { color: colors.textPrimary, fontSize: font.md }]}>
                {periodCount}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                onPeriodCountChange(
                  Math.min(ROSTER_LIMITS.PERIOD.MAX, periodCount + 1)
                )
              }
              style={[
                styles.adjustButton,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[100],
                  width: sp.xxl,
                  height: sp.xxl,
                  borderRadius: sp.md,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="plus"
                size={sizes.iconMd * 0.75}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Duration Adjuster */}
        <View style={styles.durationControl}>
          <Text style={[styles.durationLabel, { color: colors.textSecondary, fontSize: font.xs, marginBottom: sp.sm }]}>
            {MATCH_CREATION_FORM_LABELS.MINUTES_PER_PERIOD}
          </Text>
          <View style={[styles.durationAdjuster, { gap: sp.xs }]}>
            <TouchableOpacity
              onPress={() =>
                onPeriodDurationChange(
                  Math.max(ROSTER_LIMITS.DURATION.MIN, periodDuration - 1)
                )
              }
              style={[
                styles.adjustButton,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[100],
                  width: sp.xxl,
                  height: sp.xxl,
                  borderRadius: sp.md,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="minus"
                size={sizes.iconMd * 0.75}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <View
              style={[
                styles.durationInput,
                {
                  backgroundColor: colors.surfaceColor,
                  borderColor: colors.borderColor,
                  gap: sp.xs + 2,
                  paddingVertical: sp.sm,
                  paddingHorizontal: sp.sm + sp.xs,
                  borderRadius: sp.sm,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={sizes.iconSm}
                color={colors.textSecondary}
              />
              <Text style={[styles.durationValue, { color: colors.textPrimary, fontSize: font.md }]}>
                {periodDuration}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                onPeriodDurationChange(
                  Math.min(ROSTER_LIMITS.DURATION.MAX, periodDuration + 1)
                )
              }
              style={[
                styles.adjustButton,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[100],
                  width: sp.xxl,
                  height: sp.xxl,
                  borderRadius: sp.md,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="plus"
                size={sizes.iconMd * 0.75}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  formatButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  durationRow: {
    flexDirection: "row",
    gap: 16,
  },
  durationControl: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
  },
  durationAdjuster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  durationInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
});
