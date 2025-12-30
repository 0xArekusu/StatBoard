/**
 * useMatchSync Hook
 *
 * Handles match ending and synchronization to Supabase
 */

import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
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
  currentMatchId: number | null;
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

  const endMatchAndSync = async (onComplete?: () => void) => {
    try {
      if (!currentMatchId) return;

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
            navigateToDashboard();
          }
        } else {
          logInfo("useMatchSync", "ℹ️ Match not synced", {
            matchId: currentMatchId,
            reason: eligibility.reason,
          });

          // For guest users, navigate to match details with local data
          if (!user) {
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
        navigateToDashboard();
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
      // Fetch match
      const { data: supabaseMatch, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError) throw matchError;

      // Fetch players for this match
      const { data: matchPlayers, error: playersError } = await supabase
        .from("match_players")
        .select("*")
        .eq("match_id", matchId);

      if (playersError) throw playersError;

      // Convert match players to expected format
      const players =
        matchPlayers?.map((mp: any) => ({
          id: mp.player_number,
          num: mp.player_number,
          name: mp.player_name,
          team: mp.team,
          isSubstitute: !mp.is_starter,
          photoUrl: mp.photo_url,
        })) || [];

      // Extract actions from match_players
      const actionDataList: any[] = [];
      matchPlayers?.forEach((mp: any) => {
        if (mp.actions && Array.isArray(mp.actions)) {
          const playerActions = mp.actions.map((action: any) => ({
            type: action.action_type,
            specification: action.specification,
            points: action.points,
            player: mp.player_number,
            team: action.team || mp.team,
            timestamp: new Date(action.timestamp),
            period_number: action.period_number,
            time_in_period: action.time_in_period,
            position: { x: 0, y: 0 },
            semanticPosition: {
              xNormalized: action.semantic_x,
              yNormalized: action.semantic_y,
            },
          }));
          actionDataList.push(...playerActions);
        }
      });

      logInfo("useMatchSync", "✅ Synced match data fetched", {
        matchId,
        playersCount: players.length,
        actionsCount: actionDataList.length,
      });

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

      logInfo("useMatchSync", "✅ Local match data fetched for guest", {
        matchId: currentMatchId,
        playersCount: players.length,
        actionsCount: actions.length,
      });

      setIsSyncing(false);

      if (!localMatch) {
        logError("useMatchSync", "❌ Local match not found", {
          matchId: currentMatchId,
        });
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
