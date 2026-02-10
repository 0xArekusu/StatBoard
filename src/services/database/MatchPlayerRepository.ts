/**
 * MatchPlayerRepository
 *
 * Repository for managing match player data embedded in matches table.
 * Players are stored as JSON in matches.players column.
 *
 * Features:
 * - Single player creation with photo URL support
 * - Batch player creation within transaction for match initialization
 * - Player retrieval ordered by team, starter status, and jersey number
 * - Player deletion for match cleanup
 * - Photo URL updates for player images
 *
 * Architecture:
 * - Uses SQLite via DatabaseService
 * - Stores players in matches.players JSON column
 * - Supports both club players (player_id) and anonymous players
 */
import { DatabaseService } from "./DatabaseService";
import { logInfo, logError } from "../../../utils/logger";
import { MatchPlayerInfo } from "../../models/types";

export interface MatchPlayer {
  id: number;
  match_id: string;
  player_id?: string | null;
  player_number: number;
  player_name: string;
  team: "MyTeam" | "Opponent";
  is_starter: boolean;
  on_court?: number;
  playing_time_seconds?: number;
  photo_url?: string | null;
  created_at: string;
}

export interface CreateMatchPlayerData {
  match_id: string;
  player_id?: string | null;
  player_number: number;
  player_name: string;
  team: "MyTeam" | "Opponent";
  is_starter: boolean;
  photo_url?: string | null;
}

export interface IMatchPlayerRepository {
  create(data: CreateMatchPlayerData): Promise<MatchPlayer>;
  createBatch(players: CreateMatchPlayerData[]): Promise<MatchPlayer[]>;
  getPlayersForMatch(matchId: string): Promise<MatchPlayer[]>;
  deletePlayersForMatch(matchId: string): Promise<void>;
}

export class MatchPlayerRepository implements IMatchPlayerRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Get players array from matches.players JSON column
   */
  private async getPlayersJson(matchId: string): Promise<MatchPlayerInfo[]> {
    const matches = await this.db.query(
      "SELECT players FROM matches WHERE id = ?",
      [matchId]
    );

    if (matches.length === 0) {
      return [];
    }

    const playersJson = matches[0].players;
    if (!playersJson || playersJson === '[]') {
      return [];
    }

    return JSON.parse(playersJson);
  }

  /**
   * Save players array to matches.players JSON column
   */
  private async savePlayersJson(matchId: string, players: MatchPlayerInfo[]): Promise<void> {
    const playersJson = JSON.stringify(players);
    await this.db.execute(
      "UPDATE matches SET players = ? WHERE id = ?",
      [playersJson, matchId]
    );
  }

  /**
   * Create a single match player
   * Adds player to matches.players JSON array
   */
  async create(data: CreateMatchPlayerData): Promise<MatchPlayer> {
    try {
      logInfo('MatchPlayerRepository', '👤 Creating match player in matches.players JSON', {
        matchId: data.match_id,
        playerNumber: data.player_number,
        playerName: data.player_name,
        team: data.team,
        isStarter: data.is_starter,
        hasPhoto: !!data.photo_url
      });

      // Get existing players
      const players = await this.getPlayersJson(data.match_id);

      // Create new player info
      const newPlayer: MatchPlayerInfo = {
        player_id: data.player_id || null,
        player_number: data.player_number,
        player_name: data.player_name,
        team: data.team,
        is_starter: data.is_starter,
        photo_url: data.photo_url || null,
        on_court: 0,
        playing_time_seconds: 0,
      };

      // Add to array
      players.push(newPlayer);

      // Save back to database
      await this.savePlayersJson(data.match_id, players);

      logInfo('MatchPlayerRepository', '✅ Match player created successfully', {
        playerNumber: data.player_number,
        playerName: data.player_name,
        team: data.team
      });

      // Return as MatchPlayer (with synthetic id)
      return {
        id: players.length, // Synthetic ID based on array index
        match_id: data.match_id,
        player_id: data.player_id || null,
        player_number: data.player_number,
        player_name: data.player_name,
        team: data.team,
        is_starter: data.is_starter,
        photo_url: data.photo_url || null,
        on_court: 0,
        playing_time_seconds: 0,
        created_at: new Date().toISOString(),
      };
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
   * Replaces the entire players array in matches.players
   */
  async createBatch(players: CreateMatchPlayerData[]): Promise<MatchPlayer[]> {
    if (players.length === 0) return [];

    try {
      logInfo('MatchPlayerRepository', '👥 Creating batch of match players in matches.players JSON', {
        playerCount: players.length,
        matchId: players[0].match_id
      });

      const matchId = players[0].match_id;

      // Convert to MatchPlayerInfo array
      const playerInfos: MatchPlayerInfo[] = players.map(player => ({
        player_id: player.player_id || null,
        player_number: player.player_number,
        player_name: player.player_name,
        team: player.team,
        is_starter: player.is_starter,
        photo_url: player.photo_url || null,
        on_court: 0,
        playing_time_seconds: 0,
      }));

      // Save to database
      await this.savePlayersJson(matchId, playerInfos);

      logInfo('MatchPlayerRepository', '✅ Batch of match players created successfully', {
        playerCount: players.length,
        matchId
      });

      // Convert back to MatchPlayer format
      return playerInfos.map((player, index) => ({
        id: index + 1,
        match_id: matchId,
        player_id: player.player_id,
        player_number: player.player_number,
        player_name: player.player_name,
        team: player.team,
        is_starter: player.is_starter,
        photo_url: player.photo_url,
        on_court: player.on_court || 0,
        playing_time_seconds: player.playing_time_seconds || 0,
        created_at: new Date().toISOString(),
      }));
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
  async getPlayersForMatch(matchId: string): Promise<MatchPlayer[]> {
    try {
      logInfo('MatchPlayerRepository', '📋 Fetching players for match', { matchId });

      const players = await this.getPlayersJson(matchId);

      // Sort: team, starter status DESC, player number
      const sorted = [...players].sort((a, b) => {
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        if (a.is_starter !== b.is_starter) return a.is_starter ? -1 : 1;
        return a.player_number - b.player_number;
      });

      logInfo('MatchPlayerRepository', '✅ Players retrieved', {
        matchId,
        playerCount: sorted.length
      });

      // Convert to MatchPlayer format
      return sorted.map((player, index) => ({
        id: index + 1,
        match_id: matchId,
        player_id: player.player_id,
        player_number: player.player_number,
        player_name: player.player_name,
        team: player.team,
        is_starter: player.is_starter,
        photo_url: player.photo_url,
        on_court: player.on_court || 0,
        playing_time_seconds: player.playing_time_seconds || 0,
        created_at: new Date().toISOString(),
      }));
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
   * Clears the players array in matches.players
   */
  async deletePlayersForMatch(matchId: string): Promise<void> {
    try {
      logInfo('MatchPlayerRepository', '🗑️ Deleting all players for match', { matchId });

      await this.savePlayersJson(matchId, []);

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
   * Finds player in JSON array and updates photo_url
   */
  async updatePhotoUrl(playerId: number, photoUrl: string): Promise<void> {
    try {
      logInfo('MatchPlayerRepository', '📸 Updating player photo URL', {
        playerId,
        photoUrl
      });

      // Note: playerId is synthetic (array index), not useful for JSON lookup
      // This method is deprecated in favor of updatePhotoUrlByPlayerNumber
      logError('MatchPlayerRepository', '⚠️ updatePhotoUrl is deprecated - use updatePhotoUrlByPlayerNumber instead', {
        playerId
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
   * Update photo URL by player number and team
   */
  async updatePhotoUrlByPlayerNumber(
    matchId: string,
    playerNumber: number,
    team: "MyTeam" | "Opponent",
    photoUrl: string
  ): Promise<void> {
    try {
      logInfo('MatchPlayerRepository', '📸 Updating player photo URL by number', {
        matchId,
        playerNumber,
        team,
        photoUrl
      });

      const players = await this.getPlayersJson(matchId);
      const playerIndex = players.findIndex(
        p => p.player_number === playerNumber && p.team === team
      );

      if (playerIndex === -1) {
        throw new Error(`Player not found: ${playerNumber} (${team})`);
      }

      players[playerIndex].photo_url = photoUrl;
      await this.savePlayersJson(matchId, players);

      logInfo('MatchPlayerRepository', '✅ Player photo URL updated', {
        matchId,
        playerNumber,
        team
      });
    } catch (error) {
      logError('MatchPlayerRepository', '❌ Error updating player photo URL', {
        matchId,
        playerNumber,
        team,
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
    matchId: string,
    playerIds: string[],
    onCourt: boolean
  ): Promise<void> {
    try {
      const onCourtValue = onCourt ? 1 : 0;
      const players = await this.getPlayersJson(matchId);

      // Update matching players
      for (const player of players) {
        if (player.player_id && playerIds.includes(player.player_id)) {
          player.on_court = onCourtValue;
        }
      }

      await this.savePlayersJson(matchId, players);

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
  async addPlayingTime(matchId: string, secondsToAdd: number): Promise<void> {
    try {
      const players = await this.getPlayersJson(matchId);

      // Update players who are on court
      for (const player of players) {
        if (player.on_court === 1) {
          player.playing_time_seconds = (player.playing_time_seconds || 0) + secondsToAdd;
        }
      }

      await this.savePlayersJson(matchId, players);

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
  async initializeOnCourtForStarters(matchId: string): Promise<void> {
    try {
      const players = await this.getPlayersJson(matchId);

      // Set on_court for starters
      for (const player of players) {
        if (player.is_starter) {
          player.on_court = 1;
        }
      }

      await this.savePlayersJson(matchId, players);

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
  async getPlayersOnCourt(matchId: string, team?: 'A' | 'B'): Promise<MatchPlayer[]> {
    try {
      const players = await this.getPlayersJson(matchId);

      // Filter by on_court and optionally by team
      const filtered = players.filter(p => {
        if (p.on_court !== 1) return false;
        if (team) {
          // Map team 'A' to 'MyTeam' and 'B' to 'Opponent'
          const teamName = team === 'A' ? 'MyTeam' : 'Opponent';
          return p.team === teamName;
        }
        return true;
      });

      // Sort by team and player number
      const sorted = filtered.sort((a, b) => {
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        return a.player_number - b.player_number;
      });

      logInfo('MatchPlayerRepository', '✅ Retrieved players on court', {
        matchId,
        team,
        playerCount: sorted.length
      });

      // Convert to MatchPlayer format
      return sorted.map((player, index) => ({
        id: index + 1,
        match_id: matchId,
        player_id: player.player_id,
        player_number: player.player_number,
        player_name: player.player_name,
        team: player.team,
        is_starter: player.is_starter,
        photo_url: player.photo_url,
        on_court: player.on_court || 0,
        playing_time_seconds: player.playing_time_seconds || 0,
        created_at: new Date().toISOString(),
      }));
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
