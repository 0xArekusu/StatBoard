import { Club, CreateClubData, UpdateClubData } from "../models/Club";
import { IClubRepository } from "../repositories/IClubRepository";
import { AdminService } from "./AdminService";
import { SubscriptionTier } from "../models/Subscription";
import { CLUB_VALIDATION } from "../constants/clubConstants";
import i18n from "../src/i18n";

/**
 * Service Layer Pattern
 * Business logic for Club operations
 */
export class ClubService {
  constructor(private readonly clubRepository: IClubRepository) {}

  /**
   * Create a new club with validation
   */
  async createClub(
    data: CreateClubData,
    userId: string
  ): Promise<{
    success: boolean;
    club?: Club;
    error?: string;
  }> {
    console.log('🏀 [ClubService] createClub called with:', { data, userId });

    // Validation
    if (!data.name.trim()) {
      console.log('❌ [ClubService] Validation failed: Club name is required');
      return { success: false, error: i18n.t("clubService.nameRequired") };
    }

    if (data.name.length > CLUB_VALIDATION.NAME_MAX_LENGTH) {
      console.log('❌ [ClubService] Validation failed: Club name too long');
      return { success: false, error: i18n.t("clubService.nameTooLong", { max: CLUB_VALIDATION.NAME_MAX_LENGTH }) };
    }

    if (!data.acronym.trim()) {
      console.log('❌ [ClubService] Validation failed: Club acronym is required');
      return { success: false, error: i18n.t("clubService.acronymRequired") };
    }

    if (data.acronym.length > CLUB_VALIDATION.ACRONYM_MAX_LENGTH) {
      console.log('❌ [ClubService] Validation failed: Club acronym too long');
      return { success: false, error: i18n.t("clubService.acronymTooLong", { max: CLUB_VALIDATION.ACRONYM_MAX_LENGTH }) };
    }

    // Check if user already has a club (admins can create multiple clubs)
    const adminService = AdminService.getInstance();
    const isAdmin = await adminService.isAdmin();

    if (!isAdmin) {
      console.log('🔍 [ClubService] Checking existing clubs for user:', userId);
      const existingClubs = await this.clubRepository.findByOwnerId(userId);
      console.log('📊 [ClubService] Existing clubs count:', existingClubs.length);
      if (existingClubs.length > 0) {
        console.log('❌ [ClubService] User already has a club');
        return { success: false, error: i18n.t("clubService.alreadyHasClub") };
      }
    } else {
      console.log('✅ [ClubService] User is admin, can create multiple clubs');
    }

    // Create club
    console.log('📝 [ClubService] Creating club in repository...');
    const club = await this.clubRepository.create(data);
    console.log('✅ [ClubService] Club created:', club);

    if (!club) {
      console.log('❌ [ClubService] Failed to create club - repository returned null');
      return { success: false, error: i18n.t("clubService.createFailed") };
    }

    return { success: true, club };
  }

  /**
   * Get a club by ID
   */
  async getClubById(id: string): Promise<Club | null> {
    return await this.clubRepository.findById(id);
  }

  /**
   * Get a club by code
   */
  async getClubByCode(code: string): Promise<Club | null> {
    return await this.clubRepository.findByCode(code);
  }

  /**
   * Get all clubs owned by a user
   */
  async getUserClubs(userId: string): Promise<Club[]> {
    return await this.clubRepository.findByOwnerId(userId);
  }

  /**
   * Get all clubs where user is a member
   */
  async getUserMemberClubs(userId: string): Promise<Club[]> {
    return await this.clubRepository.findByMemberId(userId);
  }

  /**
   * Update a club with validation
   */
  async updateClub(
    id: string,
    data: UpdateClubData
  ): Promise<{ success: boolean; club?: Club; error?: string }> {
    // Validation
    if (data.name !== undefined && !data.name.trim()) {
      return { success: false, error: i18n.t("clubService.nameEmpty") };
    }

    if (data.name !== undefined && data.name.length > CLUB_VALIDATION.NAME_MAX_LENGTH) {
      return { success: false, error: i18n.t("clubService.nameTooLong", { max: CLUB_VALIDATION.NAME_MAX_LENGTH }) };
    }

    if (data.acronym !== undefined && !data.acronym.trim()) {
      return { success: false, error: i18n.t("clubService.acronymEmpty") };
    }

    if (data.acronym !== undefined && data.acronym.length > CLUB_VALIDATION.ACRONYM_MAX_LENGTH) {
      return { success: false, error: i18n.t("clubService.acronymTooLong", { max: CLUB_VALIDATION.ACRONYM_MAX_LENGTH }) };
    }

    // Update club
    const club = await this.clubRepository.update(id, data);

    if (!club) {
      return { success: false, error: i18n.t("clubService.updateFailed") };
    }

    return { success: true, club };
  }

  /**
   * Delete a club
   */
  async deleteClub(id: string): Promise<boolean> {
    return await this.clubRepository.delete(id);
  }

  /**
   * Update club subscription tier
   * @param id Club ID
   * @param tier New subscription tier
   * @returns Updated club or error
   */
  async updateSubscriptionTier(
    id: string,
    tier: SubscriptionTier
  ): Promise<{ success: boolean; club?: Club; error?: string }> {
    console.log(`🏀 [ClubService] Updating subscription tier for club ${id} to ${tier}`);

    const club = await this.clubRepository.updateSubscriptionTier(id, tier);

    if (!club) {
      console.log("❌ [ClubService] Failed to update subscription tier");
      return { success: false, error: i18n.t("clubService.subscriptionUpdateFailed") };
    }

    console.log("✅ [ClubService] Subscription tier updated successfully");
    return { success: true, club };
  }
}
