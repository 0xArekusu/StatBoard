import type { IPlayerRepository } from "../repositories/IPlayerRepository";
import type { CreatePlayerData, UpdatePlayerData } from "../models/Player";

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 13;

export class PlayerService {
  constructor(private playerRepository: IPlayerRepository) {}

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

  async deletePlayer(id: string, teamId: string) {
    const deleted = await this.playerRepository.delete(id);
    if (!deleted) {
      return { success: false, error: "Erreur lors de la suppression du joueur" };
    }

    return { success: true };
  }

  async getTeamPlayers(teamId: string) {
    return await this.playerRepository.findByTeamId(teamId);
  }

  async getPlayerById(id: string) {
    return await this.playerRepository.findById(id);
  }
}
