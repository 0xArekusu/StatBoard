/**
 * Evolution Tab Component
 *
 * Displays match score evolution with:
 * - Period-by-period score table
 * - Score progression graph
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, { Path, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface PeriodScore {
  home: number;
  away: number;
}

interface GraphPoint {
  home: number;
  away: number;
}

interface EvolutionTabProps {
  match: any;
  actions: any[];
  colors: any;
  isDark: boolean;
}

export default function EvolutionTab({
  match,
  actions,
  colors,
  isDark,
}: EvolutionTabProps) {
  // Calculate period scores and graph points
  const evolution = useMemo(() => {
    const periods: PeriodScore[] = [];
    const graphPoints: GraphPoint[] = [{ home: 0, away: 0 }];

    // Group actions by period
    const totalPeriods = match.total_periods || 4;
    const overtimePeriods = match.overtime_periods || 0;
    const allPeriods = totalPeriods + overtimePeriods;

    for (let period = 1; period <= allPeriods; period++) {
      const periodActions = actions.filter(
        (a) => a.period_number === period && a.points != null
      );

      const homeScore = periodActions
        .filter((a) => a.team === "MyTeam")
        .reduce((sum, a) => sum + (a.points || 0), 0);

      const awayScore = periodActions
        .filter((a) => a.team === "Opponent")
        .reduce((sum, a) => sum + (a.points || 0), 0);

      periods.push({ home: homeScore, away: awayScore });

      // Add cumulative score for graph
      const prevPoint = graphPoints[graphPoints.length - 1];
      graphPoints.push({
        home: prevPoint.home + homeScore,
        away: prevPoint.away + awayScore,
      });
    }

    return { periods, graphPoints, totalPeriods, overtimePeriods };
  }, [actions, match.total_periods, match.overtime_periods]);

  // Add padding to maxScore to prevent curves from touching the top
  const maxScore = Math.max(match.my_team_score || 0, match.opponent_score || 0, 20) * 1.1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Period Scores Table */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.cardHeader,
            {
              backgroundColor: isDark
                ? colors.background
                : colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chart-timeline-variant"
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
            SCORES PAR PÉRIODE
          </Text>
        </View>

        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.teamCell,
                { color: colors.text.secondary },
              ]}
            >
              Équipe
            </Text>
            {evolution.periods.map((_, i) => {
              const isOT = i >= evolution.totalPeriods;
              const label = isOT ? `OT${i - evolution.totalPeriods + 1}` : `Q${i + 1}`;
              return (
                <Text
                  key={i}
                  style={[styles.tableHeaderCell, { color: colors.text.secondary }]}
                >
                  {label}
                </Text>
              );
            })}
            <Text
              style={[
                styles.tableHeaderCell,
                styles.totalCell,
                {
                  color: colors.text.secondary,
                  backgroundColor: isDark
                    ? colors.background
                    : colors.surface,
                },
              ]}
            >
              TOT
            </Text>
          </View>

          {/* Home Team Row */}
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text
              style={[
                styles.tableCell,
                styles.teamCell,
                { color: colors.primary },
              ]}
            >
              {match.my_team_name || "Mon Équipe"}
            </Text>
            {evolution.periods.map((p, i) => (
              <Text
                key={i}
                style={[styles.tableCell, { color: colors.text.primary }]}
              >
                {p.home}
              </Text>
            ))}
            <Text
              style={[
                styles.tableCell,
                styles.totalCell,
                styles.totalValue,
                {
                  color: colors.text.primary,
                  backgroundColor: isDark
                    ? colors.background
                    : colors.surface,
                },
              ]}
            >
              {match.my_team_score || 0}
            </Text>
          </View>

          {/* Away Team Row */}
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.tableCell,
                styles.teamCell,
                { color: colors.text.secondary },
              ]}
            >
              {match.opponent_name || "Adversaire"}
            </Text>
            {evolution.periods.map((p, i) => (
              <Text
                key={i}
                style={[styles.tableCell, { color: colors.text.secondary }]}
              >
                {p.away}
              </Text>
            ))}
            <Text
              style={[
                styles.tableCell,
                styles.totalCell,
                styles.totalValue,
                {
                  color: colors.text.secondary,
                  backgroundColor: isDark
                    ? colors.background
                    : colors.surface,
                },
              ]}
            >
              {match.opponent_score || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Score Evolution Graph */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.graphHeader}>
          <MaterialCommunityIcons
            name="chart-line"
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
            ÉVOLUTION DU SCORE
          </Text>
        </View>

        {evolution.graphPoints.length > 1 ? (
          <View style={styles.graphContainer}>
            {/* Y-axis labels */}
            <View style={styles.yAxisLabels}>
              {[0, 0.25, 0.5, 0.75, 1].reverse().map((ratio) => (
                <Text
                  key={ratio}
                  style={[styles.axisLabel, { color: colors.text.secondary }]}
                >
                  {Math.round(maxScore * ratio)}
                </Text>
              ))}
            </View>

            {/* Graph SVG */}
            <View style={styles.graphSvgContainer}>
              <Svg
                width="100%"
                height={200}
                viewBox={`0 0 ${evolution.graphPoints.length - 1} ${maxScore}`}
                preserveAspectRatio="none"
              >
                <Defs>
                  <LinearGradient id="homeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.2" />
                    <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="awayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.15" />
                    <Stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <Line
                    key={ratio}
                    x1="0"
                    y1={maxScore * ratio}
                    x2={evolution.graphPoints.length - 1}
                    y2={maxScore * ratio}
                    stroke={colors.border}
                    strokeWidth="0.05"
                    strokeDasharray="0.2,0.2"
                  />
                ))}

                {/* Home Team Area */}
                <Path
                  d={`M 0 ${maxScore} ${evolution.graphPoints
                    .map((p, i) => `L ${i} ${maxScore - p.home}`)
                    .join(" ")} L ${evolution.graphPoints.length - 1} ${maxScore} Z`}
                  fill="url(#homeGrad)"
                />

                {/* Away Team Area */}
                <Path
                  d={`M 0 ${maxScore} ${evolution.graphPoints
                    .map((p, i) => `L ${i} ${maxScore - p.away}`)
                    .join(" ")} L ${evolution.graphPoints.length - 1} ${maxScore} Z`}
                  fill="url(#awayGrad)"
                />

                {/* Home Team Line */}
                <Path
                  d={`M 0 ${maxScore} ${evolution.graphPoints
                    .map((p, i) => `L ${i} ${maxScore - p.home}`)
                    .join(" ")}`}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="0.1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Away Team Line */}
                <Path
                  d={`M 0 ${maxScore} ${evolution.graphPoints
                    .map((p, i) => `L ${i} ${maxScore - p.away}`)
                    .join(" ")}`}
                  fill="none"
                  stroke="#FF6B6B"
                  strokeWidth="0.1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </Svg>
            </View>

            {/* X-axis labels */}
            <View style={styles.xAxisLabels}>
              {evolution.periods.map((_, i) => {
                const isOT = i >= evolution.totalPeriods;
                const label = isOT ? `OT${i - evolution.totalPeriods + 1}` : `Q${i + 1}`;
                return (
                  <Text
                    key={i}
                    style={[styles.axisLabel, { color: colors.text.secondary }]}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: colors.text.secondary }]}>
              Données insuffisantes pour le graphique
            </Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.primary },
              ]}
            />
            <Text
              style={[styles.legendText, { color: colors.text.secondary }]}
            >
              {match.my_team_name || "MON ÉQUIPE"}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: "#FF6B6B" },
              ]}
            />
            <Text
              style={[styles.legendText, { color: colors.text.secondary }]}
            >
              {match.opponent_name || "ADVERSAIRE"}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tableContainer: {
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 12,
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tableCell: {
    flex: 1,
    padding: 12,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  teamCell: {
    flex: 2,
    textAlign: "left",
  },
  totalCell: {
    flex: 1,
  },
  totalValue: {
    fontWeight: "900",
  },
  graphHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  graphContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  yAxisLabels: {
    position: "absolute",
    left: 0,
    top: 8,
    height: 200,
    justifyContent: "space-between",
    paddingVertical: 2,
    width: 30,
  },
  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
    paddingLeft: 30,
  },
  graphSvgContainer: {
    height: 200,
    marginLeft: 35,
    marginRight: 5,
  },
  axisLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  noDataContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  noDataText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    padding: 16,
    paddingTop: 0,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
