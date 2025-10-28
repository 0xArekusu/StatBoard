import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActionData } from "../components/ActionSystem";
import { PDFExportService } from "../src/services/export/PDFExportService";
import { LineChart } from "react-native-chart-kit";
import { ROUTES } from "../constants/routes";
import PDFPreviewModal from "../components/PDFPreviewModal";
import LocalSaveWarningModal from "../components/LocalSaveWarningModal";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { useAuth } from "../src/contexts/AuthContext";
import { MatchSyncPolicy } from "../src/services/match/MatchSyncPolicy";
import type { SubscriptionTier } from "../models/Subscription";

interface MatchSummaryScreenProps {}

export default function MatchSummaryScreen({}: MatchSummaryScreenProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const params = route.params as {
    matchId?: number;
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
    actions: ActionData[];
    matchFormat: "2_halves" | "4_quarters";
    periodDuration: number;
    teamMode: "A" | "B" | "both";
    players: Array<{
      id: number;
      num: number;
      name: string;
      team: "A" | "B";
    }>;
    fromHistory?: boolean; // Indicates if coming from history (read-only)
    scoreWasManuallyAdjusted?: boolean; // Indicates if score was manually adjusted
  };

  const {
    matchId,
    teamA,
    teamB,
    scoreA,
    scoreB,
    actions,
    matchFormat,
    periodDuration,
    teamMode,
    players,
    fromHistory = false,
    scoreWasManuallyAdjusted = false,
  } = params;

  // Local state for adjustable scores
  const [adjustedScoreA, setAdjustedScoreA] = React.useState(scoreA);
  const [adjustedScoreB, setAdjustedScoreB] = React.useState(scoreB);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [localSaveWarningVisible, setLocalSaveWarningVisible] = useState(false);
  const [canEditScoreA, setCanEditScoreA] = useState(teamMode === "B");
  const [canEditScoreB, setCanEditScoreB] = useState(teamMode === "A");
  const [scoreManuallyAdjusted, setScoreManuallyAdjusted] = useState(scoreWasManuallyAdjusted);

  // Update local scores when props change
  React.useEffect(() => {
    setAdjustedScoreA(scoreA);
    setAdjustedScoreB(scoreB);
  }, [scoreA, scoreB]);

  // Save initial scores when arriving on this screen
  React.useEffect(() => {
    const saveInitialScores = async () => {
      if (matchId && !fromHistory) {
        try {
          const matchRepo = new MatchRepository();
          await matchRepo.updateFinalScores(matchId, scoreA, scoreB);
          console.log("✅ Initial scores saved:", { scoreA, scoreB });
        } catch (error) {
          console.error("Error saving initial scores:", error);
        }
      }
    };
    saveInitialScores();
  }, [matchId, fromHistory]);

  // Show local save warning modal if not premium (only when coming from match, not history)
  React.useEffect(() => {
    if (!fromHistory) {
      const syncPolicy = new MatchSyncPolicy();
      const limits = syncPolicy.getLimits(!!user, 'free');

      // Show warning if user cannot sync to server
      if (!limits.canSyncToServer) {
        // Delay to avoid showing multiple modals at once
        const timer = setTimeout(() => {
          setLocalSaveWarningVisible(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, fromHistory]);

  // Track when scores are actually changed and save to database
  React.useEffect(() => {
    const saveScores = async () => {
      if (matchId && !fromHistory) {
        try {
          const matchRepo = new MatchRepository();
          // Only mark as manually adjusted if editing the controlled team's score
          const isControlledTeam = (teamMode === "A") || (teamMode === "both");
          await matchRepo.updateFinalScores(matchId, adjustedScoreA, adjustedScoreB, scoreManuallyAdjusted);
        } catch (error) {
          console.error("Error saving final scores:", error);
        }
      }
    };

    if (canEditScoreA && adjustedScoreA !== scoreA) {
      // Only set manually adjusted if we're editing a controlled team (Team A when teamMode is A or both)
      const isControlledTeam = (teamMode === "A") || (teamMode === "both");
      if (isControlledTeam) {
        setScoreManuallyAdjusted(true);
      }
      saveScores();
    }
  }, [adjustedScoreA, scoreA, canEditScoreA, matchId, fromHistory, teamMode, scoreManuallyAdjusted]);

  React.useEffect(() => {
    const saveScores = async () => {
      if (matchId && !fromHistory) {
        try {
          const matchRepo = new MatchRepository();
          await matchRepo.updateFinalScores(matchId, adjustedScoreA, adjustedScoreB, scoreManuallyAdjusted);
        } catch (error) {
          console.error("Error saving final scores:", error);
        }
      }
    };

    if (canEditScoreB && adjustedScoreB !== scoreB) {
      // Only set manually adjusted if we're editing a controlled team (Team B when teamMode is B or both)
      const isControlledTeam = (teamMode === "B") || (teamMode === "both");
      if (isControlledTeam) {
        setScoreManuallyAdjusted(true);
      }
      saveScores();
    }
  }, [adjustedScoreB, scoreB, canEditScoreB, matchId, fromHistory, adjustedScoreA, teamMode, scoreManuallyAdjusted]);

  // Calculate winner based on adjusted scores
  const winner =
    adjustedScoreA > adjustedScoreB
      ? teamA
      : adjustedScoreB > adjustedScoreA
      ? teamB
      : null;

  // Calculate shooting statistics
  const calculateShootingStats = (team: "A" | "B") => {
    const teamShots = actions.filter(
      (action) => action.type === "tir" && action.team === team
    );

    const madeShots = teamShots.filter(
      (action) => action.specification === "reussi"
    );
    const missedShots = teamShots.filter(
      (action) => action.specification === "rate"
    );

    const totalShots = teamShots.length;
    const percentage =
      totalShots > 0 ? Math.round((madeShots.length / totalShots) * 100) : 0;

    // Count by points (made)
    const onePointersMade = madeShots.filter(
      (action) => action.points === 1
    ).length;
    const twoPointersMade = madeShots.filter(
      (action) => action.points === 2
    ).length;
    const threePointersMade = madeShots.filter(
      (action) => action.points === 3
    ).length;

    // Count by points (total attempts)
    const onePtShots = teamShots.filter((action) => action.points === 1);
    const twoPtShots = teamShots.filter((action) => action.points === 2);
    const threePtShots = teamShots.filter((action) => action.points === 3);

    // Calculate percentages by point type
    const onePtPercentage =
      onePtShots.length > 0
        ? Math.round((onePointersMade / onePtShots.length) * 100)
        : 0;
    const twoPtPercentage =
      twoPtShots.length > 0
        ? Math.round((twoPointersMade / twoPtShots.length) * 100)
        : 0;
    const threePtPercentage =
      threePtShots.length > 0
        ? Math.round((threePointersMade / threePtShots.length) * 100)
        : 0;

    return {
      made: madeShots.length,
      missed: missedShots.length,
      total: totalShots,
      percentage,
      onePointersMade,
      twoPointersMade,
      threePointersMade,
      onePtTotal: onePtShots.length,
      twoPtTotal: twoPtShots.length,
      threePtTotal: threePtShots.length,
      onePtPercentage,
      twoPtPercentage,
      threePtPercentage,
    };
  };

  const statsA = calculateShootingStats("A");
  const statsB = calculateShootingStats("B");

  // Calculate rebounds statistics
  const calculateReboundsStats = (team: "A" | "B") => {
    const teamRebounds = actions.filter(
      (action) => action.type === "rebond" && action.team === team
    );

    const offensive = teamRebounds.filter(
      (action) => action.specification === "offensif"
    ).length;
    const defensive = teamRebounds.filter(
      (action) => action.specification === "defensif"
    ).length;

    return {
      offensive,
      defensive,
      total: teamRebounds.length,
    };
  };

  const reboundsA = calculateReboundsStats("A");
  const reboundsB = calculateReboundsStats("B");

  // Calculate fouls statistics
  const calculateFoulsStats = (team: "A" | "B") => {
    const teamFouls = actions.filter(
      (action) => action.type === "faute" && action.team === team
    );

    const personal = teamFouls.filter(
      (action) => action.specification === "personnelle"
    ).length;
    const technical = teamFouls.filter(
      (action) => action.specification === "technique"
    ).length;

    return {
      personal,
      technical,
      total: teamFouls.length,
    };
  };

  const foulsA = calculateFoulsStats("A");
  const foulsB = calculateFoulsStats("B");

  // Calculate scores by period
  const calculateScoresByPeriod = () => {
    const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
    const periodScoresA: number[] = Array(totalPeriods).fill(0);
    const periodScoresB: number[] = Array(totalPeriods).fill(0);

    // Sort actions by timestamp
    const sortedActions = [...actions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Divide actions into periods based on their position in the timeline
    const actionsPerPeriod = Math.ceil(sortedActions.length / totalPeriods);

    sortedActions.forEach((action, index) => {
      // Determine which period this action belongs to
      const periodIndex = Math.min(
        Math.floor(index / actionsPerPeriod),
        totalPeriods - 1
      );

      // Only count successful shots for scoring
      if (action.type === "tir" && action.specification === "reussi") {
        const points = action.points || 2;
        if (action.team === "A") {
          periodScoresA[periodIndex] += points;
        } else if (action.team === "B") {
          periodScoresB[periodIndex] += points;
        }
      }
    });

    return { periodScoresA, periodScoresB, totalPeriods };
  };

  const { periodScoresA, periodScoresB, totalPeriods } =
    calculateScoresByPeriod();

  // Calculate cumulative scores for chart
  const cumulativeScoresA = periodScoresA.reduce((acc, score, index) => {
    acc.push((acc[index - 1] || 0) + score);
    return acc;
  }, [] as number[]);

  const cumulativeScoresB = periodScoresB.reduce((acc, score, index) => {
    acc.push((acc[index - 1] || 0) + score);
    return acc;
  }, [] as number[]);

  // Calculate player stats for preview (same as PDFExportService)
  const calculatePlayerStats = (playerId: number) => {
    const playerActions = actions.filter((a) => a.player === playerId);

    // Shots
    const shots = playerActions.filter((a) => a.type === "tir");
    const madeShots = shots.filter((a) => a.specification === "reussi");

    const onePtMade = madeShots.filter((a) => a.points === 1).length;
    const twoPtMade = madeShots.filter((a) => a.points === 2).length;
    const threePtMade = madeShots.filter((a) => a.points === 3).length;

    const onePtAttempts = shots.filter((a) => a.points === 1).length;
    const twoPtAttempts = shots.filter((a) => a.points === 2).length;
    const threePtAttempts = shots.filter((a) => a.points === 3).length;

    const totalPoints = onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter((a) => a.type === "rebond");
    const offRebounds = rebounds.filter((a) => a.specification === "offensif").length;
    const defRebounds = rebounds.filter((a) => a.specification === "defensif").length;

    // Assists
    const assists = playerActions.filter((a) => a.type === "passe").length;

    // Fouls
    const fouls = playerActions.filter((a) => a.type === "faute");
    const personalFouls = fouls.filter((a) => a.specification === "personnelle").length;
    const technicalFouls = fouls.filter((a) => a.specification === "technique").length;

    return {
      points: totalPoints,
      fgm: twoPtMade + threePtMade,
      fga: twoPtAttempts + threePtAttempts,
      twopm: twoPtMade,
      twopa: twoPtAttempts,
      threepm: threePtMade,
      threepa: threePtAttempts,
      ftm: onePtMade,
      fta: onePtAttempts,
      orb: offRebounds,
      drb: defRebounds,
      trb: offRebounds + defRebounds,
      pf: personalFouls,
      tf: technicalFouls,
    };
  };

  const playersTeamA = (teamMode === "A" || teamMode === "both")
    ? players.filter(p => p.team === "A")
    : [];
  const playersTeamB = (teamMode === "B" || teamMode === "both")
    ? players.filter(p => p.team === "B")
    : [];

  const statsTeamA = playersTeamA.map(player => ({
    ...player,
    stats: calculatePlayerStats(player.id),
  }));

  const statsTeamB = playersTeamB.map(player => ({
    ...player,
    stats: calculatePlayerStats(player.id),
  }));

  const periodLabel = matchFormat === "2_halves" ? "MT" : "Q";

  const handleViewDetails = () => {
    (navigation.navigate as any)("MatchDetails", { ...params, scoreA: adjustedScoreA, scoreB: adjustedScoreB });
  };

  const handleBackToMenu = () => {
    navigation.navigate(ROUTES.MAIN_MENU as never);
  };

  const handleUnlockScoreEdit = (team: "A" | "B") => {
    Alert.alert(
      "Corriger le score",
      "Attention : si vous modifiez manuellement le score, les statistiques peuvent ne plus correspondre au score affiché.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Continuer",
          onPress: () => {
            if (team === "A") {
              setCanEditScoreA(true);
            } else {
              setCanEditScoreB(true);
            }
            setScoreManuallyAdjusted(true);
          },
        },
      ]
    );
  };

  const handlePreviewPDF = () => {
    setPreviewModalVisible(true);
  };

  const handleExportPDF = async () => {
    try {
      await PDFExportService.generateMatchPDF({
        teamA,
        teamB,
        scoreA: adjustedScoreA,
        scoreB: adjustedScoreB,
        actions,
        matchFormat,
        periodDuration,
        teamMode,
        players,
        watermark: false,
        scoreManuallyAdjusted,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Erreur", "Impossible de générer le PDF");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏀 Match Terminé</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Final Score */}
        <View style={styles.scoreSection}>
          <Text style={styles.sectionTitle}>Score Final</Text>

          <View style={styles.scoreContainer}>
            {/* Team A Score */}
            <View style={styles.teamScore}>
              <View style={styles.teamNameRow}>
                <Text style={styles.teamName}>{teamA}</Text>
                {!fromHistory && !canEditScoreA && (
                  <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={() => handleUnlockScoreEdit("A")}
                  >
                    <Text style={styles.unlockIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.scoreAdjustContainer}>
                {!fromHistory && canEditScoreA && (
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => {
                      setAdjustedScoreA(Math.max(0, adjustedScoreA - 1));
                    }}
                  >
                    <Text style={styles.adjustButtonText}>−</Text>
                  </TouchableOpacity>
                )}
                <TextInput
                  style={[
                    styles.scoreInput,
                    (fromHistory || !canEditScoreA) && styles.scoreInputReadOnly,
                    winner === teamA && styles.winnerScore,
                  ]}
                  value={adjustedScoreA.toString()}
                  onChangeText={(text) => {
                    if (!fromHistory && canEditScoreA) {
                      const value = parseInt(text) || 0;
                      setAdjustedScoreA(Math.max(0, value));
                    }
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  editable={!fromHistory && canEditScoreA}
                />
                {!fromHistory && canEditScoreA && (
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => setAdjustedScoreA(adjustedScoreA + 1)}
                  >
                    <Text style={styles.adjustButtonText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={styles.scoreSeparator}>-</Text>

            {/* Team B Score */}
            <View style={styles.teamScore}>
              <View style={styles.teamNameRow}>
                <Text style={styles.teamName}>{teamB}</Text>
                {!fromHistory && !canEditScoreB && (
                  <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={() => handleUnlockScoreEdit("B")}
                  >
                    <Text style={styles.unlockIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.scoreAdjustContainer}>
                {!fromHistory && canEditScoreB && (
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => {
                      setAdjustedScoreB(Math.max(0, adjustedScoreB - 1));
                    }}
                  >
                    <Text style={styles.adjustButtonText}>−</Text>
                  </TouchableOpacity>
                )}
                <TextInput
                  style={[
                    styles.scoreInput,
                    (fromHistory || !canEditScoreB) && styles.scoreInputReadOnly,
                    winner === teamB && styles.winnerScore,
                  ]}
                  value={adjustedScoreB.toString()}
                  onChangeText={(text) => {
                    if (!fromHistory && canEditScoreB) {
                      const value = parseInt(text) || 0;
                      setAdjustedScoreB(Math.max(0, value));
                    }
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  editable={!fromHistory && canEditScoreB}
                />
                {!fromHistory && canEditScoreB && (
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => setAdjustedScoreB(adjustedScoreB + 1)}
                  >
                    <Text style={styles.adjustButtonText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Winner announcement */}
          {winner ? (
            <View style={styles.winnerBanner}>
              <Text style={styles.winnerText}>
                🏆 {winner} remporte le match !
              </Text>
            </View>
          ) : (
            <View style={styles.drawBanner}>
              <Text style={styles.drawText}>Match nul</Text>
            </View>
          )}

          {/* Manual score adjustment warning */}
          {scoreManuallyAdjusted && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠️ Score ajusté manuellement - Les statistiques peuvent ne pas correspondre au score affiché
              </Text>
            </View>
          )}

          {/* Period Scores Table */}
          <View style={styles.periodTable}>
            <View style={styles.periodTableHeader}>
              <View style={styles.periodTableCellTeam}>
                <Text style={styles.periodTableHeaderText}></Text>
              </View>
              {Array.from({ length: totalPeriods }).map((_, index) => (
                <View key={index} style={styles.periodTableCell}>
                  <Text style={styles.periodTableHeaderText}>
                    {matchFormat === "2_halves"
                      ? `MT${index + 1}`
                      : `Q${index + 1}`}
                  </Text>
                </View>
              ))}
              <View style={styles.periodTableCell}>
                <Text style={styles.periodTableHeaderText}>Total</Text>
              </View>
            </View>

            {/* Team A Row - Show if managing Team A or both */}
            {(teamMode === "A" || teamMode === "both") && (
              <View style={styles.periodTableRow}>
                <View style={styles.periodTableCellTeam}>
                  <Text style={styles.periodTableTeamText}>{teamA}</Text>
                </View>
                {periodScoresA.map((score, index) => {
                  // Only highlight winner if managing both teams
                  const isWinner =
                    teamMode === "both" && score > periodScoresB[index];
                  return (
                    <View
                      key={index}
                      style={[
                        styles.periodTableCell,
                        isWinner && styles.periodWinnerCell,
                      ]}
                    >
                      <Text
                        style={[
                          styles.periodTableScoreText,
                          isWinner && styles.periodWinnerText,
                        ]}
                      >
                        {score}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.periodTableCell}>
                  <Text style={styles.periodTableTotalText}>
                    {adjustedScoreA}
                  </Text>
                </View>
              </View>
            )}

            {/* Team B Row - Show if managing Team B or both */}
            {(teamMode === "B" || teamMode === "both") && (
              <View style={styles.periodTableRow}>
                <View style={styles.periodTableCellTeam}>
                  <Text style={styles.periodTableTeamText}>{teamB}</Text>
                </View>
                {periodScoresB.map((score, index) => {
                  const isWinner = teamMode === "both" && score > periodScoresA[index];
                  return (
                    <View
                      key={index}
                      style={[
                        styles.periodTableCell,
                        isWinner && styles.periodWinnerCell,
                      ]}
                    >
                      <Text
                        style={[
                          styles.periodTableScoreText,
                          isWinner && styles.periodWinnerText,
                        ]}
                      >
                        {score}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.periodTableCell}>
                  <Text style={styles.periodTableTotalText}>
                    {adjustedScoreB}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Score Evolution Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Évolution du score</Text>
          <LineChart
            data={{
              labels: [
                "Début",
                ...Array.from({ length: totalPeriods }).map((_, i) =>
                  matchFormat === "2_halves" ? `MT${i + 1}` : `Q${i + 1}`
                ),
              ],
              datasets: [
                ...(teamMode === "A" || teamMode === "both"
                  ? [
                      {
                        data: [0, ...cumulativeScoresA],
                        color: () => "#FF6B35",
                        strokeWidth: 3,
                      },
                    ]
                  : []),
                ...(teamMode === "B" || teamMode === "both"
                  ? [
                      {
                        data: [0, ...cumulativeScoresB],
                        color: () => "#004E89",
                        strokeWidth: 3,
                      },
                    ]
                  : []),
              ],
              legend: [
                ...(teamMode === "A" || teamMode === "both" ? [teamA] : []),
                ...(teamMode === "B" || teamMode === "both" ? [teamB] : []),
              ],
            }}
            width={Dimensions.get("window").width - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "5",
                strokeWidth: "2",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Shooting Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistiques de tir</Text>

          {/* Team A Stats - Show if managing Team A or both */}
          {(teamMode === "A" || teamMode === "both") && (
            <View style={styles.teamStatsContainer}>
              <Text style={styles.teamStatsName}>{teamA}</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>
                  {statsA.made}/{statsA.total} ({statsA.percentage}%)
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>1 point</Text>
                <Text style={styles.statValue}>
                  {statsA.onePointersMade}/{statsA.onePtTotal} (
                  {statsA.onePtPercentage}%)
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>2 points</Text>
                <Text style={styles.statValue}>
                  {statsA.twoPointersMade}/{statsA.twoPtTotal} (
                  {statsA.twoPtPercentage}%)
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>3 points</Text>
                <Text style={styles.statValue}>
                  {statsA.threePointersMade}/{statsA.threePtTotal} (
                  {statsA.threePtPercentage}%)
                </Text>
              </View>
            </View>
          )}

          {/* Team B Stats - Show if managing Team B or both */}
          {(teamMode === "B" || teamMode === "both") && (
            <View
              style={[styles.teamStatsContainer, styles.teamBStats, teamMode === "both" && styles.teamStatsMargin]}
            >
              <Text style={styles.teamStatsName}>{teamB}</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>
                  {statsB.made}/{statsB.total} ({statsB.percentage}%)
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>1 point</Text>
                <Text style={styles.statValue}>
                  {statsB.onePointersMade}/{statsB.onePtTotal} (
                  {statsB.onePtPercentage}%)
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>2 points</Text>
                <Text style={styles.statValue}>
                  {statsB.twoPointersMade}/{statsB.twoPtTotal} (
                  {statsB.twoPtPercentage}%)
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>3 points</Text>
                <Text style={styles.statValue}>
                  {statsB.threePointersMade}/{statsB.threePtTotal} (
                  {statsB.threePtPercentage}%)
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Rebounds and Fouls Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Rebonds & Fautes</Text>

          <View style={styles.compactStatsContainer}>
            {/* Team A - Show if managing Team A or both */}
            {(teamMode === "A" || teamMode === "both") && (
              <View style={styles.compactTeamStats}>
                <Text style={styles.compactTeamName}>{teamA}</Text>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Rebonds</Text>
                  <Text style={styles.compactStatValue}>
                    {reboundsA.total}
                  </Text>
                  <Text style={styles.compactStatDetail}>
                    (Off: {reboundsA.offensive} | Def: {reboundsA.defensive})
                  </Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Fautes</Text>
                  <Text style={styles.compactStatValue}>{foulsA.total}</Text>
                  <Text style={styles.compactStatDetail}>
                    (Pers: {foulsA.personal} | Tech: {foulsA.technical})
                  </Text>
                </View>
              </View>
            )}

            {/* Separator - Only show if managing both teams */}
            {teamMode === "both" && (
              <View style={styles.compactSeparator} />
            )}

            {/* Team B - Show if managing Team B or both */}
            {(teamMode === "B" || teamMode === "both") && (
              <View style={styles.compactTeamStats}>
                <Text style={styles.compactTeamName}>{teamB}</Text>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Rebonds</Text>
                  <Text style={styles.compactStatValue}>
                    {reboundsB.total}
                  </Text>
                  <Text style={styles.compactStatDetail}>
                    (Off: {reboundsB.offensive} | Def: {reboundsB.defensive}
                    )
                  </Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Fautes</Text>
                  <Text style={styles.compactStatValue}>
                    {foulsB.total}
                  </Text>
                  <Text style={styles.compactStatDetail}>
                    (Pers: {foulsB.personal} | Tech: {foulsB.technical})
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.previewButton]}
          onPress={handlePreviewPDF}
        >
          <Text style={styles.previewButtonText}>👁️ Aperçu PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.premiumButton]}
          onPress={handleExportPDF}
        >
          <Text style={styles.premiumButtonText}>⭐ Export PDF Premium</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleViewDetails}
        >
          <Text style={styles.secondaryButtonText}>📊 Détails</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleBackToMenu}
        >
          <Text style={styles.primaryButtonText}>🏠 Menu</Text>
        </TouchableOpacity>
      </View>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        visible={previewModalVisible}
        onClose={() => setPreviewModalVisible(false)}
        teamA={teamA}
        teamB={teamB}
        scoreA={adjustedScoreA}
        scoreB={adjustedScoreB}
        periodScoresA={periodScoresA}
        periodScoresB={periodScoresB}
        cumulativeScoresA={cumulativeScoresA}
        cumulativeScoresB={cumulativeScoresB}
        statsTeamA={statsTeamA}
        statsTeamB={statsTeamB}
        periodLabel={periodLabel}
        teamMode={teamMode}
        scoreManuallyAdjusted={scoreManuallyAdjusted}
      />

      {/* Local Save Warning Modal */}
      <LocalSaveWarningModal
        visible={localSaveWarningVisible}
        isConnected={!!user}
        onClose={() => setLocalSaveWarningVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#FF6B35",
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  scoreSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  teamScore: {
    alignItems: "center",
    flex: 1,
  },
  teamNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  unlockButton: {
    padding: 4,
  },
  unlockIcon: {
    fontSize: 16,
  },
  scoreAdjustContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  adjustButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  scoreInput: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
    minWidth: 80,
    textAlign: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f9f9f9",
  },
  scoreInputReadOnly: {
    backgroundColor: "#e0e0e0",
    borderColor: "#999",
    color: "#666",
  },
  winnerScore: {
    color: "#4CAF50",
    borderColor: "#4CAF50",
  },
  scoreSeparator: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ccc",
    marginHorizontal: 16,
  },
  winnerBanner: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  winnerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  drawBanner: {
    backgroundColor: "#FF9800",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  drawText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  warningBanner: {
    backgroundColor: "#FFF3E0",
    borderWidth: 2,
    borderColor: "#FF9800",
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
  },
  warningText: {
    color: "#E65100",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  periodTable: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  periodTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
  },
  periodTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  periodTableCell: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#e0e0e0",
  },
  periodTableCellTeam: {
    flex: 1.5,
    padding: 8,
    justifyContent: "center",
    paddingLeft: 12,
  },
  periodWinnerCell: {
    backgroundColor: "#e8f5e9",
  },
  periodTableHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  periodTableTeamText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  periodTableScoreText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  periodWinnerText: {
    fontWeight: "bold",
    color: "#4CAF50",
  },
  periodTableTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  statsSection: {
    marginBottom: 16,
  },
  sideBySideContainer: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  teamStatsContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  teamBStats: {
    borderLeftColor: "#2196F3",
  },
  teamStatsMargin: {
    marginTop: 12,
    borderLeftColor: "#2196F3",
  },
  teamStatsName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  compactStatsContainer: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    gap: 16,
  },
  compactTeamStats: {
    flex: 1,
  },
  compactSeparator: {
    width: 1,
    backgroundColor: "#ddd",
  },
  compactTeamName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  compactStatItem: {
    marginBottom: 8,
  },
  compactStatLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  compactStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  compactStatDetail: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  previewButton: {
    backgroundColor: "#2196F3",
  },
  previewButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  premiumButton: {
    backgroundColor: "#FFD700",
    borderWidth: 2,
    borderColor: "#FFA500",
  },
  premiumButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  chartSection: {
    marginBottom: 24,
    alignItems: "center",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
});
