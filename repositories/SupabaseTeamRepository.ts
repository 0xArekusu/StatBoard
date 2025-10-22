import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITeamRepository } from "./ITeamRepository";
import type { Team, CreateTeamData, UpdateTeamData, TeamStatus } from "../models/Team";

export class SupabaseTeamRepository implements ITeamRepository {
  constructor(private supabase: SupabaseClient) {}

  private mapToTeam(row: any): Team {
    return {
      id: row.id,
      name: row.name,
      clubId: row.club_id,
      ownerId: row.owner_id,
      ownerEmail: row.club_members?.email || row.owner_email,
      category: row.category,
      gender: row.gender,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async create(data: CreateTeamData, ownerId: string): Promise<Team | null> {
    const { data: team, error } = await this.supabase
      .from("teams")
      .insert({
        name: data.name,
        club_id: data.clubId,
        owner_id: ownerId,
        category: data.category,
        gender: data.gender,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating team:", error);
      return null;
    }

    return this.mapToTeam(team);
  }

  async findById(id: string): Promise<Team | null> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToTeam(data);
  }

  async findByClubId(clubId: string): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teams:", error);
      return [];
    }

    return data.map(this.mapToTeam);
  }

  async findByClubIdAndStatus(clubId: string, status: TeamStatus): Promise<Team[]> {
    // First get teams
    const { data: teams, error: teamsError } = await this.supabase
      .from("teams")
      .select("*")
      .eq("club_id", clubId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (teamsError) {
      console.error("Error fetching teams by status:", teamsError);
      return [];
    }

    if (!teams || teams.length === 0) {
      return [];
    }

    // Get owner IDs
    const ownerIds = teams.map(t => t.owner_id);

    // Get club members to fetch emails
    const { data: members, error: membersError } = await this.supabase
      .from("club_members")
      .select("user_id, email")
      .eq("club_id", clubId)
      .in("user_id", ownerIds);

    if (membersError) {
      console.error("Error fetching club members:", membersError);
      return teams.map(this.mapToTeam);
    }

    // Create a map of user_id -> email
    const emailMap = new Map(members?.map(m => [m.user_id, m.email]) || []);

    // Map teams with emails
    return teams.map(team => this.mapToTeam({
      ...team,
      owner_email: emailMap.get(team.owner_id)
    }));
  }

  async findByOwnerId(ownerId: string): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user teams:", error);
      return [];
    }

    return data.map(this.mapToTeam);
  }

  async update(id: string, data: UpdateTeamData): Promise<Team | null> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: team, error } = await this.supabase
      .from("teams")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating team:", error);
      return null;
    }

    return this.mapToTeam(team);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("teams")
      .delete()
      .eq("id", id);

    return !error;
  }

  async countByOwnerAndClub(ownerId: string, clubId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .eq("club_id", clubId);

    if (error) {
      console.error("Error counting teams:", error);
      return 0;
    }

    return count || 0;
  }
}
