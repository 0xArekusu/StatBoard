import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemeColors } from "../../src/theme/colors";

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
  return (
    <View style={styles.statsContainer}>
      {/* Total Matches Card */}
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.statHeader}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.statLabel, { color: colors.primary }]}>
            MATCHS
          </Text>
        </View>
        <Text style={[styles.statValue, { color: colors.text.primary }]}>
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
          },
        ]}
      >
        <View style={styles.statHeader}>
          <MaterialCommunityIcons
            name="trending-up"
            size={18}
            color={colors.success}
          />
          <Text style={[styles.statLabel, { color: colors.success }]}>
            VICTOIRES
          </Text>
        </View>
        <Text style={[styles.statValue, { color: colors.text.primary }]}>
          {wins}{" "}
          <Text style={[styles.statValueSmall, { color: colors.text.secondary }]}>
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
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: "normal",
  },
  statSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
});
