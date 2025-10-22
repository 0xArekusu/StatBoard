import type { IClubMemberRepository } from "../repositories/IClubMemberRepository";
import type { CreateClubMemberData } from "../models/ClubMember";

export class ClubMemberService {
  constructor(private clubMemberRepository: IClubMemberRepository) {}

  async joinClub(clubId: string, userId: string, email: string) {
    // Check if user is already a member
    const existingMembership = await this.clubMemberRepository.findByClubAndUser(clubId, userId);
    if (existingMembership) {
      return { success: false, error: "Vous êtes déjà membre de ce club" };
    }

    const member = await this.clubMemberRepository.create({ clubId, userId, email });
    if (!member) {
      return { success: false, error: "Erreur lors de l'inscription au club" };
    }

    return { success: true, member };
  }

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

  async getClubMembers(clubId: string) {
    return await this.clubMemberRepository.findByClubId(clubId);
  }

  async getUserClubMemberships(userId: string) {
    return await this.clubMemberRepository.findByUserId(userId);
  }

  async isMember(clubId: string, userId: string): Promise<boolean> {
    const membership = await this.clubMemberRepository.findByClubAndUser(clubId, userId);
    return !!membership;
  }
}
