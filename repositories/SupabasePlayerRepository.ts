import type { SupabaseClient } from "@supabase/supabase-js";
import type { IPlayerRepository } from "./IPlayerRepository";
import type { Player, CreatePlayerData, UpdatePlayerData } from "../models/Player";

/**
 * Supabase implementation of Player Repository
 * Manages player data for teams in Supabase database
 *
 * Features:
 * - Player creation with jersey number and photo
 * - Player updates (name, number, photo)
 * - Player queries (by ID, by team)
 * - Player count per team (for roster limits)
 * - Player deletion
 * - Automatic timestamp tracking
 *
 * Architecture:
 * - Uses Supabase client for database operations
 * - Implements IPlayerRepository interface
 * - Maps database rows to Player domain model
 * - Handles errors gracefully with logging
 */
export class SupabasePlayerRepository implements IPlayerRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Map Supabase row to Player domain model
   * Converts snake_case to camelCase
   */
  private mapToPlayer(row: any): Player {
    return {
      id: row.id,
      teamId: row.team_id,
      name: row.name,
      jerseyNumber: row.jersey_number,
      photoUrl: row.photo_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Create a new player for a team
   *
   * @param data - Player creation data (teamId, name, jerseyNumber, photoUrl)
   * @returns Created player or null on error
   */
  async create(data: CreatePlayerData): Promise<Player | null> {
    const { data: player, error } = await this.supabase
      .from("players")
      .insert({
        team_id: data.teamId,
        name: data.name,
        jersey_number: data.jerseyNumber,
        photo_url: data.photoUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating player:", error);
      return null;
    }

    return this.mapToPlayer(player);
  }

  /**
   * Update an existing player
   * Only updates fields that are provided
   *
   * @param id - ID of the player to update
   * @param data - Player update data (partial fields)
   * @returns Updated player or null on error
   */
  async update(id: string, data: UpdatePlayerData): Promise<Player | null> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.jerseyNumber !== undefined) updateData.jersey_number = data.jerseyNumber;
    if (data.photoUrl !== undefined) updateData.photo_url = data.photoUrl;

    const { data: player, error } = await this.supabase
      .from("players")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating player:", error);
      return null;
    }

    return this.mapToPlayer(player);
  }

  /**
   * Find a player by ID
   *
   * @param id - ID of the player
   * @returns Player or null if not found
   */
  async findById(id: string): Promise<Player | null> {
    const { data, error } = await this.supabase
      .from("players")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToPlayer(data);
  }

  /**
   * Get all players for a team
   * Returns players ordered by creation date
   *
   * @param teamId - ID of the team
   * @returns List of players in the team
   */
  async findByTeamId(teamId: string): Promise<Player[]> {
    const { data, error } = await this.supabase
      .from("players")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching players:", error);
      return [];
    }

    return data.map(this.mapToPlayer);
  }

  /**
   * Delete a player
   *
   * @param id - ID of the player to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("players")
      .delete()
      .eq("id", id);

    return !error;
  }

  /**
   * Count players in a team
   * Used for enforcing roster size limits
   *
   * @param teamId - ID of the team
   * @returns Number of players in the team
   */
  async countByTeamId(teamId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);

    if (error) {
      console.error("Error counting players:", error);
      return 0;
    }

    return count || 0;
  }
}
