import { Match } from "../src/models/types";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Service Layer Pattern
 * Business logic for loading match lists from both Supabase and local SQLite
 *
 * This service abstracts the complexity of merging matches from different sources
 * (local SQLite for non-synced matches + Supabase for synced matches)
 */
export class MatchListService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly matchRepository: MatchRepository
  ) {}

  /**
   * Load all matches for a user
   * Combines local non-synced matches with server matches
   *
   * @param userId - User ID to load matches for (null for guest mode)
   * @param clubId - Club ID to filter local matches (optional, for authenticated users)
   * @param teamId - Team ID to filter local matches (optional, for authenticated users)
   * @returns Combined list of matches from both sources
   */
  async loadAllMatches(
    userId: string | null,
    clubId: string | null = null,
    teamId: string | null = null
  ): Promise<Match[]> {
    // 1. Load LOCAL matches from SQLite (non-synced ones)
    const allLocalMatches = await this.matchRepository.getAllMatches();
    let localMatches = allLocalMatches.filter((m) => !m.synced_to_server);

    // 2. Filter local matches by club_id and team_id if user is authenticated
    // This ensures that when a user logs in, they only see their team's local matches
    // Guest matches (created without club_id/team_id) will be filtered out
    if (userId && (clubId || teamId)) {
      localMatches = localMatches.filter((m) => {
        // Match must belong to the user's club and team
        const matchesClub = clubId ? m.club_id === clubId : true;
        const matchesTeam = teamId ? m.team_id === teamId : true;
        return matchesClub && matchesTeam;
      });
    }

    // 3. Load SERVER matches from Supabase if user is authenticated
    let serverMatches: Match[] = [];
    if (userId) {
      try {
        const { data: serverMatchesData, error } = await this.supabase
          .from("matches")
          .select("*")
          .eq("created_by", userId)
          .order("played_at", { ascending: false });

        if (error) {
          console.error("Error loading server matches:", error);
        } else if (serverMatchesData) {
          // Transform server matches to Match format
          serverMatches = serverMatchesData.map((sm, index) => ({
            id: -(index + 1), // Use negative IDs for server matches
            supabase_id: sm.id, // Keep Supabase UUID for navigation
            my_team_name: sm.my_team_name,
            opponent_name: sm.opponent_name,
            is_home: sm.is_home ? 1 : 0,
            status: sm.status || ("completed" as const),
            total_periods: sm.total_periods,
            period_duration: sm.period_duration,
            overtime_duration: sm.overtime_duration || 300,
            overtime_periods: sm.overtime_periods || 0,
            club_id: sm.club_id,
            team_id: sm.team_id,
            current_period: 0,
            time_elapsed: 0,
            my_team_score: sm.my_team_score,
            opponent_score: sm.opponent_score,
            synced_to_server: 1,
            created_at: sm.created_at,
            started_at: sm.started_at,
            ended_at: sm.ended_at,
            played_at: sm.played_at,
            last_updated: sm.created_at,
          } as any));
        }
      } catch (error) {
        console.error("Error loading server matches:", error);
      }
    }

    // 4. Merge and return
    return [...localMatches, ...serverMatches];
  }

  /**
   * Load matches and sort by date (most recent first)
   *
   * @param userId - User ID to load matches for (null for guest mode)
   * @param clubId - Club ID to filter local matches (optional, for authenticated users)
   * @param teamId - Team ID to filter local matches (optional, for authenticated users)
   * @returns Sorted list of matches
   */
  async loadAllMatchesSorted(
    userId: string | null,
    clubId: string | null = null,
    teamId: string | null = null
  ): Promise<Match[]> {
    const matches = await this.loadAllMatches(userId, clubId, teamId);

    // Sort by date (most recent first)
    return matches.sort(
      (a, b) =>
        new Date(b.ended_at || b.created_at).getTime() -
        new Date(a.ended_at || a.created_at).getTime()
    );
  }

  /**
   * Find the active match (if any)
   *
   * @returns Active match or null
   */
  async findActiveMatch(): Promise<Match | null> {
    return await this.matchRepository.findActiveMatch();
  }

  /**
   * Delete a match by ID
   *
   * @param matchId - ID of the match to delete
   */
  async deleteMatch(matchId: number): Promise<void> {
    return await this.matchRepository.delete(matchId);
  }
}
