import type { SupabaseClient } from "@supabase/supabase-js";
import type { IPlayerRepository } from "./IPlayerRepository";
import type { Player, CreatePlayerData, UpdatePlayerData } from "../models/Player";

export class SupabasePlayerRepository implements IPlayerRepository {
  constructor(private supabase: SupabaseClient) {}

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

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("players")
      .delete()
      .eq("id", id);

    return !error;
  }

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
