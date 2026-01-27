import type { SupabaseClient } from "@supabase/supabase-js";
import type { IClubMemberRepository } from "./IClubMemberRepository";
import type { ClubMember, CreateClubMemberData } from "../models/ClubMember";

/**
 * Supabase implementation of Club Member Repository
 * Manages club membership relationships in Supabase database
 *
 * Features:
 * - Membership creation with email tracking
 * - Query members by club or user
 * - Membership validation (find by club and user)
 * - Membership deletion
 * - Automatic timestamp tracking (joined_at)
 *
 * Architecture:
 * - Uses Supabase client for database operations
 * - Implements IClubMemberRepository interface
 * - Maps database rows to ClubMember domain model
 * - Handles errors gracefully with logging
 */
export class SupabaseClubMemberRepository implements IClubMemberRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Map Supabase row to ClubMember domain model
   * Converts snake_case to camelCase
   */
  private mapToClubMember(row: any): ClubMember {
    return {
      id: row.id,
      clubId: row.club_id,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      joinedAt: new Date(row.joined_at),
    };
  }

  /**
   * Create a new club membership
   * Associates a user with a club via email
   *
   * @param data - Membership data (clubId, userId, email)
   * @returns Created membership or null on error
   */
  async create(data: CreateClubMemberData): Promise<ClubMember | null> {
    const { data: member, error } = await this.supabase
      .from("club_members")
      .insert({
        club_id: data.clubId,
        user_id: data.userId,
        email: data.email,
        display_name: data.displayName,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating club member:", error);
      return null;
    }

    return this.mapToClubMember(member);
  }

  /**
   * Get all members of a club
   * Returns members ordered by join date (newest first)
   *
   * @param clubId - ID of the club
   * @returns List of club members
   */
  async findByClubId(clubId: string): Promise<ClubMember[]> {
    const { data, error } = await this.supabase
      .from("club_members")
      .select("*")
      .eq("club_id", clubId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error fetching club members:", error);
      return [];
    }

    return data.map(this.mapToClubMember);
  }

  /**
   * Get all clubs where a user is a member
   * Returns memberships ordered by join date (newest first)
   *
   * @param userId - ID of the user
   * @returns List of user's club memberships
   */
  async findByUserId(userId: string): Promise<ClubMember[]> {
    const { data, error } = await this.supabase
      .from("club_members")
      .select("*")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error fetching user club memberships:", error);
      return [];
    }

    return data.map(this.mapToClubMember);
  }

  /**
   * Check if a user is a member of a specific club
   * Returns the membership if it exists
   *
   * @param clubId - ID of the club
   * @param userId - ID of the user
   * @returns Membership or null if not found
   */
  async findByClubAndUser(clubId: string, userId: string): Promise<ClubMember | null> {
    const { data, error } = await this.supabase
      .from("club_members")
      .select("*")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToClubMember(data);
  }

  /**
   * Delete a club membership
   * Removes the association between user and club
   *
   * @param id - ID of the membership to delete
   * @returns true if deletion succeeded, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("club_members")
      .delete()
      .eq("id", id);

    return !error;
  }
}
