/**
 * Shared Components for Match Details
 *
 * Common UI components used across different tabs in MatchDetailsScreen
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";

// ===========================
// MARKER TYPE ENUM
// ===========================

export enum MarkerType {
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
  DIAMOND = 'diamond',
}

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
  const { isCompact: isCompactLayout } = useResponsive();
  const textPrimary = isDark ? colors.text.primary : colors.text.primary;
  const textSecondary = isDark ? colors.text.secondary : colors.text.secondary;
  const textTertiary = isDark ? colors.text.tertiary : colors.text.secondary;
  const pct = attempted > 0 ? Math.round((made / attempted) * 100) : 0;

  const isSmall = compact || isCompactLayout;

  return (
    <View style={[styles.shootingBar, isSmall && styles.shootingBarCompact]}>
      <View style={styles.shootingBarRow}>
        <Text
          style={[
            styles.shootingBarLabel,
            { color: textSecondary },
            isSmall && styles.shootingBarLabelCompact,
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.shootingBarTrack,
            { backgroundColor: isDark ? colors.surface : colors.surfaceVariant },
            isSmall && styles.shootingBarTrackCompact,
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
            isSmall && styles.shootingBarValueCompact,
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
  markerType?: MarkerType;
  markerColor?: string;
  leftMarkerType?: MarkerType;
  leftMarkerColor?: string;
}

export const StatBox: React.FC<StatBoxProps> = ({ label, value, sub, markerType, markerColor, leftMarkerType, leftMarkerColor }) => {
  const { colors } = useTheme();
  const { isCompact, sp, font } = useResponsive();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  const renderMarker = (type?: MarkerType, color?: string) => {
    if (!type || !color) return null;

    const size = 12;

    if (type === MarkerType.CIRCLE) {
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16">
          <Circle
            cx={8}
            cy={8}
            r={6}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </Svg>
      );
    }

    if (type === MarkerType.TRIANGLE) {
      const height = 6;
      const width = 6;
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16">
          <Polygon
            points={`8,${8 - height} ${8 + width},${8 + height} ${8 - width},${8 + height}`}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        </Svg>
      );
    }

    if (type === MarkerType.DIAMOND) {
      const diamondSize = 6;
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16">
          <Polygon
            points={`8,${8 - diamondSize} ${8 + diamondSize},8 8,${8 + diamondSize} ${8 - diamondSize},8`}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </Svg>
      );
    }

    return null;
  };

  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: colors.surfaceVariant, padding: sp.sm },
      ]}
    >
      <Text style={[styles.statBoxLabel, { color: textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.statBoxValueRow, !leftMarkerType && styles.statBoxValueRowNoLeft]}>
        {renderMarker(leftMarkerType, leftMarkerColor)}
        <Text style={[styles.statBoxValue, { color: textPrimary, fontSize: font.lg }]}>{value}</Text>
        {renderMarker(markerType, markerColor)}
      </View>
      {sub && (
        <Text style={[styles.statBoxSub, { color: textSecondary }]}>{sub}</Text>
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
    borderRadius: 8,
  },
  statBoxLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statBoxValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
  },
  statBoxValueRowNoLeft: {
    marginLeft: 14,
  },
  statBoxValue: {
    fontWeight: "900",
    lineHeight: 16,
  },
  statBoxSub: {
    fontSize: 8,
    marginTop: 2,
  },
});
