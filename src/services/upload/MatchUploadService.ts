/**
 * MatchUploadService
 *
 * Service for uploading completed matches to server and cleaning up local storage.
 * Uses adapter pattern to transform local SQLite data to server-specific API format.
 *
 * Architecture:
 * - Repository layer: Loads match/actions/players from SQLite
 * - Adapter layer: Transforms local format to API-specific payload
 * - API layer: Handles actual HTTP upload
 * - Cleanup: Deletes local data only after successful upload (no data loss on failure)
 *
 * Workflow:
 * 1. Load match from local database (MatchRepository)
 * 2. Load actions from local database (ActionRepository)
 * 3. Load players from local database (MatchPlayerRepository)
 * 4. Build internal MatchData model
 * 5. Transform to API format using IPayloadAdapter
 * 6. Upload to server via IMatchApiService
 * 7. Clean up local storage (only on success)
 *
 * Safety:
 * - Atomic operation: All-or-nothing (upload succeeds or local data preserved)
 * - Only completed matches can be uploaded
 * - Throws errors instead of silent failures
 *
 * Used by:
 * - Manual upload flow (user-triggered)
 * - Not used for MatchSyncService (which has different logic)
 *
 * Note: This is a legacy/alternative upload service.
 * Modern sync uses MatchSyncService with compacted actions.
 */
import { MatchRepository } from "../database/MatchRepository";
import { ActionRepository } from "../database/ActionRepository";
import { MatchPlayerRepository } from "../database/MatchPlayerRepository";
import { IMatchApiService } from "../api/types/IMatchApiService";
import { IPayloadAdapter } from "../api/types/IPayloadAdapter";
import { MatchData } from "../api/types/MatchData";
import { logInfo, logError, logWarn } from "../../../utils/logger";

export class MatchUploadService {
  constructor(
    private matchRepository: MatchRepository,
    private actionRepository: ActionRepository,
    private matchPlayerRepository: MatchPlayerRepository,
    private apiService: IMatchApiService,
    private payloadAdapter: IPayloadAdapter<any>
  ) {
    logInfo('MatchUploadService', '🏗️ MatchUploadService initialized');
  }

  /**
   * Upload match to server and clean up local storage
   * All-or-nothing operation: local data deleted only on successful upload
   *
   * @param matchId Local SQLite match ID
   * @throws Error if match not found or upload fails
   */
  async uploadAndCleanup(matchId: number): Promise<void> {
    try {
      logInfo('MatchUploadService', '🚀 Starting upload process', { matchId });

      // 1. Load match from local database
      const match = await this.matchRepository.findById(matchId);
      if (!match) {
        logError('MatchUploadService', '❌ Match not found in local database', { matchId });
        throw new Error(`Match with ID ${matchId} not found`);
      }

      logInfo('MatchUploadService', '📋 Match loaded from local database', {
        matchId,
        status: match.status,
        teamA: match.team_a_name,
        teamB: match.team_b_name
      });

      // 2. Load actions from local database
      const actions = await this.actionRepository.getActionsForMatch(matchId);
      logInfo('MatchUploadService', `📊 Loaded ${actions.length} actions`, {
        matchId,
        actionCount: actions.length
      });

      // 3. Load players from local database
      const matchPlayers = await this.matchPlayerRepository.getPlayersForMatch(
        matchId
      );
      const players = matchPlayers.map((mp) => ({
        num: mp.player_number,
        name: mp.player_name,
        team: mp.team,
      }));
      logInfo('MatchUploadService', `👥 Loaded ${players.length} players`, {
        matchId,
        playerCount: players.length
      });

      // 4. Build internal data model
      const matchData: MatchData = {
        match,
        actions,
        players,
      };

      // 5. Transform to API-specific format using adapter
      logInfo('MatchUploadService', '🔄 Transforming data with payload adapter', { matchId });
      const payload = this.payloadAdapter.adapt(matchData);

      // 6. Upload to server
      logInfo('MatchUploadService', '📤 Uploading to server', { matchId });
      await this.apiService.uploadMatch(payload);

      // 7. Clean up local storage (only on successful upload)
      logInfo('MatchUploadService', '🧹 Upload successful - cleaning up local storage', { matchId });
      await this.actionRepository.deleteActionsForMatch(matchId);
      await this.matchPlayerRepository.deletePlayersForMatch(matchId);
      await this.matchRepository.delete(matchId);

      logInfo('MatchUploadService', '✅ Match uploaded and cleaned up successfully', { matchId });
    } catch (error) {
      logError('MatchUploadService', '❌ Upload and cleanup failed', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Check if a match can be uploaded
   * Only completed matches are eligible for upload
   *
   * @param matchId Local SQLite match ID
   * @returns true if match exists and status is "completed"
   */
  async canUpload(matchId: number): Promise<boolean> {
    try {
      const match = await this.matchRepository.findById(matchId);
      const eligible = match !== null && match.status === "completed";

      if (eligible) {
        logInfo('MatchUploadService', '✅ Match is eligible for upload', {
          matchId,
          status: match?.status
        });
      } else {
        logWarn('MatchUploadService', '⚠️ Match not eligible for upload', {
          matchId,
          matchExists: match !== null,
          status: match?.status
        });
      }

      return eligible;
    } catch (error) {
      logError('MatchUploadService', '❌ Error checking upload eligibility', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }
}
