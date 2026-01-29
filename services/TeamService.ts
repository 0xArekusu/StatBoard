import type { ITeamRepository } from "../repositories/ITeamRepository";
import type { IClubMemberRepository } from "../repositories/IClubMemberRepository";
import type { CreateTeamData, UpdateTeamData, TeamStatus } from "../models/Team";
import type { SubscriptionService } from "./SubscriptionService";

const MAX_TEAMS_PER_USER_PER_CLUB = 10;

/**
 * Service Layer Pattern
 * Business logic for team operations
 *
 * Features:
 * - Team creation with multi-level validation:
 *   - User must be club member
 *   - Club subscription limits (via SubscriptionService)
 *   - Per-user limit (max 10 teams per user per club)
 * - Team updates (owner only)
 * - Team status management (pending/approved/rejected)
 * - Team activation toggle
 * - Team deletion (owner only)
 * - Team queries (by ID, club, status, owner)
 *
 * Permissions:
 * - Team owner: Can update and delete team
 * - Club owner: Can approve/reject teams and toggle active status
 * - Club member: Can create teams (subject to limits)
 */
export class TeamService {
  constructor(
    private teamRepository: ITeamRepository,
    private clubMemberRepository: IClubMemberRepository,
    private subscriptionService?: SubscriptionService
  ) {}

  /**
   * Create a new team with validation
   * Validates club membership, subscription limits, and user limits
   *
   * @param data - Team creation data (name, clubId, etc.)
   * @param userId - ID of the user creating the team
   * @returns Success result with team data or error message
   */
  async createTeam(data: CreateTeamData, userId: string) {
    // Validate team name
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "Le nom de l'équipe est requis" };
    }

    // Check if user is a member of the club
    const isMember = await this.clubMemberRepository.findByClubAndUser(data.clubId, userId);
    if (!isMember) {
      return { success: false, error: "Vous devez être membre du club pour créer une équipe" };
    }

    // Check subscription limits (club-wide)
    if (this.subscriptionService) {
      const limitCheck = await this.subscriptionService.canCreateTeam(data.clubId);
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: limitCheck.error || "Limite d'équipes atteinte pour ce club",
        };
      }
    }

    // Check team limit per user per club
    const teamCount = await this.teamRepository.countByOwnerAndClub(userId, data.clubId);
    if (teamCount >= MAX_TEAMS_PER_USER_PER_CLUB) {
      return {
        success: false,
        error: `Vous ne pouvez pas créer plus de ${MAX_TEAMS_PER_USER_PER_CLUB} équipes dans ce club`,
      };
    }

    const team = await this.teamRepository.create(data, userId);
    if (!team) {
      return { success: false, error: "Erreur lors de la création de l'équipe" };
    }

    return { success: true, team };
  }

  /**
   * Update a team (owner only)
   * Status changes must use updateTeamStatus instead
   *
   * @param id - ID of the team to update
   * @param data - Team update data (name, etc.)
   * @param userId - ID of the user attempting the update
   * @returns Success result with updated team or error message
   */
  async updateTeam(id: string, data: UpdateTeamData, userId: string) {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      return { success: false, error: "Équipe introuvable" };
    }

    // Only team owner can update (status changes are handled separately)
    if (team.ownerId !== userId) {
      return { success: false, error: "Vous n'avez pas la permission de modifier cette équipe" };
    }

    const updatedTeam = await this.teamRepository.update(id, data);
    if (!updatedTeam) {
      return { success: false, error: "Erreur lors de la modification de l'équipe" };
    }

    return { success: true, team: updatedTeam };
  }

  /**
   * Update team status (club owner only)
   * Used for approving/rejecting team requests
   *
   * @param teamId - ID of the team
   * @param status - New status (pending/approved/rejected)
   * @param clubOwnerId - ID of the club owner (verified by RLS)
   * @returns Success result with updated team or error message
   */
  async updateTeamStatus(teamId: string, status: TeamStatus, clubOwnerId: string) {
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      return { success: false, error: "Équipe introuvable" };
    }

    // Verify that the user is the club owner
    // This will be checked by RLS, but we add it here for clarity
    const updatedTeam = await this.teamRepository.update(teamId, { status });
    if (!updatedTeam) {
      return { success: false, error: "Erreur lors de la validation de l'équipe" };
    }

    return { success: true, team: updatedTeam };
  }

  /**
   * Toggle team active status (club owner only)
   * Active teams are shown in team lists, inactive teams are hidden
   *
   * @param teamId - ID of the team
   * @param clubOwnerId - ID of the club owner (verified by RLS)
   * @returns Success result with updated team or error message
   */
  async toggleTeamActive(teamId: string, clubOwnerId: string) {
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      return { success: false, error: "Équipe introuvable" };
    }

    // Toggle the active status
    const updatedTeam = await this.teamRepository.update(teamId, {
      isActive: !team.isActive
    });

    if (!updatedTeam) {
      return { success: false, error: "Erreur lors de la modification du statut de l'équipe" };
    }

    return { success: true, team: updatedTeam };
  }

  /**
   * Delete a team (owner only)
   *
   * @param id - ID of the team to delete
   * @param userId - ID of the user attempting the deletion
   * @returns Success result or error message
   */
  async deleteTeam(id: string, userId: string) {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      return { success: false, error: "Équipe introuvable" };
    }

    if (team.ownerId !== userId) {
      return { success: false, error: "Vous n'avez pas la permission de supprimer cette équipe" };
    }

    const deleted = await this.teamRepository.delete(id);
    if (!deleted) {
      return { success: false, error: "Erreur lors de la suppression de l'équipe" };
    }

    return { success: true };
  }

  /**
   * Get a team by ID
   *
   * @param id - ID of the team
   * @returns Team data or null if not found
   */
  async getTeamById(id: string) {
    return await this.teamRepository.findById(id);
  }

  /**
   * Get all teams in a club
   *
   * @param clubId - ID of the club
   * @returns List of teams in the club
   */
  async getClubTeams(clubId: string) {
    return await this.teamRepository.findByClubId(clubId);
  }

  /**
   * Get teams in a club filtered by status
   *
   * @param clubId - ID of the club
   * @param status - Status filter (pending/approved/rejected)
   * @returns List of teams matching the status
   */
  async getClubTeamsByStatus(clubId: string, status: TeamStatus) {
    return await this.teamRepository.findByClubIdAndStatus(clubId, status);
  }

  /**
   * Get all teams owned by a user
   *
   * @param userId - ID of the user
   * @returns List of teams owned by the user
   */
  async getUserTeams(userId: string) {
    return await this.teamRepository.findByOwnerId(userId);
  }

  /**
   * Handle team limit enforcement when subscription changes
   * Suspends excess teams when downgrading to a lower tier
   *
   * @param clubId - ID of the club
   * @param newMaxTeams - New maximum number of teams allowed
   * @param selectedTeamIds - Array of team IDs to keep active (optional)
   * @returns Object with success status and info about teams affected
   */
  async enforceTeamLimits(
    clubId: string,
    newMaxTeams: number,
    selectedTeamIds?: string[]
  ): Promise<{
    success: boolean;
    suspendedCount?: number;
    activeCount?: number;
    error?: string;
  }> {
    try {
      // Get all approved teams for the club
      const teams = await this.teamRepository.findByClubIdAndStatus(clubId, "approved");
      const activeTeams = teams.filter(t => t.isActive && !t.isDeleted);

      // If within limit, nothing to do
      if (activeTeams.length <= newMaxTeams) {
        return {
          success: true,
          activeCount: activeTeams.length,
          suspendedCount: 0,
        };
      }

      // Determine which teams to keep active
      let teamsToKeep: string[];
      if (selectedTeamIds && selectedTeamIds.length === newMaxTeams) {
        teamsToKeep = selectedTeamIds;
      } else {
        // Default: keep the most recently created teams
        const sortedTeams = [...activeTeams].sort((a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime()
        );
        teamsToKeep = sortedTeams.slice(0, newMaxTeams).map(t => t.id);
      }

      // Suspend teams that are not in the keep list
      const teamsToSuspend = activeTeams.filter(t => !teamsToKeep.includes(t.id));

      let suspendedCount = 0;
      for (const team of teamsToSuspend) {
        const result = await this.teamRepository.update(team.id, { isActive: false });
        if (result) {
          suspendedCount++;
        }
      }

      return {
        success: true,
        activeCount: newMaxTeams,
        suspendedCount,
      };
    } catch (error) {
      console.error("Error enforcing team limits:", error);
      return {
        success: false,
        error: "Erreur lors de l'application des limites d'équipes",
      };
    }
  }

  /**
   * Get active teams count for a club
   * Used to check if team selection is needed before downgrade
   *
   * @param clubId - ID of the club
   * @returns Number of active approved teams
   */
  async getActiveTeamsCount(clubId: string): Promise<number> {
    const teams = await this.teamRepository.findByClubIdAndStatus(clubId, "approved");
    return teams.filter(t => t.isActive && !t.isDeleted).length;
  }
}
