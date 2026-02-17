import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemeColors } from "../../src/theme/colors";
import { useResponsive } from "../../src/hooks/useResponsive";

interface DashboardStatsCardsProps {
  totalMatches: number;
  wins: number;
  losses: number;
  colors: ThemeColors;
}

/**
 * DashboardStatsCards - Displays quick stats cards:
 * - Total matches this season
 * - Wins/Losses ratio
 */
export default function DashboardStatsCards({
  totalMatches,
  wins,
  losses,
  colors,
}: DashboardStatsCardsProps) {
  const { isCompact, sp, font } = useResponsive();

  return (
    <View style={[styles.statsContainer, { gap: sp.md, marginBottom: sp.md }]}>
      {/* Total Matches Card */}
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: sp.md,
          },
        ]}
      >
        <View style={[styles.statHeader, { marginBottom: sp.sm }]}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={isCompact ? 14 : 18}
            color={colors.primary}
          />
          <Text style={[styles.statLabel, { color: colors.primary }]}>
            MATCHS
          </Text>
        </View>
        <Text style={[styles.statValue, { color: colors.text.primary, fontSize: font.xxl }]}>
          {totalMatches}
        </Text>
        <Text style={[styles.statSubtext, { color: colors.text.secondary }]}>
          Cette saison
        </Text>
      </View>

      {/* Wins/Losses Card */}
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: sp.md,
          },
        ]}
      >
        <View style={[styles.statHeader, { marginBottom: sp.sm }]}>
          <MaterialCommunityIcons
            name="trending-up"
            size={isCompact ? 14 : 18}
            color={colors.success}
          />
          <Text style={[styles.statLabel, { color: colors.success }]}>
            VICTOIRES
          </Text>
        </View>
        <Text style={[styles.statValue, { color: colors.text.primary, fontSize: font.xxl }]}>
          {wins}{" "}
          <Text style={[styles.statValueSmall, { color: colors.text.secondary, fontSize: font.md }]}>
            / {losses}
          </Text>
        </Text>
        <Text style={[styles.statSubtext, { color: colors.text.secondary }]}>
          Ratio V/D
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: "row",
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statValue: {
    fontWeight: "900",
  },
  statValueSmall: {
    fontWeight: "normal",
  },
  statSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
});
