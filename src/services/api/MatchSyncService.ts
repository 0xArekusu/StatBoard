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
  async checkSyncEligibility(matchId: number): Promise<SyncEligibility> {
    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          canSync: false,
          reason: "Vous devez être connecté pour synchroniser un match",
        };
      }

      // Get match details
      const match = await this.matchRepository.findById(matchId);

      if (!match) {
        return {
          canSync: false,
          reason: "Match introuvable",
        };
      }

      // Check if match is completed
      if (match.status !== "completed") {
        return {
          canSync: false,
          reason: "Seuls les matchs terminés peuvent être synchronisés",
        };
      }

      // Check if already synced
      if (match.synced_to_server) {
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
          return {
            canSync: false,
            reason: "Impossible de vérifier l'abonnement du club",
          };
        }

        if (!subscriptionInfo.limits.canSyncToServer) {
          return {
            canSync: false,
            reason:
              "Votre abonnement ne permet pas la synchronisation. Passez à un abonnement payant pour activer cette fonctionnalité.",
          };
        }
      } else {
        // Match without club (personal match)
        // For now, we'll allow sync for authenticated users
        // You might want to add additional checks here
      }

      return {
        canSync: true,
      };
    } catch (error) {
      console.error("Error checking sync eligibility:", error);
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
   * 3. Transform data to Supabase format
   * 4. Insert match and players to Supabase
   * 5. Update local match as synced
   */
  async syncMatch(matchId: number): Promise<SyncResult> {
    try {
      // Check eligibility
      const eligibility = await this.checkSyncEligibility(matchId);

      if (!eligibility.canSync) {
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
        return {
          success: false,
          error: "Utilisateur non authentifié",
        };
      }

      // Fetch match data from local database
      const match = await this.matchRepository.findById(matchId);

      if (!match) {
        return {
          success: false,
          error: "Match introuvable",
        };
      }

      // Fetch all actions for this match
      const actions = await this.actionRepository.getActionsForMatch(matchId);

      // Fetch all players for this match
      const matchPlayers =
        await this.matchPlayerRepository.getPlayersForMatch(matchId);

      // Upload photos for club players with local URIs
      const { PhotoUploadService } = await import('../../../services/PhotoUploadService');
      const photoService = new PhotoUploadService(this.supabase);

      for (const player of matchPlayers) {
        if (player.photo_url && (player.photo_url.startsWith('file://') || player.photo_url.startsWith('content://'))) {
          console.log(`📸 Uploading photo for player ${player.player_name} (${player.id})...`);
          const { url, error } = await photoService.uploadPlayerPhoto(player.photo_url, player.player_id || `player-${player.id}`);
          if (!error && url) {
            // Update the player's photo_url with the uploaded URL
            player.photo_url = url;
            await this.matchPlayerRepository.updatePhotoUrl(player.id, url);
            console.log(`✅ Photo URL updated for player ${player.player_name}: ${url}`);
          } else {
            console.error(`❌ Failed to upload photo for player ${player.player_name}:`, error);
          }
        }
      }

      console.log(`📋 Players before transform:`, matchPlayers.map(p => ({ name: p.player_name, photo_url: p.photo_url })));

      // Transform data to Supabase format
      const syncData = this.transformMatchForSync(
        match,
        matchPlayers,
        actions,
        user.id
      );

      // Sync to Supabase
      const supabaseMatchId = await this.syncToSupabase(syncData);

      // Delete local match data after successful sync
      console.log(`🗑️ Deleting local match data for match ${matchId}...`);
      await this.actionRepository.deleteActionsForMatch(matchId);
      await this.matchPlayerRepository.deletePlayersForMatch(matchId);
      await this.matchRepository.delete(matchId);

      console.log(
        `✅ Match ${matchId} synced successfully to Supabase (${supabaseMatchId}) and deleted from local storage`
      );

      return {
        success: true,
        matchId: supabaseMatchId,
      };
    } catch (error) {
      console.error("Error syncing match:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur lors de la synchronisation",
      };
    }
  }

  /**
   * Transform local match data to Supabase format
   */
  private transformMatchForSync(
    match: Match,
    matchPlayers: MatchPlayer[],
    actions: Action[],
    userId: string
  ): SupabaseMatchSyncData {
    // Determine team_a_name and team_b_name values
    // If team_id exists and matches the team_mode, send team_id as the name
    // Otherwise, send the actual team name
    let teamAValue = match.team_a_name;
    let teamBValue = match.team_b_name;

    if (match.team_id) {
      // If we have a team_id, check which team (A or B) is the club team based on team_mode
      if (match.team_mode === 'A') {
        // Team A is the club team, use team_id as the value
        teamAValue = match.team_id;
      } else if (match.team_mode === 'B') {
        // Team B is the club team, use team_id as the value
        teamBValue = match.team_id;
      }
      // For 'BOTH' mode, we keep the original names since both teams are managed
    }

    // Create match insert data
    const matchInsert: SupabaseMatchInsert = {
      club_id: match.club_id || null,
      team_id: match.team_id || null,
      team_mode: match.team_mode,
      team_a: teamAValue,
      team_b: teamBValue,
      match_format: match.match_format,
      period_duration: match.period_duration,
      final_score_a: match.final_score_a || 0,
      final_score_b: match.final_score_b || 0,
      score_manually_adjusted: match.score_manually_adjusted === 1,
      created_by: userId,
      played_at: match.ended_at || match.started_at || match.created_at,
    };

    // Group actions by player
    const actionsByPlayer = new Map<string, Action[]>();

    for (const action of actions) {
      const key = `${action.team}-${action.player_number}`;
      if (!actionsByPlayer.has(key)) {
        actionsByPlayer.set(key, []);
      }
      actionsByPlayer.get(key)!.push(action);
    }

    // Create match players insert data
    const playersInsert: SupabaseMatchPlayerInsert[] = matchPlayers.map(
      (player) => {
        const key = `${player.team}-${player.player_number}`;
        const playerActions = actionsByPlayer.get(key) || [];

        // Transform actions to JSONB format
        const actionsJson: PlayerAction[] = playerActions.map((action) => ({
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

        return {
          player_id: player.player_id || null,
          player_number: player.player_number,
          player_name: player.player_name,
          team: player.team,
          is_starter: player.is_starter,
          photo_url: player.photo_url || null,
          actions: actionsJson,
        };
      }
    );

    return {
      match: matchInsert,
      players: playersInsert,
    };
  }

  /**
   * Insert match and players to Supabase
   */
  private async syncToSupabase(
    syncData: SupabaseMatchSyncData
  ): Promise<string> {
    try {
      // Insert match
      const { data: matchData, error: matchError } = await this.supabase
        .from("matches")
        .insert(syncData.match)
        .select("id")
        .single();

      if (matchError) {
        console.error("Error inserting match to Supabase:", matchError);
        throw new Error(`Erreur lors de la création du match: ${matchError.message}`);
      }

      const matchId = matchData.id;

      // Insert players with actions
      const playersWithMatchId = syncData.players.map((player) => ({
        ...player,
        match_id: matchId,
      }));

      const { error: playersError } = await this.supabase
        .from("match_players")
        .insert(playersWithMatchId);

      if (playersError) {
        console.error("Error inserting match players to Supabase:", playersError);
        // Try to rollback match insertion
        await this.supabase.from("matches").delete().eq("id", matchId);
        throw new Error(
          `Erreur lors de la création des joueurs: ${playersError.message}`
        );
      }

      return matchId;
    } catch (error) {
      console.error("Error in syncToSupabase:", error);
      throw error;
    }
  }

  /**
   * Sync all unsynchronized completed matches
   */
  async syncAllPendingMatches(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    try {
      // Get all completed matches that haven't been synced
      const unsynced =
        await this.matchRepository.findUnsyncedCompletedMatches();

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

      return { synced, failed, errors };
    } catch (error) {
      console.error("Error syncing all pending matches:", error);
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
