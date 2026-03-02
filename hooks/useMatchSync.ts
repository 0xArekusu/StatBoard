/**
 * useMatchSync Hook
 *
 * Handles match ending and synchronization to Supabase
 */

import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import { SupabaseClient } from "@supabase/supabase-js";
import { RootNavigationProp } from "../types/navigation";
import { MatchManager } from "../src/services/match/MatchManager";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { logInfo, logError, logWarn } from "../utils/logger";
import { ROUTES } from "../constants/routes";
import { TeamId } from "../constants/liveMatchConstants";

interface UseMatchSyncProps {
  currentMatchId: string | null;
  match: any;
  quarter: number;
  maxPeriods: number;
  saveMatchState: () => Promise<void>;
  matchManager: MatchManager;
  matchRepository: MatchRepository;
  supabase: SupabaseClient;
  user: any;
}

export function useMatchSync({
  currentMatchId,
  match,
  quarter,
  maxPeriods,
  saveMatchState,
  matchManager,
  matchRepository,
  supabase,
  user,
}: UseMatchSyncProps) {
  const navigation = useNavigation<RootNavigationProp>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLocalSaveWarning, setShowLocalSaveWarning] = useState(false);

  const endMatchAndSync = async (onComplete?: () => void) => {
    try {
      if (!currentMatchId) {
        logError("useMatchSync", "❌ No currentMatchId found");
        return;
      }

      // Save current match state before ending
      await saveMatchState();

      // Calculate overtime periods played
      const overtimesPlayed = Math.max(0, quarter - maxPeriods);

      // Determine my team's score and opponent's score based on location
      // If home: my score = scoreHome, opponent score = scoreAway
      // If away: my score = scoreAway, opponent score = scoreHome
      const isHome = match.location === TeamId.HOME;
      const myTeamScore = isHome ? (match.scoreHome || 0) : (match.scoreAway || 0);
      const opponentScore = isHome ? (match.scoreAway || 0) : (match.scoreHome || 0);

      logInfo("useMatchSync", "🏁 Ending match", {
        matchId: currentMatchId,
        location: match.location,
        isHome,
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        myTeamScore,
        opponentScore,
        totalPeriodsPlayed: quarter,
        overtimePeriods: overtimesPlayed,
      });

      // Wait for action queue to flush
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update final scores and overtime info
      await matchRepository.updateFinalScores(
        currentMatchId,
        myTeamScore,
        opponentScore,
        false
      );

      // Update overtime periods count
      await matchRepository.updateOvertimePeriods(
        currentMatchId,
        overtimesPlayed
      );

      // Mark match as completed and compact actions
      await matchManager.endMatch(currentMatchId);

      logInfo("useMatchSync", "✅ Match ended and compacted", {
        matchId: currentMatchId,
        finalScores: `${myTeamScore} - ${opponentScore}`,
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        overtimes: overtimesPlayed,
      });

      // Sync to Supabase if eligible
      try {
        setIsSyncing(true);

        const { MatchSyncService } = await import(
          "../src/services/api/MatchSyncService"
        );
        const syncService = new MatchSyncService(supabase);

        logInfo("useMatchSync", "🔄 Checking sync eligibility", {
          matchId: currentMatchId,
        });

        const eligibility =
          await syncService.checkSyncEligibility(currentMatchId);

        if (eligibility.canSync) {
          logInfo("useMatchSync", "📤 Syncing match to Supabase", {
            matchId: currentMatchId,
          });

          const syncResult = await syncService.syncMatch(currentMatchId);

          setIsSyncing(false);

          if (syncResult.success) {
            logInfo("useMatchSync", "✅ Match synced successfully", {
              localMatchId: currentMatchId,
              supabaseMatchId: syncResult.matchId,
            });

            // Fetch synced match data from Supabase
            await fetchAndNavigateToSyncedMatch(syncResult.matchId!);
          } else {
            logWarn("useMatchSync", "⚠️ Match sync failed", {
              matchId: currentMatchId,
              error: syncResult.error,
            });

            setIsSyncing(false);

            // Show error alert to user and navigate to local match details
            Alert.alert(
              "Erreur de synchronisation",
              `Impossible de synchroniser le match avec le serveur.\n\n${syncResult.error || "Erreur inconnue"}\n\nVotre match a été sauvegardé localement.`,
              [
                {
                  text: "OK",
                  onPress: () => fetchAndNavigateToLocalMatch(),
                },
              ],
              {
                onDismiss: () => fetchAndNavigateToLocalMatch(),
              }
            );
          }
        } else {
          logInfo("useMatchSync", "ℹ️ Match not eligible for sync", {
            reason: eligibility.reason,
          });

          // For guest users, navigate to match details with local data
          if (!user) {
            logInfo("useMatchSync", "👤 Guest user - navigating to local match", {
              matchId: currentMatchId,
            });
            await fetchAndNavigateToLocalMatch();
          } else {
            setIsSyncing(false);
            navigateToDashboard();
          }
        }
      } catch (syncError) {
        logError("useMatchSync", "❌ Error during sync attempt", {
          matchId: currentMatchId,
          error: syncError instanceof Error ? syncError.message : syncError,
        });

        setIsSyncing(false);

        // Show error alert to user and navigate to local match details
        Alert.alert(
          "Erreur de synchronisation",
          `Une erreur inattendue s'est produite lors de la synchronisation.\n\n${syncError instanceof Error ? syncError.message : "Erreur inconnue"}\n\nVotre match a été sauvegardé localement.`,
          [
            {
              text: "OK",
              onPress: () => fetchAndNavigateToLocalMatch(),
            },
          ],
          {
            onDismiss: () => fetchAndNavigateToLocalMatch(),
          }
        );
      }

      onComplete?.();
    } catch (error) {
      logError("useMatchSync", "❌ Failed to end match", error);
      setIsSyncing(false);
      setTimeout(() => navigation.goBack(), 100);
    }
  };

  const fetchAndNavigateToSyncedMatch = async (matchId: string) => {
    try {
      // Fetch match with embedded players and stats
      const { data: supabaseMatch, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError) {
        logError("useMatchSync", "❌ Error fetching synced match", {
          error: matchError.message,
        });
        throw matchError;
      }

      // Extract players from matches.players JSONB array
      const playersArray = supabaseMatch?.players || [];
      const players = playersArray.map((p: any) => ({
        id: p.player_number,
        num: p.player_number,
        name: p.player_name,
        team: p.team,
        isSubstitute: !p.is_starter,
        photoUrl: p.photo_url,
        playingTimeSeconds: p.playing_time_seconds || 0,
      }));

      // Extract actions from matches.player_stats JSONB object
      const playerStatsObject = supabaseMatch?.player_stats || {};
      const actionDataList: any[] = [];

      // Create player_id -> player_number mapping
      const playerMap = new Map<string, number>();
      playersArray.forEach((p: any) => {
        const playerId = p.player_id || `temp-${p.team}-${p.player_number}`;
        playerMap.set(playerId, p.player_number);
      });

      // Iterate through player_stats: { [player_id]: { actions: [...] } }
      for (const [playerId, stats] of Object.entries(playerStatsObject)) {
        const playerNumber = playerMap.get(playerId);

        if (!playerNumber) {
          console.warn(`Player number not found for player_id: ${playerId}`);
          continue;
        }

        const playerActions = (stats as any)?.actions || [];

        const convertedActions = playerActions.map((action: any) => ({
          type: action.action_type,
          specification: action.specification,
          points: action.points,
          player: playerNumber,
          team: action.team,
          timestamp: new Date(action.timestamp),
          period_number: action.period_number,
          time_in_period: action.time_in_period,
          position: { x: 0, y: 0 },
          semanticPosition: {
            xNormalized: action.semantic_x,
            yNormalized: action.semantic_y,
          },
        }));

        actionDataList.push(...convertedActions);
      }

      setTimeout(() => {
        navigation.navigate(ROUTES.MATCH_DETAILS, {
          match: supabaseMatch,
          actions: actionDataList,
          players: players,
          fromLiveMatch: true,
        });
      }, 300);
    } catch (fetchError) {
      logError("useMatchSync", "❌ Failed to fetch synced match", {
        matchId,
        error: fetchError,
      });
      navigateToDashboard();
    }
  };

  const fetchAndNavigateToLocalMatch = async () => {
    if (!currentMatchId) {
      setIsSyncing(false);
      navigateToDashboard();
      return;
    }

    try {
      const localMatch = await matchRepository.findById(currentMatchId);
      const matchPlayerRepo = new MatchPlayerRepository();
      const actionRepo = new ActionRepository();
      const localPlayersRaw =
        await matchPlayerRepo.getPlayersForMatch(currentMatchId);
      const localActionsRaw =
        await actionRepo.getActionsForMatch(currentMatchId);

      // Convert players to expected format (same as Supabase conversion)
      const players = localPlayersRaw.map((mp: any) => ({
        id: mp.player_number,
        num: mp.player_number,
        name: mp.player_name,
        team: mp.team,
        isSubstitute: !mp.is_starter,
        photoUrl: mp.photo_url || undefined,
        playingTimeSeconds: mp.playing_time_seconds || 0,
      }));

      // Convert actions to expected format (same as Supabase conversion)
      const actions = localActionsRaw.map((action: any) => ({
        type: action.action_type,
        specification: action.specification,
        points: action.points,
        player: action.player_number,
        team: action.team,
        timestamp: new Date(action.timestamp),
        period_number: action.period_number,
        time_in_period: action.time_in_period,
        position: { x: 0, y: 0 },
        semanticPosition: {
          xNormalized: action.semantic_x,
          yNormalized: action.semantic_y,
        },
      }));

      setIsSyncing(false);

      if (!localMatch) {
        navigateToDashboard();
        return;
      }

      setTimeout(() => {
        navigation.navigate(ROUTES.MATCH_DETAILS, {
          match: localMatch,
          actions: actions,
          players: players,
          fromLiveMatch: true,
          isLocalMatch: true,
        });
      }, 300);
    } catch (fetchError) {
      logError("useMatchSync", "❌ Failed to fetch local match data", {
        matchId: currentMatchId,
        error: fetchError,
      });
      setIsSyncing(false);
      navigateToDashboard();
    }
  };

  const navigateToDashboard = () => {
    setTimeout(() => {
      navigation.navigate(ROUTES.MAIN_TABS as never);
    }, 300);
  };

  return {
    isSyncing,
    endMatchAndSync,
  };
}
