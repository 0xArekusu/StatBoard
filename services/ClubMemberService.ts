import type { IClubMemberRepository } from "../repositories/IClubMemberRepository";
import type { CreateClubMemberData } from "../models/ClubMember";

/**
 * Service Layer Pattern
 * Business logic for club membership operations
 *
 * Handles:
 * - Joining clubs (membership creation with duplicate check)
 * - Leaving clubs (membership deletion)
 * - Retrieving club members
 * - Retrieving user memberships
 * - Checking membership status
 */
export class ClubMemberService {
  constructor(private clubMemberRepository: IClubMemberRepository) {}

  /**
   * Add a user as a member to a club
   * Prevents duplicate memberships
   *
   * @param clubId - ID of the club to join
   * @param userId - ID of the user joining
   * @param email - Email of the user
   * @returns Success result with member data or error message
   */
  async joinClub(clubId: string, userId: string, email: string, displayName?: string) {
    // Check if user is already a member
    const existingMembership = await this.clubMemberRepository.findByClubAndUser(clubId, userId);
    if (existingMembership) {
      return { success: false, error: "Vous êtes déjà membre de ce club" };
    }

    const member = await this.clubMemberRepository.create({ clubId, userId, email, displayName });
    if (!member) {
      return { success: false, error: "Erreur lors de l'inscription au club" };
    }

    return { success: true, member };
  }

  /**
   * Remove a user from a club
   * Validates that user is actually a member before deletion
   *
   * @param clubId - ID of the club to leave
   * @param userId - ID of the user leaving
   * @returns Success result or error message
   */
  async leaveClub(clubId: string, userId: string) {
    const membership = await this.clubMemberRepository.findByClubAndUser(clubId, userId);
    if (!membership) {
      return { success: false, error: "Vous n'êtes pas membre de ce club" };
    }

    const deleted = await this.clubMemberRepository.delete(membership.id);
    if (!deleted) {
      return { success: false, error: "Erreur lors de la sortie du club" };
    }

    return { success: true };
  }

  /**
   * Get all members of a club
   *
   * @param clubId - ID of the club
   * @returns List of club members
   */
  async getClubMembers(clubId: string) {
    return await this.clubMemberRepository.findByClubId(clubId);
  }

  /**
   * Get all clubs where a user is a member
   *
   * @param userId - ID of the user
   * @returns List of memberships for this user
   */
  async getUserClubMemberships(userId: string) {
    return await this.clubMemberRepository.findByUserId(userId);
  }

  /**
   * Check if a user is a member of a club
   *
   * @param clubId - ID of the club
   * @param userId - ID of the user
   * @returns true if user is a member, false otherwise
   */
  async isMember(clubId: string, userId: string): Promise<boolean> {
    const membership = await this.clubMemberRepository.findByClubAndUser(clubId, userId);
    return !!membership;
  }
}
