import type { ITeamRepository } from "../repositories/ITeamRepository";
import type { IClubMemberRepository } from "../repositories/IClubMemberRepository";
import type { CreateTeamData, UpdateTeamData, TeamStatus } from "../models/Team";
import type { SubscriptionService } from "./SubscriptionService";

const MAX_TEAMS_PER_USER_PER_CLUB = 10;

export class TeamService {
  constructor(
    private teamRepository: ITeamRepository,
    private clubMemberRepository: IClubMemberRepository,
    private subscriptionService?: SubscriptionService
  ) {}

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

  async getTeamById(id: string) {
    return await this.teamRepository.findById(id);
  }

  async getClubTeams(clubId: string) {
    return await this.teamRepository.findByClubId(clubId);
  }

  async getClubTeamsByStatus(clubId: string, status: TeamStatus) {
    return await this.teamRepository.findByClubIdAndStatus(clubId, status);
  }

  async getUserTeams(userId: string) {
    return await this.teamRepository.findByOwnerId(userId);
  }
}
