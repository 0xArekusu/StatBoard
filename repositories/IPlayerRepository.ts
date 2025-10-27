import type { Player, CreatePlayerData, UpdatePlayerData } from "../models/Player";

export interface IPlayerRepository {
  create(data: CreatePlayerData): Promise<Player | null>;
  update(id: string, data: UpdatePlayerData): Promise<Player | null>;
  findById(id: string): Promise<Player | null>;
  findByTeamId(teamId: string): Promise<Player[]>;
  delete(id: string): Promise<boolean>;
  countByTeamId(teamId: string): Promise<number>;
}
