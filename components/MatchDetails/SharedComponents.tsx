/**
 * Shared Components for Match Details
 *
 * Common UI components used across different tabs in MatchDetailsScreen
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Colors } from "../../src/theme/colors";

// ===========================
// SHOOTING BAR COMPONENT
// ===========================

interface ShootingBarProps {
  label: string;
  made: number;
  attempted: number;
  color: string;
  compact?: boolean;
}

export const ShootingBar: React.FC<ShootingBarProps> = ({
  label,
  made,
  attempted,
  color,
  compact,
}) => {
  const { isDark } = useTheme();
  const { colors } = useTheme();
  const textPrimary = isDark ? colors.text.primary : colors.text.primary;
  const textSecondary = isDark ? colors.text.secondary : colors.text.secondary;
  const textTertiary = isDark ? colors.text.tertiary : colors.text.secondary;
  const pct = attempted > 0 ? Math.round((made / attempted) * 100) : 0;

  return (
    <View style={[styles.shootingBar, compact && styles.shootingBarCompact]}>
      <View style={styles.shootingBarRow}>
        <Text
          style={[
            styles.shootingBarLabel,
            { color: textSecondary },
            compact && styles.shootingBarLabelCompact,
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.shootingBarTrack,
            { backgroundColor: isDark ? colors.surfaceVariant : colors.border },
            compact && styles.shootingBarTrackCompact,
          ]}
        >
          <View
            style={[
              styles.shootingBarFill,
              { backgroundColor: color, width: `${pct}%` },
            ]}
          />
        </View>
        <Text
          style={[
            styles.shootingBarValue,
            { color: textPrimary },
            compact && styles.shootingBarValueCompact,
          ]}
        >
          <Text style={styles.shootingBarValueBold}>
            {made}/{attempted}
          </Text>
          <Text style={[styles.shootingBarPct, { color: textTertiary }]}>
            {" "}
            ({pct}%)
          </Text>
        </Text>
      </View>
    </View>
  );
};

// ===========================
// STAT BOX COMPONENT
// ===========================

interface StatBoxProps {
  label: string;
  value: number | string;
  sub?: string;
}

export const StatBox: React.FC<StatBoxProps> = ({ label, value, sub }) => {
  const { isDark, colors } = useTheme();
  const bgColor = isDark ? colors.background : colors.surface;
  const borderColor = isDark ? colors.surfaceVariant : colors.border;
  const textPrimary = isDark ? colors.text.primary : colors.text.primary;
  const textTertiary = isDark ? colors.text.tertiary : colors.text.secondary;

  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: bgColor, borderColor: borderColor },
      ]}
    >
      <Text style={[styles.statBoxLabel, { color: textTertiary }]}>
        {label}
      </Text>
      <Text style={[styles.statBoxValue, { color: textPrimary }]}>{value}</Text>
      {sub && (
        <Text style={[styles.statBoxSub, { color: textTertiary }]}>{sub}</Text>
      )}
    </View>
  );
};

// ===========================
// STYLES
// ===========================

const styles = StyleSheet.create({
  // Shooting Bar
  shootingBar: {
    marginBottom: 8,
  },
  shootingBarCompact: {
    marginBottom: 4,
  },
  shootingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shootingBarLabel: {
    fontSize: 12,
    fontWeight: "700",
    width: 50,
  },
  shootingBarLabelCompact: {
    fontSize: 10,
    width: 45,
  },
  shootingBarTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  shootingBarTrackCompact: {
    height: 8,
  },
  shootingBarFill: {
    height: "100%",
  },
  shootingBarValue: {
    fontSize: 12,
    minWidth: 70,
    textAlign: "right",
  },
  shootingBarValueCompact: {
    fontSize: 10,
    minWidth: 65,
  },
  shootingBarValueBold: {
    fontWeight: "700",
  },
  shootingBarPct: {
    fontSize: 10,
  },

  // Stat Box
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statBoxLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 16,
  },
  statBoxSub: {
    fontSize: 8,
    marginTop: 2,
  },
});
