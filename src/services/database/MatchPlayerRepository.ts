/**
 * MatchPlayerRepository
 *
 * Repository for managing match player data in SQLite database.
 * Stores player information for each match (starters and substitutes).
 *
 * Features:
 * - Single player creation with photo URL support
 * - Batch player creation within transaction for match initialization
 * - Player retrieval ordered by team, starter status, and jersey number
 * - Player deletion for match cleanup
 * - Photo URL updates for player images
 * - Compacted actions storage (actions column for completed matches)
 *
 * Architecture:
 * - Uses SQLite via DatabaseService
 * - Stores players in match_players table
 * - Links to matches via match_id foreign key
 * - Supports both club players (player_id) and anonymous players
 */
import { DatabaseService } from "./DatabaseService";
import { logInfo, logError } from "../../../utils/logger";

export interface MatchPlayer {
  id: number;
  match_id: number;
  player_id?: string | null;
  player_number: number;
  player_name: string;
  team: "A" | "B";
  is_starter: boolean;
  on_court?: number;
  playing_time_seconds?: number;
  photo_url?: string | null;
  created_at: string;
}

export interface CreateMatchPlayerData {
  match_id: number;
  player_id?: string | null;
  player_number: number;
  player_name: string;
  team: "A" | "B";
  is_starter: boolean;
  photo_url?: string | null;
}

export interface IMatchPlayerRepository {
  create(data: CreateMatchPlayerData): Promise<MatchPlayer>;
  createBatch(players: CreateMatchPlayerData[]): Promise<MatchPlayer[]>;
  getPlayersForMatch(matchId: number): Promise<MatchPlayer[]>;
  deletePlayersForMatch(matchId: number): Promise<void>;
}

export class MatchPlayerRepository implements IMatchPlayerRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create a single match player in SQLite database
   * Used for adding players during match or for individual updates
   */
  async create(data: CreateMatchPlayerData): Promise<MatchPlayer> {
    const sql = `
      INSERT INTO match_players (
        match_id, player_id, player_number, player_name, team, is_starter, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      logInfo('MatchPlayerRepository', '👤 Creating match player in SQLite', {
        matchId: data.match_id,
        playerNumber: data.player_number,
        playerName: data.player_name,
        team: data.team,
        isStarter: data.is_starter,
        hasPhoto: !!data.photo_url
      });

      await this.db.execute(sql, [
        data.match_id,
        data.player_id || null,
        data.player_number,
        data.player_name,
        data.team,
        data.is_starter ? 1 : 0,
        data.photo_url || null,
      ]);

      const players = await this.db.query(
        "SELECT * FROM match_players WHERE match_id = ? ORDER BY id DESC LIMIT 1",
        [data.match_id]
      );

      if (players.length === 0) {
        logError('MatchPlayerRepository', '❌ Failed to retrieve created player', {
          matchId: data.match_id
        });
        throw new Error("Failed to create match player");
      }

      logInfo('MatchPlayerRepository', '✅ Match player created successfully', {
        playerId: players[0].id,
        playerNumber: data.player_number,
        playerName: data.player_name,
        team: data.team
      });

      return players[0] as MatchPlayer;
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error creating match player', {
        error: error instanceof Error ? error.message : error,
        matchId: data.match_id,
        playerNumber: data.player_number
      });
      throw error;
    }
  }

  /**
   * Create multiple match players in a single transaction
   * Used during match initialization to save all players at once
   * More efficient than individual creates
   */
  async createBatch(players: CreateMatchPlayerData[]): Promise<MatchPlayer[]> {
    if (players.length === 0) return [];

    try {
      logInfo('MatchPlayerRepository', '👥 Creating batch of match players in SQLite transaction', {
        playerCount: players.length,
        matchId: players[0].match_id
      });

      await this.db.transaction(async (adapter) => {
        const sql = `
          INSERT INTO match_players (
            match_id, player_id, player_number, player_name, team, is_starter, photo_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        for (const player of players) {
          await adapter.execute(sql, [
            player.match_id,
            player.player_id || null,
            player.player_number,
            player.player_name,
            player.team,
            player.is_starter ? 1 : 0,
            player.photo_url || null,
          ]);
        }
      });

      const matchId = players[0].match_id;
      const createdPlayers = await this.db.query(
        "SELECT * FROM match_players WHERE match_id = ? ORDER BY team, is_starter DESC, player_number",
        [matchId]
      );

      logInfo('MatchPlayerRepository', '✅ Batch of match players created successfully', {
        playerCount: players.length,
        matchId
      });

      return createdPlayers as MatchPlayer[];
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error creating match player batch', {
        error: error instanceof Error ? error.message : error,
        playerCount: players.length,
        matchId: players[0]?.match_id
      });
      throw error;
    }
  }

  /**
   * Get all players for a match
   * Returns players ordered by: team, starter status (starters first), jersey number
   */
  async getPlayersForMatch(matchId: number): Promise<MatchPlayer[]> {
    try {
      logInfo('MatchPlayerRepository', '📋 Fetching players for match', { matchId });

      const players = await this.db.query(
        "SELECT * FROM match_players WHERE match_id = ? ORDER BY team, is_starter DESC, player_number",
        [matchId]
      );

      logInfo('MatchPlayerRepository', '✅ Players retrieved', {
        matchId,
        playerCount: players.length
      });

      return players as MatchPlayer[];
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error getting players for match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Delete all players for a match
   * Used during match cleanup or when resetting match players
   */
  async deletePlayersForMatch(matchId: number): Promise<void> {
    try {
      logInfo('MatchPlayerRepository', '🗑️ Deleting all players for match', { matchId });

      await this.db.execute("DELETE FROM match_players WHERE match_id = ?", [
        matchId,
      ]);

      logInfo('MatchPlayerRepository', '✅ All players deleted for match', { matchId });
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error deleting players for match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update player photo URL
   * Used when uploading player photos to Supabase storage
   */
  async updatePhotoUrl(playerId: number, photoUrl: string): Promise<void> {
    try {
      logInfo('MatchPlayerRepository', '📸 Updating player photo URL', {
        playerId,
        photoUrl
      });

      await this.db.execute(
        "UPDATE match_players SET photo_url = ? WHERE id = ?",
        [photoUrl, playerId]
      );

      logInfo('MatchPlayerRepository', '✅ Player photo URL updated', {
        playerId,
        photoUrl
      });
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error updating player photo URL', {
        playerId,
        photoUrl,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update on_court status for players
   * Used during substitutions to track who is currently on the court
   */
  async updateOnCourtStatus(
    matchId: number,
    playerIds: string[],
    onCourt: boolean
  ): Promise<void> {
    try {
      const onCourtValue = onCourt ? 1 : 0;
      const placeholders = playerIds.map(() => '?').join(',');

      await this.db.execute(
        `UPDATE match_players
         SET on_court = ?
         WHERE match_id = ? AND player_id IN (${placeholders})`,
        [onCourtValue, matchId, ...playerIds]
      );

      logInfo('MatchPlayerRepository', '✅ Updated on_court status', {
        matchId,
        playerCount: playerIds.length,
        onCourt
      });
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error updating on_court status', {
        matchId,
        playerIds,
        onCourt,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Add playing time to players who are currently on court
   * Called periodically (every 5 seconds) when the game clock is running
   */
  async addPlayingTime(matchId: number, secondsToAdd: number): Promise<void> {
    try {
      await this.db.execute(
        `UPDATE match_players
         SET playing_time_seconds = playing_time_seconds + ?
         WHERE match_id = ? AND on_court = 1`,
        [secondsToAdd, matchId]
      );

      logInfo('MatchPlayerRepository', '⏱️ Added playing time', {
        matchId,
        secondsAdded: secondsToAdd
      });
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error adding playing time', {
        matchId,
        secondsToAdd,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Initialize on_court status for starters at match start
   * Sets on_court = 1 for all starters
   */
  async initializeOnCourtForStarters(matchId: number): Promise<void> {
    try {
      await this.db.execute(
        `UPDATE match_players
         SET on_court = 1
         WHERE match_id = ? AND is_starter = 1`,
        [matchId]
      );

      logInfo('MatchPlayerRepository', '✅ Initialized on_court for starters', {
        matchId
      });
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error initializing on_court', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get players currently on court for a match
   */
  async getPlayersOnCourt(matchId: number, team?: 'A' | 'B'): Promise<MatchPlayer[]> {
    try {
      const query = team
        ? 'SELECT * FROM match_players WHERE match_id = ? AND on_court = 1 AND team = ? ORDER BY player_number'
        : 'SELECT * FROM match_players WHERE match_id = ? AND on_court = 1 ORDER BY team, player_number';

      const params = team ? [matchId, team] : [matchId];
      const players = await this.db.query(query, params);

      logInfo('MatchPlayerRepository', '✅ Retrieved players on court', {
        matchId,
        team,
        playerCount: players.length
      });

      return players as MatchPlayer[];
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error getting players on court', {
        matchId,
        team,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}
