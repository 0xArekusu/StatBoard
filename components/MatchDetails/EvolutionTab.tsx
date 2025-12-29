/**
 * Evolution Tab Component
 *
 * Displays match score evolution with:
 * - Period-by-period score table
 * - Score progression graph
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Svg, { Path, Line, Circle } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActionType, ShotSpecification } from "../../src/models/ActionTypes";

interface PeriodScore {
  home: number;
  away: number;
}

interface GraphPoint {
  home: number;
  away: number;
  period?: number;
  actionIndex?: number;
  xPosition?: number; // Position normalized between 0 and total periods
}

interface EvolutionTabProps {
  match: any;
  actions: any[];
  colors: any;
}

/**
 * Get period label based on match format and period number
 * - Regular periods: Q1-Q4 (4 quarters), MT1-MT2 (2 halves), or P1-Pn (n periods)
 * - Overtime periods: OT1, OT2, OT3, etc.
 *
 * @param periodNumber - 1-based period number (1, 2, 3, ...)
 * @param totalPeriods - Total regular periods (2, 4, or custom)
 * @returns Period label string
 */
function getPeriodLabel(periodNumber: number, totalPeriods: number): string {
  // Check if this is an overtime period
  if (periodNumber > totalPeriods) {
    const overtimeNumber = periodNumber - totalPeriods;
    return `OT${overtimeNumber}`;
  }

  // Regular periods
  if (totalPeriods === 4) {
    return `Q${periodNumber}`;
  } else if (totalPeriods === 2) {
    return `MT${periodNumber}`;
  } else {
    return `P${periodNumber}`;
  }
}

export default function EvolutionTab({
  match,
  actions,
  colors,
}: EvolutionTabProps) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  // Calculate period scores and graph points
  const evolution = useMemo(() => {
    const periods: PeriodScore[] = [];
    const graphPoints: GraphPoint[] = [{ home: 0, away: 0, period: 0, actionIndex: -1, xPosition: 0 }];

    // Group actions by period
    const totalPeriods = match.total_periods || 4;
    const overtimePeriods = match.overtime_periods || 0;
    const allPeriods = totalPeriods + overtimePeriods;

    // Get all scoring actions sorted by time
    const scoringActions = actions
      .filter((a) => {
        const actionType = (a.type || a.action_type || '').toLowerCase();
        const specification = (a.specification || '').toLowerCase();
        return (
          actionType === ActionType.SHOT &&
          specification === ShotSpecification.MADE
        );
      })
      .sort((a, b) => {
        // Sort by period first, then by action order
        if (a.period_number !== b.period_number) {
          return a.period_number - b.period_number;
        }
        // If actions have timestamps, use them
        if (a.timestamp && b.timestamp) {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }
        // Otherwise maintain original order (assuming actions are in chronological order)
        return 0;
      });

    // Count actions per period to distribute them evenly
    const actionsPerPeriod: { [key: number]: number } = {};
    const actionIndexInPeriod: { [key: number]: number } = {};

    scoringActions.forEach((action) => {
      const period = action.period_number;
      actionsPerPeriod[period] = (actionsPerPeriod[period] || 0) + 1;
    });

    // Build graph points from all scoring actions
    let currentScore = { home: 0, away: 0 };
    scoringActions.forEach((action, index) => {
      const points = action.points || 0;
      if (action.team === "MyTeam") {
        currentScore.home += points;
      } else {
        currentScore.away += points;
      }

      const period = action.period_number;
      const indexInPeriod = actionIndexInPeriod[period] || 0;
      actionIndexInPeriod[period] = indexInPeriod + 1;

      // Calculate X position: distribute actions evenly within their period
      // Period 1 -> 0 to <1, Period 2 -> 1 to <2, etc.
      const periodStart = period - 1;
      const totalActionsInPeriod = actionsPerPeriod[period] || 1;

      // Position within the period (0 to 0.90 to ensure actions stay clearly before separator)
      // This prevents visual misalignment between SVG viewBox and CSS positioning
      const positionInPeriod = ((indexInPeriod + 0.5) / totalActionsInPeriod) * 0.90;

      // Final X position
      const xPosition = periodStart + positionInPeriod;

      graphPoints.push({
        home: currentScore.home,
        away: currentScore.away,
        period: action.period_number,
        actionIndex: index,
        xPosition,
      });
    });

    // Calculate period totals for the table
    for (let period = 1; period <= allPeriods; period++) {
      const periodActions = scoringActions.filter((a) => a.period_number === period);

      const homeScore = periodActions
        .filter((a) => a.team === "MyTeam")
        .reduce((sum, a) => sum + (a.points || 0), 0);

      const awayScore = periodActions
        .filter((a) => a.team === "Opponent")
        .reduce((sum, a) => sum + (a.points || 0), 0);

      periods.push({ home: homeScore, away: awayScore });
    }

    return { periods, graphPoints, totalPeriods, overtimePeriods, scoringActions };
  }, [actions, match.total_periods, match.overtime_periods]);

  // Calculate maxScore from actual graph data points for accurate scaling
  const maxScore = useMemo(() => {
    const maxFromGraph = Math.max(
      ...evolution.graphPoints.map(p => Math.max(p.home, p.away)),
      0
    );
    // Add 10% padding, with minimum of 20 for very low scores
    const scoreWithPadding = Math.max(maxFromGraph * 1.1, 20);
    return scoreWithPadding;
  }, [evolution.graphPoints]);

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
              backgroundColor: colors.surface,
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
              const periodNumber = i + 1;
              const label = getPeriodLabel(periodNumber, evolution.totalPeriods);
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
                  backgroundColor: colors.surface,
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
                { color: colors.text.primary },
              ]}
            >
              {match.my_team_name || "Mon Équipe"}
            </Text>
            {evolution.periods.map((p, i) => {
              const isWinning = p.home > p.away;
              return (
                <Text
                  key={i}
                  style={[
                    styles.tableCell,
                    {
                      color: isWinning ? colors.primary : colors.text.primary,
                      fontWeight: isWinning ? "900" : "700",
                    },
                  ]}
                >
                  {p.home}
                </Text>
              );
            })}
            <Text
              style={[
                styles.tableCell,
                styles.totalCell,
                styles.totalValue,
                {
                  color:
                    (match.my_team_score || 0) > (match.opponent_score || 0)
                      ? colors.primary
                      : colors.text.primary,
                  backgroundColor: colors.surface,
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
            {evolution.periods.map((p, i) => {
              const isWinning = p.away > p.home;
              return (
                <Text
                  key={i}
                  style={[
                    styles.tableCell,
                    {
                      color: isWinning ? colors.primary : colors.text.secondary,
                      fontWeight: isWinning ? "900" : "700",
                    },
                  ]}
                >
                  {p.away}
                </Text>
              );
            })}
            <Text
              style={[
                styles.tableCell,
                styles.totalCell,
                styles.totalValue,
                {
                  color:
                    (match.opponent_score || 0) > (match.my_team_score || 0)
                      ? colors.primary
                      : colors.text.secondary,
                  backgroundColor: colors.surface,
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
                viewBox={`0 0 ${evolution.totalPeriods + evolution.overtimePeriods} ${maxScore}`}
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <Line
                    key={ratio}
                    x1="0"
                    y1={maxScore * ratio}
                    x2={evolution.totalPeriods + evolution.overtimePeriods}
                    y2={maxScore * ratio}
                    stroke={colors.border}
                    strokeWidth="0.5"
                  />
                ))}

                {/* Vertical period separators - at theoretical period boundaries */}
                {Array.from({ length: evolution.totalPeriods + evolution.overtimePeriods - 1 }).map((_, i) => {
                  const separatorX = i + 1; // x=1 for end of Q1, x=2 for end of Q2, etc.
                  return (
                    <Line
                      key={`separator-${i}`}
                      x1={separatorX}
                      y1={0}
                      x2={separatorX}
                      y2={maxScore}
                      stroke={colors.border}
                      strokeWidth="0.01"
                      opacity={0.5}
                    />
                  );
                })}

                {/* Home Team Line */}
                {evolution.graphPoints.length > 1 && (
                  <Path
                    d={`M ${evolution.graphPoints[0].xPosition || 0} ${maxScore - evolution.graphPoints[0].home} ${evolution.graphPoints
                      .slice(1)
                      .map((p) => `L ${p.xPosition || 0} ${maxScore - p.home}`)
                      .join(" ")}`}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* Away Team Line */}
                {evolution.graphPoints.length > 1 && (
                  <Path
                    d={`M ${evolution.graphPoints[0].xPosition || 0} ${maxScore - evolution.graphPoints[0].away} ${evolution.graphPoints
                      .slice(1)
                      .map((p) => `L ${p.xPosition || 0} ${maxScore - p.away}`)
                      .join(" ")}`}
                    fill="none"
                    stroke="#FF6B6B"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* Interactive Points - Home Team */}
                {evolution.graphPoints.map((point, i) => (
                  <Circle
                    key={`home-${i}`}
                    cx={point.xPosition || 0}
                    cy={maxScore - point.home}
                    r={selectedPoint === i ? 0.15 : 0.08}
                    fill={colors.primary}
                    stroke={colors.background}
                    strokeWidth={selectedPoint === i ? 0.08 : 0.04}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* Interactive Points - Away Team */}
                {evolution.graphPoints.map((point, i) => (
                  <Circle
                    key={`away-${i}`}
                    cx={point.xPosition || 0}
                    cy={maxScore - point.away}
                    r={selectedPoint === i ? 0.15 : 0.08}
                    fill="#FF6B6B"
                    stroke={colors.background}
                    strokeWidth={selectedPoint === i ? 0.08 : 0.04}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </Svg>

              {/* Touch areas for interaction - clickable points */}
              <View style={styles.touchAreasContainer}>
                {evolution.graphPoints.map((point, i) => {
                  const totalPeriods = evolution.totalPeriods;
                  let label = '';
                  let scoreInfo = '';
                  let homeScoreChange = '';
                  let awayScoreChange = '';

                  if (i === 0) {
                    label = 'Début du match';
                  } else if (point.period !== undefined && point.actionIndex !== undefined && evolution.scoringActions) {
                    const action = evolution.scoringActions[point.actionIndex];
                    const previousPoint = evolution.graphPoints[i - 1];
                    const periodLabel = getPeriodLabel(point.period, totalPeriods);

                    if (action) {
                      const pointsScored = action.points || 0;
                      const scorerTeam = action.team === "MyTeam"
                        ? (match.my_team_name || "Notre équipe")
                        : (match.opponent_name || "Adversaire");

                      let shotType = '';
                      if (pointsScored === 1) shotType = 'LF';
                      else if (pointsScored === 2) shotType = '2pts';
                      else if (pointsScored === 3) shotType = '3pts';

                      label = periodLabel;
                      scoreInfo = `${scorerTeam} - ${shotType}`;

                      // Calculate score changes
                      if (action.team === "MyTeam") {
                        homeScoreChange = `${previousPoint.home} → ${point.home} (+${pointsScored})`;
                        awayScoreChange = `${previousPoint.away} → ${point.away}`;
                      } else {
                        homeScoreChange = `${previousPoint.home} → ${point.home}`;
                        awayScoreChange = `${previousPoint.away} → ${point.away} (+${pointsScored})`;
                      }
                    }
                  }

                  // Calculate position percentage based on xPosition in the viewBox
                  const totalWidth = evolution.totalPeriods + evolution.overtimePeriods;
                  const xPosition = ((point.xPosition || 0) / totalWidth) * 100;

                  return (
                    <TouchableOpacity
                      key={`touch-${i}`}
                      style={[
                        styles.touchPoint,
                        {
                          left: `${xPosition}%`,
                        }
                      ]}
                      onPress={() => {
                        console.log(`=== CLICKED POINT ${i} ===`);
                        console.log(`Period: ${point.period}`);
                        console.log(`xPosition in viewBox: ${point.xPosition}`);
                        console.log(`xPosition percentage: ${xPosition}%`);
                        console.log(`Score info: ${scoreInfo}`);
                        console.log(`Label: ${label}`);
                        setSelectedPoint(selectedPoint === i ? null : i);
                      }}
                      activeOpacity={0.7}
                    >
                      {selectedPoint === i && (
                        <View style={[styles.tooltip, {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }]}>
                          <Text style={[styles.tooltipPeriod, { color: colors.text.secondary }]}>
                            {label}
                          </Text>
                          <View style={styles.tooltipScores}>
                            <View style={styles.tooltipRow}>
                              <View style={[styles.tooltipDot, { backgroundColor: colors.primary }]} />
                              <View style={styles.tooltipScoreColumn}>
                                <Text style={[styles.tooltipTeamName, { color: colors.text.primary }]}>
                                  {match.my_team_name || "Notre équipe"}
                                </Text>
                                {homeScoreChange ? (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {homeScoreChange}
                                  </Text>
                                ) : (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {point.home}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.tooltipRow}>
                              <View style={[styles.tooltipDot, { backgroundColor: "#FF6B6B" }]} />
                              <View style={styles.tooltipScoreColumn}>
                                <Text style={[styles.tooltipTeamName, { color: colors.text.secondary }]}>
                                  {match.opponent_name || "Adversaire"}
                                </Text>
                                {awayScoreChange ? (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {awayScoreChange}
                                  </Text>
                                ) : (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {point.away}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* X-axis labels */}
            <View style={styles.xAxisLabels}>
              {evolution.periods.map((_, i) => {
                const periodNumber = i + 1;
                const label = getPeriodLabel(periodNumber, evolution.totalPeriods);
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
    left: 16,
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
    paddingLeft: 46,
  },
  graphSvgContainer: {
    height: 200,
    marginLeft: 51,
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
  touchAreasContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    marginLeft: 51,
    marginRight: 5,
  },
  touchPoint: {
    position: "absolute",
    height: "100%",
    width: 40,
    marginLeft: -20,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 8,
  },
  tooltip: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 160,
    zIndex: 1000,
  },
  tooltipPeriod: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
  },
  tooltipAction: {
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  tooltipScores: {
    gap: 6,
  },
  tooltipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  tooltipScoreColumn: {
    flex: 1,
    gap: 2,
  },
  tooltipTeamName: {
    fontSize: 10,
    fontWeight: "700",
  },
  tooltipScoreChange: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
