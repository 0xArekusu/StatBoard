import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseClubRepository } from "../repositories/SupabaseClubRepository";
import { SupabaseClubMemberRepository } from "../repositories/SupabaseClubMemberRepository";
import { SupabaseTeamRepository } from "../repositories/SupabaseTeamRepository";
import { SupabasePlayerRepository } from "../repositories/SupabasePlayerRepository";
import { ClubService } from "./ClubService";
import { ClubMemberService } from "./ClubMemberService";
import { TeamService } from "./TeamService";
import { PlayerService } from "./PlayerService";
import { SubscriptionService } from "./SubscriptionService";
import { MatchDataService } from "./MatchDataService";
import { MatchListService } from "./MatchListService";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { MatchSyncService } from "../src/services/api/MatchSyncService";

/**
 * Factory Pattern + Singleton Pattern
 * Centralized service creation and dependency injection
 */
export class ServiceFactory {
  private static clubServiceInstance: ClubService | null = null;
  private static clubMemberServiceInstance: ClubMemberService | null = null;
  private static teamServiceInstance: TeamService | null = null;
  private static playerServiceInstance: PlayerService | null = null;
  private static subscriptionServiceInstance: SubscriptionService | null = null;
  private static matchDataServiceInstance: MatchDataService | null = null;
  private static matchListServiceInstance: MatchListService | null = null;
  private static matchSyncServiceInstance: MatchSyncService | null = null;

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
      this.clubMemberServiceInstance = new ClubMemberService(
        clubMemberRepository,
      );
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
      const subscriptionService = this.getSubscriptionService(supabase);
      this.teamServiceInstance = new TeamService(
        teamRepository,
        clubMemberRepository,
        subscriptionService,
      );
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
   * Get SubscriptionService singleton instance
   * @param supabase Supabase client instance
   */
  static getSubscriptionService(supabase: SupabaseClient): SubscriptionService {
    if (!this.subscriptionServiceInstance) {
      this.subscriptionServiceInstance = new SubscriptionService(supabase);
    }
    return this.subscriptionServiceInstance;
  }

  /**
   * Get MatchDataService singleton instance
   * @param supabase Supabase client instance
   */
  static getMatchDataService(supabase: SupabaseClient): MatchDataService {
    if (!this.matchDataServiceInstance) {
      const actionRepository = new ActionRepository();
      this.matchDataServiceInstance = new MatchDataService(
        supabase,
        actionRepository,
      );
    }
    return this.matchDataServiceInstance;
  }

  /**
   * Get MatchListService singleton instance
   * @param supabase Supabase client instance
   */
  static getMatchListService(supabase: SupabaseClient): MatchListService {
    if (!this.matchListServiceInstance) {
      const matchRepository = new MatchRepository();
      this.matchListServiceInstance = new MatchListService(
        supabase,
        matchRepository,
      );
    }
    return this.matchListServiceInstance;
  }

  /**
   * Get MatchSyncService singleton instance
   * @param supabase Supabase client instance
   */
  static getMatchSyncService(supabase: SupabaseClient): MatchSyncService {
    if (!this.matchSyncServiceInstance) {
      this.matchSyncServiceInstance = new MatchSyncService(supabase);
    }
    return this.matchSyncServiceInstance;
  }

  /**
   * Reset singleton instances (useful for testing)
   */
  static reset(): void {
    this.clubServiceInstance = null;
    this.clubMemberServiceInstance = null;
    this.teamServiceInstance = null;
    this.playerServiceInstance = null;
    this.subscriptionServiceInstance = null;
    this.matchDataServiceInstance = null;
    this.matchListServiceInstance = null;
    this.matchSyncServiceInstance = null;
  }
}
