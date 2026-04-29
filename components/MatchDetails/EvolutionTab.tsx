/**
 * Evolution Tab Component
 *
 * Displays match score evolution with:
 * - Period-by-period score table
 * - Score progression graph
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActionType, ShotSpecification } from "../../src/models/ActionTypes";
import { Team } from "../../src/models/types";
import { useResponsive } from "../../src/hooks/useResponsive";

interface PeriodScore {
  home: number;
  away: number;
}

interface GraphPoint {
  myTeam: number;
  opponent: number;
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
  const { sp, font, sizes } = useResponsive();
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  // Calculate period scores and graph points
  const evolution = useMemo(() => {
    const periods: PeriodScore[] = [];
    const myTeamHandicap = match.my_team_handicap || 0;
    const opponentHandicap = match.opponent_handicap || 0;
    const initMyTeam = myTeamHandicap;
    const initOpponent = opponentHandicap;
    const graphPoints: GraphPoint[] = [{ myTeam: initMyTeam, opponent: initOpponent, period: 0, actionIndex: -1, xPosition: 0 }];

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
    // Always use myTeam/opponent regardless of home/away
    let currentScore = { myTeam: initMyTeam, opponent: initOpponent };
    scoringActions.forEach((action, index) => {
      const points = action.points || 0;
      const isMyTeamAction = action.team === Team.MY_TEAM;

      if (isMyTeamAction) {
        currentScore.myTeam += points;
      } else {
        currentScore.opponent += points;
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
        myTeam: currentScore.myTeam,
        opponent: currentScore.opponent,
        period: action.period_number,
        actionIndex: index,
        xPosition,
      });
    });

    // Calculate period totals for the table
    // Map to home/away based on location for table display
    const isHome = match.is_home;
    for (let period = 1; period <= allPeriods; period++) {
      const periodActions = scoringActions.filter((a) => a.period_number === period);

      const myTeamScore = periodActions
        .filter((a) => a.team === Team.MY_TEAM)
        .reduce((sum, a) => sum + (a.points || 0), 0);

      const opponentScore = periodActions
        .filter((a) => a.team === Team.OPPONENT)
        .reduce((sum, a) => sum + (a.points || 0), 0);

      // Map scores to home/away based on location
      // When we are home: home = myTeamScore, away = opponentScore
      // When we are away: home = opponentScore (they are home), away = myTeamScore (we are away)
      if (isHome) {
        periods.push({ home: myTeamScore, away: opponentScore });
      } else {
        periods.push({ home: opponentScore, away: myTeamScore });
      }
    }

    return { periods, graphPoints, totalPeriods, overtimePeriods, scoringActions };
  }, [actions, match.total_periods, match.overtime_periods, match.is_home, match.my_team_handicap, match.opponent_handicap]);

  // Calculate maxScore from actual graph data points for accurate scaling
  const maxScore = useMemo(() => {
    const maxFromGraph = Math.max(
      ...evolution.graphPoints.map(p => Math.max(p.myTeam, p.opponent)),
      0
    );
    // Add 10% padding, with minimum of 20 for very low scores
    const scoreWithPadding = Math.max(maxFromGraph * 1.1, 20);
    return scoreWithPadding;
  }, [evolution.graphPoints]);

  const hasHandicap = (match.my_team_handicap || 0) > 0 || (match.opponent_handicap || 0) > 0;
  const homeHandicap = match.is_home ? (match.my_team_handicap || 0) : (match.opponent_handicap || 0);
  const awayHandicap = match.is_home ? (match.opponent_handicap || 0) : (match.my_team_handicap || 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { padding: sp.md, gap: sp.md }]}
    >
      {/* Period Scores Table */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: sp.md,
            padding: sp.md,
          },
        ]}
      >
        <View
          style={[
            styles.cardHeader,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              marginBottom: sp.md,
              paddingBottom: sp.sm,
              gap: sp.sm,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chart-timeline-variant"
            size={font.md}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: colors.text.primary, fontSize: font.md }]}>
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
                {
                  color: colors.text.secondary,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                  fontSize: font.xs,
                  padding: sp.xs,
                },
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
                  style={[
                    styles.tableHeaderCell,
                    {
                      color: colors.text.secondary,
                      borderRightWidth: 1,
                      borderRightColor: colors.border,
                      fontSize: font.xs,
                      padding: sp.xs,
                    }
                  ]}
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
                  fontSize: font.xs,
                  padding: sp.xs,
                },
              ]}
            >
              TOT
            </Text>
          </View>

          {/* Home Team Row (First row - always the team playing at home) */}
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.tableCell,
                styles.teamCell,
                {
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                  alignItems: "flex-start",
                },
              ]}
            >
              <Text style={{ color: match.is_home ? colors.text.primary : colors.text.secondary, fontSize: font.sm, fontWeight: "700" }}>
                {match.is_home ? (match.my_team_name || "Mon Équipe") : (match.opponent_name || "Adversaire")}
              </Text>
              {homeHandicap > 0 && (
                <View style={[styles.hcpBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
                  <Text style={[styles.hcpBadgeText, { color: colors.primary }]}>+{homeHandicap} HCP</Text>
                </View>
              )}
            </View>
            {evolution.periods.map((p, i) => {
              const isWinning = p.home > p.away;
              const isMyTeam = match.is_home;
              return (
                <Text
                  key={i}
                  style={[
                    styles.tableCell,
                    {
                      color: isWinning ? (isMyTeam ? colors.primary : colors.primary) : (isMyTeam ? colors.text.primary : colors.text.secondary),
                      fontWeight: isWinning ? "900" : "700",
                      borderRightWidth: 1,
                      borderRightColor: colors.border,
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
                  color: match.is_home
                    ? ((match.my_team_score || 0) > (match.opponent_score || 0) ? colors.primary : colors.text.primary)
                    : ((match.opponent_score || 0) > (match.my_team_score || 0) ? colors.primary : colors.text.secondary),
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {match.is_home ? (match.my_team_score || 0) : (match.opponent_score || 0)}
            </Text>
          </View>

          {/* Away Team Row (Second row - always the team playing away) */}
          <View style={styles.tableRow}>
            <View
              style={[
                styles.tableCell,
                styles.teamCell,
                {
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                  alignItems: "flex-start",
                },
              ]}
            >
              <Text style={{ color: match.is_home ? colors.text.secondary : colors.text.primary, fontSize: font.sm, fontWeight: "700" }}>
                {match.is_home ? (match.opponent_name || "Adversaire") : (match.my_team_name || "Mon Équipe")}
              </Text>
              {awayHandicap > 0 && (
                <View style={[styles.hcpBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
                  <Text style={[styles.hcpBadgeText, { color: colors.primary }]}>+{awayHandicap} HCP</Text>
                </View>
              )}
            </View>
            {evolution.periods.map((p, i) => {
              const isWinning = p.away > p.home;
              const isMyTeam = !match.is_home;
              return (
                <Text
                  key={i}
                  style={[
                    styles.tableCell,
                    {
                      color: isWinning ? (isMyTeam ? colors.primary : colors.primary) : (isMyTeam ? colors.text.primary : colors.text.secondary),
                      fontWeight: isWinning ? "900" : "700",
                      borderRightWidth: 1,
                      borderRightColor: colors.border,
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
                  color: match.is_home
                    ? ((match.opponent_score || 0) > (match.my_team_score || 0) ? colors.primary : colors.text.secondary)
                    : ((match.my_team_score || 0) > (match.opponent_score || 0) ? colors.primary : colors.text.primary),
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {match.is_home ? (match.opponent_score || 0) : (match.my_team_score || 0)}
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
                    strokeWidth="0.1"
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

                {/* My Team Line (always primary color) */}
                {evolution.graphPoints.length > 1 && (
                  <Path
                    d={`M ${evolution.graphPoints[0].xPosition || 0} ${maxScore - evolution.graphPoints[0].myTeam} ${evolution.graphPoints
                      .slice(1)
                      .map((p) => `L ${p.xPosition || 0} ${maxScore - p.myTeam}`)
                      .join(" ")}`}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* Opponent Team Line (always red) */}
                {evolution.graphPoints.length > 1 && (
                  <Path
                    d={`M ${evolution.graphPoints[0].xPosition || 0} ${maxScore - evolution.graphPoints[0].opponent} ${evolution.graphPoints
                      .slice(1)
                      .map((p) => `L ${p.xPosition || 0} ${maxScore - p.opponent}`)
                      .join(" ")}`}
                    fill="none"
                    stroke="#FF6B6B"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

              </Svg>

              {/* Touch areas for interaction - clickable points */}
              <View style={styles.touchAreasContainer}>
                {evolution.graphPoints.map((point, i) => {
                  const totalPeriods = evolution.totalPeriods;
                  let label = '';
                  let scoreInfo = '';
                  let myTeamScoreChange = '';
                  let opponentScoreChange = '';

                  if (i === 0) {
                    label = 'Début du match';
                  } else if (point.period !== undefined && point.actionIndex !== undefined && evolution.scoringActions) {
                    const action = evolution.scoringActions[point.actionIndex];
                    const previousPoint = evolution.graphPoints[i - 1];
                    const periodLabel = getPeriodLabel(point.period, totalPeriods);

                    if (action) {
                      const pointsScored = action.points || 0;
                      const scorerTeam = action.team === Team.MY_TEAM
                        ? (match.my_team_name || "Notre équipe")
                        : (match.opponent_name || "Adversaire");

                      let shotType = '';
                      if (pointsScored === 1) shotType = 'LF';
                      else if (pointsScored === 2) shotType = '2pts';
                      else if (pointsScored === 3) shotType = '3pts';

                      label = periodLabel;
                      scoreInfo = `${scorerTeam} - ${shotType}`;

                      // Calculate score changes
                      if (action.team === Team.MY_TEAM) {
                        myTeamScoreChange = `${previousPoint.myTeam} → ${point.myTeam} (+${pointsScored})`;
                        opponentScoreChange = `${previousPoint.opponent} → ${point.opponent}`;
                      } else {
                        myTeamScoreChange = `${previousPoint.myTeam} → ${point.myTeam}`;
                        opponentScoreChange = `${previousPoint.opponent} → ${point.opponent} (+${pointsScored})`;
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
                                {myTeamScoreChange ? (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {myTeamScoreChange}
                                  </Text>
                                ) : (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {point.myTeam}
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
                                {opponentScoreChange ? (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {opponentScoreChange}
                                  </Text>
                                ) : (
                                  <Text style={[styles.tooltipScoreChange, { color: colors.text.primary }]}>
                                    {point.opponent}
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
          {hasHandicap && (
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.primary, opacity: 0.4 },
                ]}
              />
              <Text
                style={[styles.legendText, { color: colors.text.secondary }]}
              >
                HCP = Handicap de départ
              </Text>
            </View>
          )}
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
  hcpBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 3,
  },
  hcpBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
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
