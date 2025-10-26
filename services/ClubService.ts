import { Club, CreateClubData, UpdateClubData } from "../models/Club";
import { IClubRepository } from "../repositories/IClubRepository";
import { canUseMultiClub } from "../src/config/devConfig";

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
    // Validation
    if (!data.name.trim()) {
      return { success: false, error: "Club name is required" };
    }

    if (data.name.length > 30) {
      return { success: false, error: "Club name must be 30 characters or less" };
    }

    if (!data.acronym.trim()) {
      return { success: false, error: "Club acronym is required" };
    }

    if (data.acronym.length > 5) {
      return { success: false, error: "Club acronym must be 5 characters or less" };
    }

    // Check if user already has a club (unless multi-club is enabled for this user)
    if (!canUseMultiClub(userId)) {
      const existingClubs = await this.clubRepository.findByOwnerId(userId);
      if (existingClubs.length > 0) {
        return { success: false, error: "Vous avez déjà créé un club" };
      }
    }

    // Create club
    const club = await this.clubRepository.create(data);

    if (!club) {
      return { success: false, error: "Failed to create club" };
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
      return { success: false, error: "Club name cannot be empty" };
    }

    if (data.name !== undefined && data.name.length > 30) {
      return { success: false, error: "Club name must be 30 characters or less" };
    }

    if (data.acronym !== undefined && !data.acronym.trim()) {
      return { success: false, error: "Club acronym cannot be empty" };
    }

    if (data.acronym !== undefined && data.acronym.length > 5) {
      return { success: false, error: "Club acronym must be 5 characters or less" };
    }

    // Update club
    const club = await this.clubRepository.update(id, data);

    if (!club) {
      return { success: false, error: "Failed to update club" };
    }

    return { success: true, club };
  }

  /**
   * Delete a club
   */
  async deleteClub(id: string): Promise<boolean> {
    return await this.clubRepository.delete(id);
  }
}
