import { Club, CreateClubData, UpdateClubData } from "../models/Club";

/**
 * Repository Pattern Interface
 * Abstracts data access logic for Club entities
 */
export interface IClubRepository {
  /**
   * Create a new club
   * @param data Club creation data
   * @returns Created club or null on failure
   */
  create(data: CreateClubData): Promise<Club | null>;

  /**
   * Find a club by its ID
   * @param id Club UUID
   * @returns Club or null if not found
   */
  findById(id: string): Promise<Club | null>;

  /**
   * Find a club by its unique code
   * @param code 6-digit club code
   * @returns Club or null if not found
   */
  findByCode(code: string): Promise<Club | null>;

  /**
   * Find all clubs owned by a user
   * @param userId User UUID
   * @returns Array of clubs
   */
  findByOwnerId(userId: string): Promise<Club[]>;

  /**
   * Find clubs where user is a member (via club_members)
   * @param userId User UUID
   * @returns Array of clubs
   */
  findByMemberId(userId: string): Promise<Club[]>;

  /**
   * Update a club
   * @param id Club UUID
   * @param data Update data
   * @returns Updated club or null on failure
   */
  update(id: string, data: UpdateClubData): Promise<Club | null>;

  /**
   * Delete a club
   * @param id Club UUID
   * @returns True if deleted, false otherwise
   */
  delete(id: string): Promise<boolean>;
}
