import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseClubRepository } from "../repositories/SupabaseClubRepository";
import { ClubService } from "./ClubService";

/**
 * Factory Pattern + Singleton Pattern
 * Centralized service creation and dependency injection
 */
export class ServiceFactory {
  private static clubServiceInstance: ClubService | null = null;

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
   * Reset singleton instances (useful for testing)
   */
  static reset(): void {
    this.clubServiceInstance = null;
  }
}
