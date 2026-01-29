import { SupabaseClient } from "@supabase/supabase-js";
import { Club, CreateClubData, UpdateClubData } from "../models/Club";
import { IClubRepository } from "./IClubRepository";
import { DEFAULT_COURT_COLORS } from "../src/theme/colors";
import { SubscriptionTier } from "../models/Subscription";

/**
 * Supabase implementation of Club Repository
 * Implements Repository Pattern with Dependency Injection
 */
export class SupabaseClubRepository implements IClubRepository {
  private readonly tableName = "clubs";

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Generate a unique 6-digit club code
   */
  private generateClubCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Map database row to Club domain model
   */
  private mapToClub(row: any): Club {
    return {
      id: row.id,
      name: row.name,
      acronym: row.acronym,
      code: row.code,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      courtBackgroundColor: row.court_background_color || DEFAULT_COURT_COLORS.background,
      courtLineColor: row.court_line_color || DEFAULT_COURT_COLORS.line,
      ownerId: row.owner_id,
      ownerEmail: row.owner_email,
      subscriptionTier: row.subscription_tier || 'free',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async create(data: CreateClubData): Promise<Club | null> {
    try {
      console.log('📦 [SupabaseClubRepository] create called with data:', data);

      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        console.log('❌ [SupabaseClubRepository] User not authenticated');
        throw new Error("User not authenticated");
      }

      console.log('👤 [SupabaseClubRepository] User authenticated:', user.id);

      // Generate unique code (retry if collision)
      let code = this.generateClubCode();
      let attempts = 0;
      const maxAttempts = 10;

      console.log('🎲 [SupabaseClubRepository] Generating club code...');

      while (attempts < maxAttempts) {
        const { data: existing } = await this.supabase
          .from(this.tableName)
          .select("code")
          .eq("code", code)
          .single();

        if (!existing) break;

        code = this.generateClubCode();
        attempts++;
      }

      if (attempts === maxAttempts) {
        console.log('❌ [SupabaseClubRepository] Failed to generate unique club code');
        throw new Error("Failed to generate unique club code");
      }

      console.log('✅ [SupabaseClubRepository] Generated unique code:', code);

      const insertData = {
        name: data.name,
        acronym: data.acronym,
        code,
        logo_url: data.logoUrl,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        court_background_color: data.courtBackgroundColor,
        court_line_color: data.courtLineColor,
        owner_id: user.id,
        owner_email: user.email,
        subscription_tier: 'ultimate', // Default to ultimate for testing
      };

      console.log('💾 [SupabaseClubRepository] Inserting into Supabase:', insertData);

      const { data: club, error } = await this.supabase
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.log('❌ [SupabaseClubRepository] Supabase insert error:', error);
        throw error;
      }

      console.log('✅ [SupabaseClubRepository] Club inserted successfully:', club);

      return club ? this.mapToClub(club) : null;
    } catch (error) {
      console.error("❌ [SupabaseClubRepository] Error creating club:", error);
      return null;
    }
  }

  async findById(id: string): Promise<Club | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        // PGRST116 means no rows found, which is expected - don't log it as an error
        if (error.code !== 'PGRST116') {
          console.error("Error finding club by id:", error);
        }
        return null;
      }

      return data ? this.mapToClub(data) : null;
    } catch (error: any) {
      // PGRST116 means no rows found, which is expected - don't log it as an error
      if (error?.code !== 'PGRST116') {
        console.error("Error finding club by id:", error);
      }
      return null;
    }
  }

  async findByCode(code: string): Promise<Club | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("*")
        .eq("code", code)
        .single();

      if (error) throw error;

      return data ? this.mapToClub(data) : null;
    } catch (error) {
      console.error("Error finding club by code:", error);
      return null;
    }
  }

  async findByOwnerId(userId: string): Promise<Club[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data ? data.map((row) => this.mapToClub(row)) : [];
    } catch (error) {
      console.error("Error finding clubs by owner:", error);
      return [];
    }
  }

  async findByMemberId(userId: string): Promise<Club[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          club_members!inner(user_id)
        `)
        .eq("club_members.user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data ? data.map((row) => this.mapToClub(row)) : [];
    } catch (error) {
      console.error("Error finding clubs by member:", error);
      return [];
    }
  }

  async update(id: string, data: UpdateClubData): Promise<Club | null> {
    try {
      const updateData: any = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.acronym !== undefined) updateData.acronym = data.acronym;
      if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
      if (data.primaryColor !== undefined)
        updateData.primary_color = data.primaryColor;
      if (data.secondaryColor !== undefined)
        updateData.secondary_color = data.secondaryColor;
      if (data.courtBackgroundColor !== undefined)
        updateData.court_background_color = data.courtBackgroundColor;
      if (data.courtLineColor !== undefined)
        updateData.court_line_color = data.courtLineColor;

      const { data: club, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return club ? this.mapToClub(club) : null;
    } catch (error) {
      console.error("Error updating club:", error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq("id", id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error deleting club:", error);
      return false;
    }
  }

  async updateSubscriptionTier(id: string, tier: SubscriptionTier): Promise<Club | null> {
    try {
      console.log(`📦 [SupabaseClubRepository] Updating subscription tier for club ${id} to ${tier}`);

      const { data: club, error } = await this.supabase
        .from(this.tableName)
        .update({ subscription_tier: tier })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("❌ [SupabaseClubRepository] Error updating subscription tier:", error);
        throw error;
      }

      console.log("✅ [SupabaseClubRepository] Subscription tier updated successfully");
      return club ? this.mapToClub(club) : null;
    } catch (error) {
      console.error("Error updating subscription tier:", error);
      return null;
    }
  }
}
