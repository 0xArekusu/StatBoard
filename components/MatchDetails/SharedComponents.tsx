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
  CIRCLE = "circle",
  TRIANGLE = "triangle",
  DIAMOND = "diamond",
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
            {
              backgroundColor: colors.surfaceVariant,
            },
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

interface StatBoxQuadItem {
  value: number | string;
  color: string;
  label: string;
  markerType?: MarkerType;
}

interface StatBoxProps {
  label: string;
  value?: number | string;
  sub?: string;
  markerType?: MarkerType;
  markerColor?: string;
  leftMarkerType?: MarkerType;
  leftMarkerColor?: string;
  // Détail par sous-catégorie (ex: fautes personnelle/technique/antisportive/disqualifiante,
  // ou rebonds offensif/défensif). 2 éléments -> une seule ligne, 4 éléments -> grille 2x2.
  // Remplace value/markerType quand fourni.
  quad?: StatBoxQuadItem[];
}

export const StatBox: React.FC<StatBoxProps> = ({
  label,
  value,
  sub,
  markerType,
  markerColor,
  leftMarkerType,
  leftMarkerColor,
  quad,
}) => {
  const { colors } = useTheme();
  const { isCompact, sp, font } = useResponsive();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  const renderMarker = (type?: MarkerType, color?: string, size: number = 12) => {
    if (!type || !color) return null;

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
            points={`8,${8 - height} ${8 + width},${8 + height} ${8 - width},${
              8 + height
            }`}
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
            points={`8,${8 - diamondSize} ${8 + diamondSize},8 8,${
              8 + diamondSize
            } ${8 - diamondSize},8`}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </Svg>
      );
    }

    return null;
  };

  const renderQuadItem = (item: StatBoxQuadItem, key: number) => (
    <View key={key} style={styles.statBoxQuadItem}>
      {renderMarker(item.markerType ?? MarkerType.DIAMOND, item.color, 7)}
      <Text style={styles.statBoxQuadValue}>
        <Text style={{ color: textPrimary }}>{item.value}</Text>
        <Text style={[styles.statBoxQuadLabel, { color: textSecondary }]}>
          {" "}({item.label})
        </Text>
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.statBox,
        {
          backgroundColor: colors.surfaceVariant,
          padding: sp.sm,
          minWidth: isCompact ? 80 : 90,
        },
      ]}
    >
      <Text style={[styles.statBoxLabel, { color: textSecondary }]}>
        {label}
      </Text>
      {quad ? (
        quad.length === 4 ? (
          <View style={styles.statBoxQuadGrid}>
            <View style={styles.statBoxQuadColumn}>
              {renderQuadItem(quad[0], 0)}
              {renderQuadItem(quad[1], 1)}
            </View>
            <View style={styles.statBoxQuadColumn}>
              {renderQuadItem(quad[2], 2)}
              {renderQuadItem(quad[3], 3)}
            </View>
          </View>
        ) : (
          <View style={styles.statBoxQuadGrid}>
            {quad.map((item, i) => renderQuadItem(item, i))}
          </View>
        )
      ) : (
        <View
          style={[
            styles.statBoxValueRow,
            !leftMarkerType && styles.statBoxValueRowNoLeft,
          ]}
        >
          {renderMarker(leftMarkerType, leftMarkerColor)}
          <Text
            style={[
              styles.statBoxValue,
              { color: textPrimary, fontSize: font.lg },
            ]}
          >
            {value}
          </Text>
          {renderMarker(markerType, markerColor)}
        </View>
      )}
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
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
  },
  statBoxLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
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
    textAlign: "center",
  },
  statBoxSub: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 2,
  },
  statBoxQuadGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statBoxQuadColumn: {
    gap: 1,
  },
  statBoxQuadItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  statBoxQuadLabel: {
    fontSize: 8,
    fontWeight: "400",
  },
  statBoxQuadValue: {
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 11,
    textAlign: "center",
  },
});
