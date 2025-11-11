/**
 * MatchSummaryScreen
 *
 * Displays match statistics and summary after a match is completed.
 * Features:
 * - View match scores and statistics
 * - Adjust scores manually (if not from history)
 * - View player statistics
 * - View score evolution chart
 * - Export match to PDF
 * - Sync match to Supabase (subscription-based)
 * All database operations (SQLite and Supabase) are logged for debugging.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
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
import { useMatchSync } from "../src/hooks/useMatchSync";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
} from "../src/models/ActionTypes";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { logInfo, logError, logWarn } from "../utils/logger";

interface MatchSummaryScreenProps {}

export default function MatchSummaryScreen({}: MatchSummaryScreenProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { isSyncing, error: syncError, syncMatch, checkEligibility } = useMatchSync();
  const params = route.params as {
    matchId?: number;
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
    actions: ActionData[];
    matchFormat: "2_halves" | "4_quarters";
    periodDuration: number;
    teamMode: "A" | "B" | "BOTH";
    players: Array<{
      id: number;
      num: number;
      name: string;
      team: "A" | "B";
    }>;
    fromHistory?: boolean; // Indicates if coming from history (read-only)
    scoreWasManuallyAdjusted?: boolean; // Indicates if score was manually adjusted
    clubTeamOverride?: "A" | "B" | null; // Override for determining club team
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
    clubTeamOverride = null,
  } = params;

  // Local state for adjustable scores
  const [adjustedScoreA, setAdjustedScoreA] = React.useState(scoreA);
  const [adjustedScoreB, setAdjustedScoreB] = React.useState(scoreB);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [localSaveWarningVisible, setLocalSaveWarningVisible] = useState(false);
  const [canEditScoreA, setCanEditScoreA] = useState(teamMode === "B");
  const [canEditScoreB, setCanEditScoreB] = useState(teamMode === "A");
  const [scoreManuallyAdjusted, setScoreManuallyAdjusted] = useState(scoreWasManuallyAdjusted);
  const [syncModalVisible, setSyncModalVisible] = useState(false);

  /**
   * Log screen mount when user arrives on the view
   */
  useEffect(() => {
    logInfo('MatchSummaryScreen', '📱 Screen mounted - User arrived on match summary', {
      matchId,
      teamA,
      teamB,
      scoreA,
      scoreB,
      fromHistory,
      teamMode,
      playersCount: players.length,
      actionsCount: actions.length
    });
  }, []);

  /**
   * Update local scores when props change
   */
  React.useEffect(() => {
    setAdjustedScoreA(scoreA);
    setAdjustedScoreB(scoreB);
  }, [scoreA, scoreB]);

  /**
   * Save initial scores when arriving on this screen
   * Only saves if not viewing from history (read-only mode)
   */
  React.useEffect(() => {
    const saveInitialScores = async () => {
      if (matchId && !fromHistory) {
        logInfo('MatchSummaryScreen', '💾 Saving initial scores to SQLite', {
          matchId,
          scoreA,
          scoreB
        });

        try {
          const matchRepo = new MatchRepository();
          await matchRepo.updateFinalScores(matchId, scoreA, scoreB);

          logInfo('MatchSummaryScreen', '✅ Initial scores saved to SQLite', {
            matchId,
            scoreA,
            scoreB
          });
        } catch (error) {
          logError('MatchSummaryScreen', '❌ Error saving initial scores to SQLite', {
            matchId,
            scoreA,
            scoreB,
            error: error instanceof Error ? error.message : error
          });
        }
      }
    };
    saveInitialScores();
  }, [matchId, fromHistory]);

  // Sync or show warning will be triggered when user clicks "Menu" button
  // (removed auto-sync on mount)

  /**
   * Track when Team A score changes and save to SQLite database
   */
  React.useEffect(() => {
    const saveScores = async () => {
      if (matchId && !fromHistory) {
        logInfo('MatchSummaryScreen', '💾 Saving adjusted Team A score to SQLite', {
          matchId,
          adjustedScoreA,
          adjustedScoreB,
          scoreManuallyAdjusted
        });

        try {
          const matchRepo = new MatchRepository();
          await matchRepo.updateFinalScores(matchId, adjustedScoreA, adjustedScoreB, scoreManuallyAdjusted);

          logInfo('MatchSummaryScreen', '✅ Team A score saved to SQLite', {
            matchId,
            adjustedScoreA
          });
        } catch (error) {
          logError('MatchSummaryScreen', '❌ Error saving Team A score to SQLite', {
            matchId,
            adjustedScoreA,
            error: error instanceof Error ? error.message : error
          });
        }
      }
    };

    if (canEditScoreA && adjustedScoreA !== scoreA) {
      // Save scores when adjusted
      saveScores();
    }
  }, [adjustedScoreA, scoreA, canEditScoreA, matchId, fromHistory, teamMode, scoreManuallyAdjusted]);

  /**
   * Track when Team B score changes and save to SQLite database
   */
  React.useEffect(() => {
    const saveScores = async () => {
      if (matchId && !fromHistory) {
        logInfo('MatchSummaryScreen', '💾 Saving adjusted Team B score to SQLite', {
          matchId,
          adjustedScoreA,
          adjustedScoreB,
          scoreManuallyAdjusted
        });

        try {
          const matchRepo = new MatchRepository();
          await matchRepo.updateFinalScores(matchId, adjustedScoreA, adjustedScoreB, scoreManuallyAdjusted);

          logInfo('MatchSummaryScreen', '✅ Team B score saved to SQLite', {
            matchId,
            adjustedScoreB
          });
        } catch (error) {
          logError('MatchSummaryScreen', '❌ Error saving Team B score to SQLite', {
            matchId,
            adjustedScoreB,
            error: error instanceof Error ? error.message : error
          });
        }
      }
    };

    if (canEditScoreB && adjustedScoreB !== scoreB) {
      // Save scores when adjusted
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

  // Determine if club team won or lost
  // Use clubTeamOverride if provided (from history/BoardScreen)
  const clubTeam = clubTeamOverride;
  const isClubMatch = clubTeam !== null;
  const clubTeamName = clubTeam === "A" ? teamA : clubTeam === "B" ? teamB : null;
  const clubWon = isClubMatch && winner === clubTeamName;
  const clubLost = isClubMatch && winner !== null && winner !== clubTeamName;

  // Log winner logic for debugging win/loss detection
  logInfo('MatchSummaryScreen', '🏆 Winner logic calculated', {
    teamMode,
    clubTeamOverride,
    clubTeam,
    isClubMatch,
    teamA,
    teamB,
    clubTeamName,
    winner,
    adjustedScoreA,
    adjustedScoreB,
    clubWon,
    clubLost
  });

  // Calculate shooting statistics
  const calculateShootingStats = (team: "A" | "B") => {
    const teamShots = actions.filter(
      (action) => action.type === ActionType.SHOT && action.team === team
    );

    const madeShots = teamShots.filter(
      (action) => action.specification === ShotSpecification.MADE
    );
    const missedShots = teamShots.filter(
      (action) => action.specification === ShotSpecification.MISSED
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
      (action) => action.type === ActionType.REBOUND && action.team === team
    );

    const offensive = teamRebounds.filter(
      (action) => action.specification === ReboundSpecification.OFFENSIVE
    ).length;
    const defensive = teamRebounds.filter(
      (action) => action.specification === ReboundSpecification.DEFENSIVE
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
      (action) => action.type === ActionType.FOUL && action.team === team
    );

    const personal = teamFouls.filter(
      (action) => action.specification === FoulSpecification.PERSONAL
    ).length;
    const technical = teamFouls.filter(
      (action) => action.specification === FoulSpecification.TECHNICAL
    ).length;
    const penality = teamFouls.filter(
      (action) => action.specification === FoulSpecification.PENALITY
    ).length;
    const disqualification = teamFouls.filter(
      (action) => action.specification === FoulSpecification.DISQUALIFICATION
    ).length;

    return {
      personal,
      technical,
      penality,
      disqualification,
      total: teamFouls.length,
    };
  };

  const foulsA = calculateFoulsStats("A");
  const foulsB = calculateFoulsStats("B");

  // Calculate other statistics (assists, steals, blocks, turnovers)
  const calculateOtherStats = (team: "A" | "B") => {
    const teamActions = actions.filter((action) => action.team === team);

    const assists = teamActions.filter((action) => action.type === ActionType.ASSIST).length;
    const steals = teamActions.filter((action) => action.type === ActionType.STEAL).length;
    const blocks = teamActions.filter((action) => action.type === ActionType.BLOCK).length;
    const turnovers = teamActions.filter((action) => action.type === ActionType.TURNOVER).length;

    return {
      assists,
      steals,
      blocks,
      turnovers,
    };
  };

  const otherStatsA = calculateOtherStats("A");
  const otherStatsB = calculateOtherStats("B");

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
      if (action.type === ActionType.SHOT && action.specification === ShotSpecification.MADE) {
        const points = action.points || 0;
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
    const shots = playerActions.filter((a) => a.type === ActionType.SHOT);
    const madeShots = shots.filter((a) => a.specification === ShotSpecification.MADE);

    const onePtMade = madeShots.filter((a) => a.points === 1).length;
    const twoPtMade = madeShots.filter((a) => a.points === 2).length;
    const threePtMade = madeShots.filter((a) => a.points === 3).length;

    const onePtAttempts = shots.filter((a) => a.points === 1).length;
    const twoPtAttempts = shots.filter((a) => a.points === 2).length;
    const threePtAttempts = shots.filter((a) => a.points === 3).length;

    const totalPoints = onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter((a) => a.type === ActionType.REBOUND);
    const offRebounds = rebounds.filter((a) => a.specification === ReboundSpecification.OFFENSIVE).length;
    const defRebounds = rebounds.filter((a) => a.specification === ReboundSpecification.DEFENSIVE).length;

    // New stats
    const assists = playerActions.filter((a) => a.type === ActionType.ASSIST).length;
    const steals = playerActions.filter((a) => a.type === ActionType.STEAL).length;
    const blocks = playerActions.filter((a) => a.type === ActionType.BLOCK).length;
    const turnovers = playerActions.filter((a) => a.type === ActionType.TURNOVER).length;

    // Fouls
    const fouls = playerActions.filter((a) => a.type === ActionType.FOUL);
    const personalFouls = fouls.filter((a) => a.specification === FoulSpecification.PERSONAL).length;
    const technicalFouls = fouls.filter((a) => a.specification === FoulSpecification.TECHNICAL).length;
    const penalityFouls = fouls.filter((a) => a.specification === FoulSpecification.PENALITY).length;
    const disqualificationFouls = fouls.filter((a) => a.specification === FoulSpecification.DISQUALIFICATION).length;

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

  const playersTeamA = (teamMode === "A" || teamMode === "BOTH")
    ? players.filter(p => p.team === "A")
    : [];
  const playersTeamB = (teamMode === "B" || teamMode === "BOTH")
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

  const handleBackToMenu = async () => {
    // If coming from history, just go back
    if (fromHistory) {
      navigation.navigate(ROUTES.MAIN_MENU as never);
      return;
    }

    // Check if we should sync or show local warning
    if (matchId) {
      logInfo('MatchSummaryScreen', '🔍 Checking sync eligibility for match', { matchId });

      const eligibility = await checkEligibility(matchId);

      logInfo('MatchSummaryScreen', '✅ Eligibility check complete', {
        matchId,
        canSync: eligibility.canSync,
        reason: eligibility.reason
      });

      if (eligibility.canSync) {
        // User has paid subscription - auto sync
        logInfo('MatchSummaryScreen', '📡 User can sync, starting sync process', { matchId });

        setSyncModalVisible(true);
        const result = await syncMatch(matchId);
        setSyncModalVisible(false);

        logInfo('MatchSummaryScreen', '📊 Sync operation completed', {
          matchId,
          success: result.success,
          error: result.error
        });

        if (!result.success) {
          // If sync fails, show error but don't block navigation
          logError('MatchSummaryScreen', '❌ Auto-sync failed', {
            matchId,
            error: result.error
          });
        } else {
          logInfo('MatchSummaryScreen', '✅ Match synced successfully to Supabase', {
            matchId
          });
        }
      } else {
        // User cannot sync (not connected or freemium) - show local warning
        logWarn('MatchSummaryScreen', '⚠️ User cannot sync, showing local warning modal', {
          matchId,
          reason: eligibility.reason,
          isAuthenticated: !!user
        });
        setLocalSaveWarningVisible(true);
        // Wait for modal to be closed before navigating
        return;
      }
    }

    // Navigate to main menu
    logInfo('MatchSummaryScreen', '🏠 Navigating to main menu');
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

  /**
   * Handle PDF preview button click
   * Opens the PDF preview modal to show match summary
   */
  const handlePreviewPDF = () => {
    logInfo('MatchSummaryScreen', '👁️ User clicked PDF preview button', {
      teamA,
      teamB,
      scoreA: adjustedScoreA,
      scoreB: adjustedScoreB,
      matchFormat,
      playersCount: players.length,
      actionsCount: actions.length,
      fromHistory
    });
    setPreviewModalVisible(true);
  };

  /**
   * Handle PDF export (Premium feature)
   * Generates and saves match summary as PDF file without watermark
   */
  const handleExportPDF = async () => {
    logInfo('MatchSummaryScreen', '⭐ User clicked Premium PDF export button', {
      teamA,
      teamB,
      scoreA: adjustedScoreA,
      scoreB: adjustedScoreB,
      matchFormat,
      playersCount: players.length,
      actionsCount: actions.length
    });

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

      logInfo('MatchSummaryScreen', '✅ Premium PDF generated and saved successfully', {
        teamA,
        teamB,
        finalScoreA: adjustedScoreA,
        finalScoreB: adjustedScoreB,
        withWatermark: false
      });
    } catch (error) {
      logError('MatchSummaryScreen', '❌ Error generating PDF', {
        error: error instanceof Error ? error.message : error,
        teamA,
        teamB
      });
      Alert.alert("Erreur", "Impossible de générer le PDF");
    }
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {fromHistory && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>🏀 Match Terminé</Text>
        {fromHistory && <View style={styles.backButton} />}
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Final Score */}
        <View style={styles.scoreSection}>
          <Text style={styles.sectionTitle}>Score Final</Text>

          <View style={styles.scoreContainer}>
            {/* Team A Score */}
            <View style={styles.teamScore}>
              <View style={styles.teamNameRow}>
                <Text
                  style={[
                    styles.teamName,
                    winner === teamA && !clubLost && styles.winnerTeamName,
                    clubLost && winner === teamA && styles.loserTeamName,
                  ]}
                >
                  {teamA}
                </Text>
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
                    winner === teamA && !clubLost && styles.winnerScore,
                    clubLost && winner === teamA && styles.loserScore,
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
                <Text
                  style={[
                    styles.teamName,
                    winner === teamB && !clubLost && styles.winnerTeamName,
                    clubLost && winner === teamB && styles.loserTeamName,
                  ]}
                >
                  {teamB}
                </Text>
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
                    winner === teamB && !clubLost && styles.winnerScore,
                    clubLost && winner === teamB && styles.loserScore,
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
            <View style={[styles.winnerBanner, clubLost && styles.loserBanner]}>
              <Text style={styles.winnerText}>
                {clubLost ? "😔" : "🏆"} {winner} remporte le match !
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
            {(teamMode === "A" || teamMode === "BOTH") && (
              <View style={styles.periodTableRow}>
                <View style={styles.periodTableCellTeam}>
                  <Text style={styles.periodTableTeamText}>{teamA}</Text>
                </View>
                {periodScoresA.map((score, index) => {
                  // Only highlight winner if managing both teams
                  const isWinner =
                    teamMode === "BOTH" && score > periodScoresB[index];
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
            {(teamMode === "B" || teamMode === "BOTH") && (
              <View style={styles.periodTableRow}>
                <View style={styles.periodTableCellTeam}>
                  <Text style={styles.periodTableTeamText}>{teamB}</Text>
                </View>
                {periodScoresB.map((score, index) => {
                  const isWinner = teamMode === "BOTH" && score > periodScoresA[index];
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
                ...(teamMode === "A" || teamMode === "BOTH"
                  ? [
                      {
                        data: [0, ...cumulativeScoresA],
                        color: () => "#FF6B35",
                        strokeWidth: 3,
                      },
                    ]
                  : []),
                ...(teamMode === "B" || teamMode === "BOTH"
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
                ...(teamMode === "A" || teamMode === "BOTH" ? [teamA] : []),
                ...(teamMode === "B" || teamMode === "BOTH" ? [teamB] : []),
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
          {(teamMode === "A" || teamMode === "BOTH") && (
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
          {(teamMode === "B" || teamMode === "BOTH") && (
            <View
              style={[styles.teamStatsContainer, styles.teamBStats, teamMode === "BOTH" && styles.teamStatsMargin]}
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

        {/* Other Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Autres statistiques</Text>

          <View style={styles.compactStatsContainer}>
            {/* Team A - Show if managing Team A or both */}
            {(teamMode === "A" || teamMode === "BOTH") && (
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
                  <Text style={styles.compactStatLabel}>Passes décisives</Text>
                  <Text style={styles.compactStatValue}>{otherStatsA.assists}</Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Interceptions</Text>
                  <Text style={styles.compactStatValue}>{otherStatsA.steals}</Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Contres</Text>
                  <Text style={styles.compactStatValue}>{otherStatsA.blocks}</Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Balles perdues</Text>
                  <Text style={styles.compactStatValue}>{otherStatsA.turnovers}</Text>
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
            {teamMode === "BOTH" && (
              <View style={styles.compactSeparator} />
            )}

            {/* Team B - Show if managing Team B or both */}
            {(teamMode === "B" || teamMode === "BOTH") && (
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
                  <Text style={styles.compactStatLabel}>Passes décisives</Text>
                  <Text style={styles.compactStatValue}>{otherStatsB.assists}</Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Interceptions</Text>
                  <Text style={styles.compactStatValue}>{otherStatsB.steals}</Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Contres</Text>
                  <Text style={styles.compactStatValue}>{otherStatsB.blocks}</Text>
                </View>

                <View style={styles.compactStatItem}>
                  <Text style={styles.compactStatLabel}>Balles perdues</Text>
                  <Text style={styles.compactStatValue}>{otherStatsB.turnovers}</Text>
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

      {/* Sync Loading Modal */}
      <Modal
        visible={syncModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.syncModalOverlay}>
          <View style={styles.syncModalContent}>
            <ActivityIndicator size="large" color="#9C27B0" />
            <Text style={styles.syncModalText}>Synchronisation avec le serveur...</Text>
          </View>
        </View>
      </Modal>

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
        onClose={() => {
          setLocalSaveWarningVisible(false);
          // Navigate to menu after closing the modal
          navigation.navigate(ROUTES.MAIN_MENU as never);
        }}
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
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
  winnerTeamName: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  loserTeamName: {
    color: "#F44336",
    fontWeight: "bold",
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
  loserScore: {
    color: "#F44336",
    borderColor: "#F44336",
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
  loserBanner: {
    backgroundColor: "#F44336",
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
  syncModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  syncModalContent: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 200,
  },
  syncModalText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
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
