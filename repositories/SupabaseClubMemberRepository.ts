import type { SupabaseClient } from "@supabase/supabase-js";
import type { IClubMemberRepository } from "./IClubMemberRepository";
import type { ClubMember, CreateClubMemberData } from "../models/ClubMember";

export class SupabaseClubMemberRepository implements IClubMemberRepository {
  constructor(private supabase: SupabaseClient) {}

  private mapToClubMember(row: any): ClubMember {
    return {
      id: row.id,
      clubId: row.club_id,
      userId: row.user_id,
      email: row.email,
      joinedAt: new Date(row.joined_at),
    };
  }

  async create(data: CreateClubMemberData): Promise<ClubMember | null> {
    const { data: member, error } = await this.supabase
      .from("club_members")
      .insert({
        club_id: data.clubId,
        user_id: data.userId,
        email: data.email,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating club member:", error);
      return null;
    }

    return this.mapToClubMember(member);
  }

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

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("club_members")
      .delete()
      .eq("id", id);

    return !error;
  }
}
