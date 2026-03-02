/**
 * MatchSyncService
 *
 * Service for synchronizing completed matches from SQLite to Supabase.
 * Handles offline-first architecture with server sync for paid subscriptions.
 *
 * Features:
 * - Sync eligibility checking (authentication, subscription, completion status)
 * - Match data transformation from SQLite to Supabase format
 * - Photo upload for player images before sync
 * - Batch sync for multiple pending matches
 * - Local data cleanup after successful sync
 * - Rollback on sync failures
 *
 * Architecture:
 * - Reads from SQLite repositories (MatchRepository, ActionRepository, MatchPlayerRepository)
 * - Writes to Supabase (matches table with embedded players in JSONB)
 * - Uploads photos to Supabase Storage
 * - Deletes local data after successful sync (offline→online transition)
 *
 * Sync Requirements:
 * - User must be authenticated
 * - Match must be completed (status: 'completed')
 * - Match must not be already synced (synced_to_server: false)
 * - User must have paid subscription (if match has club_id)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { MatchRepository } from "../database/MatchRepository";
import { ActionRepository } from "../database/ActionRepository";
import { MatchPlayerRepository } from "../database/MatchPlayerRepository";
import { SubscriptionService } from "../../../services/SubscriptionService";
import type {
  SupabaseMatchInsert,
  SupabaseMatchPlayerInsert,
  SupabaseMatchSyncData,
  PlayerAction,
} from "./types/SupabaseMatchTypes";
import type { Match, Action } from "../../models/types";
import type { MatchPlayer } from "../database/MatchPlayerRepository";
import { logInfo, logError, logWarn } from "../../../utils/logger";
import {
  ActionType,
  ShotSpecification,
} from "../../models/ActionTypes";

export interface SyncResult {
  success: boolean;
  matchId?: string; // UUID from Supabase
  error?: string;
}

export interface SyncEligibility {
  canSync: boolean;
  reason?: string;
}

export class MatchSyncService {
  private matchRepository: MatchRepository;
  private actionRepository: ActionRepository;
  private matchPlayerRepository: MatchPlayerRepository;
  private subscriptionService: SubscriptionService;

  constructor(private supabase: SupabaseClient) {
    this.matchRepository = new MatchRepository();
    this.actionRepository = new ActionRepository();
    this.matchPlayerRepository = new MatchPlayerRepository();
    this.subscriptionService = new SubscriptionService(supabase);
  }

  /**
   * Check if a match can be synced to server
   * Requirements:
   * - User must be authenticated
   * - User must have a paid subscription (not freemium)
   * - Match must be completed
   */
  async checkSyncEligibility(matchId: string): Promise<SyncEligibility> {
    try {
      logInfo('MatchSyncService', '🔍 Checking sync eligibility', { matchId });

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user) {
        logWarn('MatchSyncService', '⚠️ User not authenticated', { matchId });
        return {
          canSync: false,
          reason: "Vous devez être connecté pour synchroniser un match",
        };
      }

      // Get match details
      const match = await this.matchRepository.findById(matchId);

      if (!match) {
        logWarn('MatchSyncService', '⚠️ Match not found for sync eligibility check', { matchId });
        return {
          canSync: false,
          reason: "Match introuvable",
        };
      }

      // Check if match is completed
      if (match.status !== "completed") {
        logWarn('MatchSyncService', '⚠️ Match not completed', {
          matchId,
          status: match.status
        });
        return {
          canSync: false,
          reason: "Seuls les matchs terminés peuvent être synchronisés",
        };
      }

      // Check if already synced
      if (match.synced_to_server) {
        logWarn('MatchSyncService', '⚠️ Match already synced', { matchId });
        return {
          canSync: false,
          reason: "Ce match a déjà été synchronisé",
        };
      }

      // Check subscription tier (if match has a club_id)
      if (match.club_id) {
        const subscriptionInfo =
          await this.subscriptionService.getClubSubscriptionInfo(match.club_id);

        if (!subscriptionInfo) {
          logWarn('MatchSyncService', '⚠️ Cannot verify club subscription', {
            matchId,
            clubId: match.club_id
          });
          return {
            canSync: false,
            reason: "Impossible de vérifier l'abonnement du club",
          };
        }

        if (!subscriptionInfo.limits.canSyncToServer) {
          logWarn('MatchSyncService', '⚠️ Subscription does not allow sync', {
            matchId,
            clubId: match.club_id,
            tier: subscriptionInfo.tier
          });
          return {
            canSync: false,
            reason:
              "Votre abonnement ne permet pas la synchronisation. Passez à un abonnement payant pour activer cette fonctionnalité.",
          };
        }
      } else {
        // Match without club (personal match) - allow sync for authenticated users
        logInfo('MatchSyncService', 'ℹ️ Personal match (no club_id)', { matchId });
      }

      logInfo('MatchSyncService', '✅ Sync eligible', {
        matchId,
        userId: user.id,
        clubId: match.club_id
      });

      return {
        canSync: true,
      };
    } catch (error) {
      logError('MatchSyncService', '❌ Error checking sync eligibility', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      return {
        canSync: false,
        reason: "Erreur lors de la vérification des permissions",
      };
    }
  }

  /**
   * Sync a completed match to Supabase
   * This will:
   * 1. Check eligibility (auth + subscription)
   * 2. Fetch match data from local SQLite
   * 3. Upload player photos to Supabase Storage
   * 4. Transform data to Supabase format
   * 5. Insert match and players to Supabase
   * 6. Delete local match data after successful sync
   */
  async syncMatch(matchId: string): Promise<SyncResult> {
    try {
      logInfo('MatchSyncService', '🔄 Starting match sync', { matchId });

      // Check eligibility
      const eligibility = await this.checkSyncEligibility(matchId);

      if (!eligibility.canSync) {
        logWarn('MatchSyncService', '⚠️ Sync not eligible', {
          matchId,
          reason: eligibility.reason
        });
        return {
          success: false,
          error: eligibility.reason || "Synchronisation non autorisée",
        };
      }

      // Get current user
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        logError('MatchSyncService', '❌ User not authenticated during sync', { matchId });
        return {
          success: false,
          error: "Utilisateur non authentifié",
        };
      }

      // Fetch match data from local database (logged by repositories)
      const match = await this.matchRepository.findById(matchId);

      if (!match) {
        logError('MatchSyncService', '❌ Match not found during sync', { matchId });
        return {
          success: false,
          error: "Match introuvable",
        };
      }

      // Fetch all actions for this match (logged by repository)
      const actions = await this.actionRepository.getActionsForMatch(matchId);

      // Fetch all players for this match (logged by repository)
      const matchPlayers =
        await this.matchPlayerRepository.getPlayersForMatch(matchId);

      // Transform data to Supabase format
      const syncData = this.transformMatchForSync(
        match,
        matchPlayers,
        actions,
        user.id
      );

      logInfo('MatchSyncService', '📦 Data transformed for Supabase', {
        matchId,
        playerCount: syncData.players.length,
        actionCount: actions.length
      });

      // Sync to Supabase
      const supabaseMatchId = await this.syncToSupabase(syncData);

      // Delete local match data after successful sync (logged by repositories)
      logInfo('MatchSyncService', '🗑️ Deleting local match data after successful sync', {
        localMatchId: matchId,
        supabaseMatchId
      });

      await this.actionRepository.deleteActionsForMatch(matchId);
      await this.matchPlayerRepository.deletePlayersForMatch(matchId);
      await this.matchRepository.delete(matchId);

      logInfo('MatchSyncService', '✅ Match synced successfully and deleted from local storage', {
        localMatchId: matchId,
        supabaseMatchId
      });

      return {
        success: true,
        matchId: supabaseMatchId,
      };
    } catch (error) {
      logError('MatchSyncService', '❌ Error syncing match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur lors de la synchronisation",
      };
    }
  }

  /**
   * Transform local match data to Supabase format
   * Maps SQLite schema to Supabase schema with embedded players and stats
   */
  private transformMatchForSync(
    match: Match,
    matchPlayers: MatchPlayer[],
    actions: Action[],
    userId: string
  ): SupabaseMatchSyncData {
    // Group actions by player_id
    const actionsByPlayerId: Record<string, Action[]> = {};

    // Create player_id mapping first
    const playerIdMap = new Map<string, string>();
    for (const player of matchPlayers) {
      const key = `${player.team}-${player.player_number}`;
      const playerId = player.player_id || `temp-${player.team}-${player.player_number}`;
      playerIdMap.set(key, playerId);
    }

    // Group actions by player_id
    for (const action of actions) {
      const key = `${action.team}-${action.player_number}`;
      const playerId = playerIdMap.get(key);

      if (playerId) {
        if (!actionsByPlayerId[playerId]) {
          actionsByPlayerId[playerId] = [];
        }
        actionsByPlayerId[playerId].push(action);
      }
    }

    // Build players array (light info)
    const playersArray = matchPlayers.map((player) => ({
      player_id: player.player_id || null,
      player_number: player.player_number,
      player_name: player.player_name,
      team: player.team,
      is_starter: player.is_starter,
      photo_url: player.photo_url || null,
      on_court: player.on_court || 0,
      playing_time_seconds: player.playing_time_seconds || 0,
    }));

    // Build player_stats object: { [player_id]: { actions: [...] } }
    const playerStatsObject: Record<string, { actions: PlayerAction[] }> = {};

    for (const player of matchPlayers) {
      const playerId = player.player_id || `temp-${player.team}-${player.player_number}`;
      const playerActions = actionsByPlayerId[playerId] || [];

      // Transform actions to JSONB format
      const actionsJson: PlayerAction[] = playerActions.map((action) => ({
        team: action.team,
        action_type: action.action_type,
        specification: action.specification,
        points: action.points || undefined,
        semantic_x: action.semantic_x,
        semantic_y: action.semantic_y,
        action_order: action.action_order,
        period_number: action.period_number,
        time_in_period: action.time_in_period,
        timestamp: action.timestamp,
      }));

      playerStatsObject[playerId] = { actions: actionsJson };

      logInfo('MatchSyncService', '📊 Player actions grouped', {
        playerName: player.player_name,
        playerId,
        actionCount: actionsJson.length
      });
    }

    // Create match insert data with embedded players and stats
    const matchInsert: SupabaseMatchInsert = {
      club_id: match.club_id || null,
      team_id: match.team_id || null,
      my_team_name: match.my_team_name || null,
      opponent_name: match.opponent_name,
      is_home: match.is_home ? true : false,
      total_periods: match.total_periods || 4,
      period_duration: match.period_duration,
      overtime_duration: match.overtime_duration || null,
      overtime_periods: match.overtime_periods || 0,
      my_team_score: match.my_team_score || 0,
      opponent_score: match.opponent_score || 0,
      status: 'completed', // Match is completed when syncing
      created_by: userId,
      created_at: match.created_at, // Preserve creation timestamp from local database
      started_at: match.started_at || null,
      ended_at: match.ended_at || null,
      synced_at: new Date().toISOString(), // Set current time as sync time
      players: playersArray as any, // JSONB in Supabase
      player_stats: playerStatsObject as any, // JSONB in Supabase
    };

    return {
      match: matchInsert,
      players: [], // Empty - no longer needed since embedded
    };
  }

  /**
   * Calculate player statistics from their actions
   * This ensures stats are consistent with the app's offline-first architecture
   *
   * Stats calculated:
   * - Points: Sum of all successful shot points
   * - Shots: Count of 'tir' actions, broken down by specification
   * - Rebounds: Count of 'rebond' actions, broken down by type
   * - Fouls: Count of 'faute' actions, broken down by type
   */
  private calculatePlayerStats(actions: Action[]): {
    totalPoints: number;
    totalShots: number;
    totalRebounds: number;
    totalFouls: number;
    totalAssists: number;
    totalSteals: number;
    totalBlocks: number;
    totalTurnovers: number;
  } {
    let totalPoints = 0;
    let totalShots = 0;
    let totalRebounds = 0;
    let totalFouls = 0;
    let totalAssists = 0;
    let totalSteals = 0;
    let totalBlocks = 0;
    let totalTurnovers = 0;

    for (const action of actions) {
      // Process shots
      if (action.action_type === ActionType.SHOT) {
        totalShots++;

        // Add points if shot was made
        if (action.specification === ShotSpecification.MADE) {
          totalPoints += action.points || 0;
        }
      }

      // Process rebounds
      if (action.action_type === ActionType.REBOUND) {
        totalRebounds++;
      }

      // Process fouls
      if (action.action_type === ActionType.FOUL) {
        totalFouls++;
      }

      // Process assists
      if (action.action_type === ActionType.ASSIST) {
        totalAssists++;
      }

      // Process steals
      if (action.action_type === ActionType.STEAL) {
        totalSteals++;
      }

      // Process blocks
      if (action.action_type === ActionType.BLOCK) {
        totalBlocks++;
      }

      // Process turnovers
      if (action.action_type === ActionType.TURNOVER) {
        totalTurnovers++;
      }
    }

    return {
      totalPoints,
      totalShots,
      totalRebounds,
      totalFouls,
      totalAssists,
      totalSteals,
      totalBlocks,
      totalTurnovers,
    };
  }

  /**
   * Insert match with embedded players to Supabase
   * All player data and stats are embedded in the match record
   */
  private async syncToSupabase(
    syncData: SupabaseMatchSyncData
  ): Promise<string> {
    try {
      logInfo('MatchSyncService', '📤 Inserting match to Supabase (with embedded players)', {
        myTeam: syncData.match.my_team_name,
        opponent: syncData.match.opponent_name,
        playerCount: syncData.match.players?.length || 0
      });

      // Insert match with embedded players and stats
      const { data: matchData, error: matchError } = await this.supabase
        .from("matches")
        .insert(syncData.match)
        .select("id")
        .single();

      if (matchError) {
        logError('MatchSyncService', '❌ Error inserting match to Supabase', {
          error: matchError.message,
          code: matchError.code,
          details: matchError.details,
          hint: matchError.hint,
          matchData: {
            clubId: syncData.match.club_id,
            teamId: syncData.match.team_id,
            myTeamName: syncData.match.my_team_name,
            opponentName: syncData.match.opponent_name,
          }
        });
        throw new Error(`Erreur lors de la création du match: ${matchError.message}`);
      }

      if (!matchData) {
        logError('MatchSyncService', '❌ No data returned from Supabase insert');
        throw new Error('Aucune donnée retournée par Supabase');
      }

      const matchId = matchData.id;

      logInfo('MatchSyncService', '✅ Match inserted to Supabase with embedded players', {
        supabaseMatchId: matchId,
        playerCount: syncData.match.players?.length || 0
      });

      return matchId;
    } catch (error) {
      logError('MatchSyncService', '❌ Error in syncToSupabase', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Sync all unsynchronized completed matches
   * Useful for batch sync operations
   */
  async syncAllPendingMatches(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    try {
      logInfo('MatchSyncService', '🔄 Starting batch sync of pending matches');

      // Get all completed matches that haven't been synced (logged by repository)
      const unsynced =
        await this.matchRepository.findUnsyncedCompletedMatches();

      logInfo('MatchSyncService', '📋 Found unsynced matches', {
        count: unsynced.length
      });

      let synced = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const match of unsynced) {
        const result = await this.syncMatch(match.id);

        if (result.success) {
          synced++;
        } else {
          failed++;
          errors.push(`Match ${match.id}: ${result.error}`);
        }
      }

      logInfo('MatchSyncService', '✅ Batch sync completed', {
        total: unsynced.length,
        synced,
        failed
      });

      return { synced, failed, errors };
    } catch (error) {
      logError('MatchSyncService', '❌ Error syncing all pending matches', {
        error: error instanceof Error ? error.message : error
      });
      return {
        synced: 0,
        failed: 0,
        errors: [
          error instanceof Error ? error.message : "Erreur inconnue",
        ],
      };
    }
  }
}
