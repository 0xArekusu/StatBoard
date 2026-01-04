/**
 * SupabaseMatchApiService
 *
 * Supabase implementation of IMatchApiService for uploading match data.
 * Legacy service - mostly replaced by MatchSyncService for production use.
 *
 * Features:
 * - Match data upload to Supabase (matches table with embedded players)
 * - Action data upload (match_actions table)
 * - Players embedded in match record (matches.players and matches.player_stats)
 *
 * Architecture:
 * - Uses IMatchApiService interface for abstraction
 * - Uses payload adapter pattern for data transformation
 * - Inserts match with embedded players and stats
 *
 * Note: MatchSyncService is the preferred service for production sync operations
 * as it handles subscription checks, photo uploads, and local data cleanup.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IMatchApiService } from './types/IMatchApiService';
import { IPayloadAdapter } from './types/IPayloadAdapter';
import { SupabaseMatchPayload } from './adapters/SupabasePayloadAdapter';
import { logInfo, logError, logWarn } from '../../../utils/logger';

/**
 * Supabase implementation of IMatchApiService
 * Handles uploading match data to Supabase backend
 */
export class SupabaseMatchApiService implements IMatchApiService {
  private supabase: SupabaseClient;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    private payloadAdapter: IPayloadAdapter<SupabaseMatchPayload>
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload match data to Supabase
   * Inserts match with embedded players and stats
   */
  async uploadMatch(payload: SupabaseMatchPayload): Promise<void> {
    try {
      logInfo('SupabaseMatchApiService', '📤 Uploading match to Supabase (with embedded players)', {
        hasActions: payload.actions.length > 0,
        hasPlayers: payload.match.players && payload.match.players.length > 0,
        actionCount: payload.actions.length,
        playerCount: payload.match.players?.length || 0
      });

      // 1. Insert match with embedded players and stats
      const { data: matchData, error: matchError } = await this.supabase
        .from('matches')
        .insert(payload.match)
        .select()
        .single();

      if (matchError) {
        logError('SupabaseMatchApiService', '❌ Error inserting match to Supabase', {
          error: matchError.message,
          match: payload.match
        });
        throw new Error(`Failed to insert match: ${matchError.message}`);
      }

      logInfo('SupabaseMatchApiService', '✅ Match inserted to Supabase with embedded players', {
        matchId: matchData.id,
        playerCount: payload.match.players?.length || 0
      });

      // 2. Insert actions with match_id (if actions table is still used)
      if (payload.actions.length > 0) {
        const actionsWithMatchId = payload.actions.map(action => ({
          ...action,
          match_id: matchData.id,
        }));

        const { error: actionsError } = await this.supabase
          .from('match_actions')
          .insert(actionsWithMatchId);

        if (actionsError) {
          logError('SupabaseMatchApiService', '❌ Error inserting actions to Supabase', {
            matchId: matchData.id,
            actionCount: actionsWithMatchId.length,
            error: actionsError.message
          });
          throw new Error(`Failed to insert actions: ${actionsError.message}`);
        }

        logInfo('SupabaseMatchApiService', '✅ Actions inserted to Supabase', {
          matchId: matchData.id,
          actionCount: payload.actions.length
        });
      }

      logInfo('SupabaseMatchApiService', '✅ Match upload completed successfully', {
        matchId: matchData.id
      });
    } catch (error) {
      logError('SupabaseMatchApiService', '❌ Match upload failed', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}
