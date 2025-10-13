import { MatchRepository } from "../database/MatchRepository";
import { ActionRepository } from "../database/ActionRepository";
import { MatchPlayerRepository } from "../database/MatchPlayerRepository";
import { IMatchApiService } from "../api/types/IMatchApiService";
import { IPayloadAdapter } from "../api/types/IPayloadAdapter";
import { MatchData } from "../api/types/MatchData";

/**
 * Service for uploading matches to server and cleaning up local storage
 *
 * Workflow:
 * 1. Load match and actions from local database
 * 2. Transform data using payload adapter
 * 3. Upload to server via API service
 * 4. Delete local data on success
 */
export class MatchUploadService {
  constructor(
    private matchRepository: MatchRepository,
    private actionRepository: ActionRepository,
    private matchPlayerRepository: MatchPlayerRepository,
    private apiService: IMatchApiService,
    private payloadAdapter: IPayloadAdapter<any>
  ) {}

  /**
   * Upload match to server and clean up local storage
   * @param matchId Local match ID
   * @throws Error if match not found or upload fails
   */
  async uploadAndCleanup(matchId: number): Promise<void> {
    try {
      console.log("🚀 Starting upload process for match:", matchId);

      // 1. Load match from local database
      const match = await this.matchRepository.findById(matchId);
      if (!match) {
        throw new Error(`Match with ID ${matchId} not found`);
      }

      // 2. Load actions from local database
      const actions = await this.actionRepository.getActionsForMatch(matchId);

      // 3. Load players from local database
      const matchPlayers = await this.matchPlayerRepository.getPlayersForMatch(
        matchId
      );
      const players = matchPlayers.map((mp) => ({
        num: mp.player_number,
        name: mp.player_name,
        team: mp.team,
      }));
      console.log(`👥 Loaded ${players.length} players for match`);

      // 4. Build internal data model
      const matchData: MatchData = {
        match,
        actions,
        players,
      };

      // 5. Transform to API-specific format using adapter
      console.log("🔄 Transforming data with payload adapter...");
      const payload = this.payloadAdapter.adapt(matchData);

      // 6. Upload to server
      console.log("📤 Uploading to server...");
      await this.apiService.uploadMatch(payload);

      // 7. Clean up local storage (only on successful upload)
      console.log("🧹 Cleaning up local storage...");
      await this.actionRepository.deleteActionsForMatch(matchId);
      await this.matchPlayerRepository.deletePlayersForMatch(matchId);
      await this.matchRepository.delete(matchId);

      console.log("✅ Match uploaded and cleaned up successfully!");
    } catch (error) {
      console.error("❌ Upload and cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Check if a match can be uploaded
   * @param matchId Local match ID
   * @returns true if match exists and can be uploaded
   */
  async canUpload(matchId: number): Promise<boolean> {
    try {
      const match = await this.matchRepository.findById(matchId);
      return match !== null && match.status === "completed";
    } catch (error) {
      console.error("Error checking upload eligibility:", error);
      return false;
    }
  }
}
