import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseClubRepository } from "../repositories/SupabaseClubRepository";
import { SupabaseClubMemberRepository } from "../repositories/SupabaseClubMemberRepository";
import { SupabaseTeamRepository } from "../repositories/SupabaseTeamRepository";
import { SupabasePlayerRepository } from "../repositories/SupabasePlayerRepository";
import { ClubService } from "./ClubService";
import { ClubMemberService } from "./ClubMemberService";
import { TeamService } from "./TeamService";
import { PlayerService } from "./PlayerService";

/**
 * Factory Pattern + Singleton Pattern
 * Centralized service creation and dependency injection
 */
export class ServiceFactory {
  private static clubServiceInstance: ClubService | null = null;
  private static clubMemberServiceInstance: ClubMemberService | null = null;
  private static teamServiceInstance: TeamService | null = null;
  private static playerServiceInstance: PlayerService | null = null;

  /**
   * Get ClubService singleton instance
   * @param supabase Supabase client instance
   */
  static getClubService(supabase: SupabaseClient): ClubService {
    if (!this.clubServiceInstance) {
      const clubRepository = new SupabaseClubRepository(supabase);
      this.clubServiceInstance = new ClubService(clubRepository);
    }
    return this.clubServiceInstance;
  }

  /**
   * Get ClubMemberService singleton instance
   * @param supabase Supabase client instance
   */
  static getClubMemberService(supabase: SupabaseClient): ClubMemberService {
    if (!this.clubMemberServiceInstance) {
      const clubMemberRepository = new SupabaseClubMemberRepository(supabase);
      this.clubMemberServiceInstance = new ClubMemberService(clubMemberRepository);
    }
    return this.clubMemberServiceInstance;
  }

  /**
   * Get TeamService singleton instance
   * @param supabase Supabase client instance
   */
  static getTeamService(supabase: SupabaseClient): TeamService {
    if (!this.teamServiceInstance) {
      const teamRepository = new SupabaseTeamRepository(supabase);
      const clubMemberRepository = new SupabaseClubMemberRepository(supabase);
      this.teamServiceInstance = new TeamService(teamRepository, clubMemberRepository);
    }
    return this.teamServiceInstance;
  }

  /**
   * Get PlayerService singleton instance
   * @param supabase Supabase client instance
   */
  static getPlayerService(supabase: SupabaseClient): PlayerService {
    if (!this.playerServiceInstance) {
      const playerRepository = new SupabasePlayerRepository(supabase);
      this.playerServiceInstance = new PlayerService(playerRepository);
    }
    return this.playerServiceInstance;
  }

  /**
   * Reset singleton instances (useful for testing)
   */
  static reset(): void {
    this.clubServiceInstance = null;
    this.clubMemberServiceInstance = null;
    this.teamServiceInstance = null;
    this.playerServiceInstance = null;
  }
}
