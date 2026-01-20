import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITeamRepository } from "./ITeamRepository";
import type { Team, CreateTeamData, UpdateTeamData, TeamStatus } from "../models/Team";

/**
 * Supabase implementation of Team Repository
 * Manages team data within clubs in Supabase database
 *
 * Features:
 * - Team creation with pending approval status
 * - Team queries (by ID, club, status, owner)
 * - Team updates (name, gender, coach, status, active flag)
 * - Soft deletion (marks as deleted instead of removing)
 * - Player count aggregation
 * - Owner email resolution via club_members
 * - Team counting for limit enforcement
 *
 * Architecture:
 * - Uses Supabase client for database operations
 * - Implements ITeamRepository interface
 * - Maps database rows to Team domain model
 * - Handles errors gracefully with logging
 * - Uses soft deletes for data preservation
 */
export class SupabaseTeamRepository implements ITeamRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Map Supabase row to Team domain model
   * Converts snake_case to camelCase and handles nested data
   */
  private mapToTeam(row: any): Team {
    return {
      id: row.id,
      name: row.name,
      clubId: row.club_id,
      ownerId: row.owner_id,
      ownerEmail: row.club_members?.email || row.owner_email,
      category: row.category,
      gender: row.gender,
      coachName: row.coach_name,
      coachPhotoUrl: row.coach_photo_url,
      status: row.status,
      isActive: row.is_active ?? true,
      isDeleted: row.is_deleted ?? false,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Create a new team with pending status
   * Teams require club owner approval before becoming active
   *
   * @param data - Team creation data (name, clubId, gender, etc.)
   * @param ownerId - ID of the user creating the team
   * @returns Created team or null on error
   */
  async create(data: CreateTeamData, ownerId: string): Promise<Team | null> {
    const { data: team, error } = await this.supabase
      .from("teams")
      .insert({
        name: data.name,
        club_id: data.clubId,
        owner_id: ownerId,
        category: data.category,
        gender: data.gender,
        coach_name: data.coachName || 'Coach',
        coach_photo_url: data.coachPhotoUrl,
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

  /**
   * Find a team by ID
   *
   * @param id - ID of the team
   * @returns Team or null if not found
   */
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

  /**
   * Get all teams in a club (excluding soft-deleted)
   * Includes player count for each team
   * Returns teams ordered by creation date (newest first)
   *
   * @param clubId - ID of the club
   * @returns List of teams with player counts
   */
  async findByClubId(clubId: string): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from("teams")
      .select(`
        *,
        players:players(count)
      `)
      .eq("club_id", clubId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teams:", error);
      return [];
    }

    return data.map(row => ({
      ...this.mapToTeam(row),
      playerCount: row.players?.[0]?.count || 0
    }));
  }

  /**
   * Get teams filtered by club and status
   * Resolves owner emails from club_members for display
   * Returns teams ordered by creation date (newest first)
   *
   * @param clubId - ID of the club
   * @param status - Status filter (pending/approved/rejected)
   * @returns List of teams matching the status
   */
  async findByClubIdAndStatus(clubId: string, status: TeamStatus): Promise<Team[]> {
    // First get teams
    const { data: teams, error: teamsError } = await this.supabase
      .from("teams")
      .select("*")
      .eq("club_id", clubId)
      .eq("status", status)
      .eq("is_deleted", false)
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

  /**
   * Get all teams owned by a user (excluding soft-deleted)
   * Returns teams ordered by creation date (newest first)
   *
   * @param ownerId - ID of the user
   * @returns List of teams owned by the user
   */
  async findByOwnerId(ownerId: string): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from("teams")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false});

    if (error) {
      console.error("Error fetching user teams:", error);
      return [];
    }

    return data.map(this.mapToTeam);
  }

  /**
   * Update a team
   * Only updates fields that are provided
   *
   * @param id - ID of the team to update
   * @param data - Team update data (partial fields)
   * @returns Updated team or null on error
   */
  async update(id: string, data: UpdateTeamData): Promise<Team | null> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.coachName !== undefined) updateData.coach_name = data.coachName;
    if (data.coachPhotoUrl !== undefined) updateData.coach_photo_url = data.coachPhotoUrl;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

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

  /**
   * Soft delete a team
   * Marks team as deleted instead of removing from database
   * Preserves data for historical records
   *
   * @param id - ID of the team to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    // Soft delete - mark as deleted instead of physical deletion
    const { error } = await this.supabase
      .from("teams")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id);

    return !error;
  }

  /**
   * Count teams owned by a user in a specific club
   * Used for enforcing per-user team limits
   * Excludes soft-deleted teams
   *
   * @param ownerId - ID of the user
   * @param clubId - ID of the club
   * @returns Number of teams owned by the user in the club
   */
  async countByOwnerAndClub(ownerId: string, clubId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .eq("club_id", clubId)
      .eq("is_deleted", false);

    if (error) {
      console.error("Error counting teams:", error);
      return 0;
    }

    return count || 0;
  }
}
