import type { IPlayerRepository } from "../repositories/IPlayerRepository";
import type { CreatePlayerData, UpdatePlayerData } from "../models/Player";

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 20;

/**
 * Service Layer Pattern
 * Business logic for player operations
 *
 * Features:
 * - Player creation with validation (name, jersey number 0-99)
 * - Team roster limits (max 13 players per team)
 * - Player updates (name, jersey number, photo)
 * - Player deletion
 * - Retrieving team rosters and individual players
 *
 * Validation rules:
 * - Player name required and non-empty
 * - Jersey number must be 0-99
 * - Maximum 13 players per team
 */
export class PlayerService {
  constructor(private playerRepository: IPlayerRepository) {}

  /**
   * Create a new player with validation
   * Enforces team roster limit and jersey number rules
   *
   * @param data - Player creation data (name, jerseyNumber, teamId, etc.)
   * @returns Success result with player data or error message
   */
  async createPlayer(data: CreatePlayerData) {
    // Validate player name
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "Le nom du joueur est requis" };
    }

    // Validate jersey number
    if (data.jerseyNumber < 0 || data.jerseyNumber > 99) {
      return { success: false, error: "Le numéro doit être entre 0 et 99" };
    }

    // Check max players limit
    const playerCount = await this.playerRepository.countByTeamId(data.teamId);
    if (playerCount >= MAX_PLAYERS) {
      return {
        success: false,
        error: `Une équipe ne peut pas avoir plus de ${MAX_PLAYERS} joueurs`
      };
    }

    const player = await this.playerRepository.create(data);
    if (!player) {
      return { success: false, error: "Erreur lors de la création du joueur" };
    }

    return { success: true, player };
  }

  /**
   * Update an existing player
   * Validates jersey number if provided in update data
   *
   * @param id - ID of the player to update
   * @param data - Player update data (partial fields)
   * @returns Success result with updated player or error message
   */
  async updatePlayer(id: string, data: UpdatePlayerData) {
    // Validate jersey number if provided
    if (data.jerseyNumber !== undefined && (data.jerseyNumber < 0 || data.jerseyNumber > 99)) {
      return { success: false, error: "Le numéro doit être entre 0 et 99" };
    }

    const player = await this.playerRepository.update(id, data);
    if (!player) {
      return { success: false, error: "Erreur lors de la modification du joueur" };
    }

    return { success: true, player };
  }

  /**
   * Delete a player from a team
   *
   * @param id - ID of the player to delete
   * @param teamId - ID of the team (for context, not used in deletion)
   * @returns Success result or error message
   */
  async deletePlayer(id: string, teamId: string) {
    const deleted = await this.playerRepository.delete(id);
    if (!deleted) {
      return { success: false, error: "Erreur lors de la suppression du joueur" };
    }

    return { success: true };
  }

  /**
   * Get all players for a team
   *
   * @param teamId - ID of the team
   * @returns List of players in the team
   */
  async getTeamPlayers(teamId: string) {
    return await this.playerRepository.findByTeamId(teamId);
  }

  /**
   * Get a specific player by ID
   *
   * @param id - ID of the player
   * @returns Player data or null if not found
   */
  async getPlayerById(id: string) {
    return await this.playerRepository.findById(id);
  }
}
