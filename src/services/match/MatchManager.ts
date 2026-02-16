/**
 * MatchManager
 *
 * High-level service for managing basketball match lifecycle.
 * Orchestrates operations between MatchRepository and ActionRepository.
 *
 * Features:
 * - Match creation and initialization
 * - Match resumption for interrupted games
 * - Match completion with action compaction
 * - Match state updates (period, time)
 * - Match pause and abandonment
 *
 * Architecture:
 * - Delegates to MatchRepository for match CRUD operations
 * - Delegates to ActionRepository for action compaction
 * - Note: Logging happens at repository level to avoid redundancy
 */
import { MatchRepository, IMatchRepository } from '../database/MatchRepository';
import { ActionRepository } from '../database/ActionRepository';
import { Match, CreateMatchData, MatchStatus } from '../../models/types';
import { logInfo, logError, logWarn } from '../../../utils/logger';

export class MatchManager {
  private matchRepository: IMatchRepository;
  private actionRepository: ActionRepository;

  constructor() {
    this.matchRepository = new MatchRepository();
    this.actionRepository = new ActionRepository();
  }

  /**
   * Create a new match
   * Creates match in database with created_at timestamp (when user configured and clicked "Start")
   * Note: started_at should be set later when first action is recorded or timer starts
   * Note: Repository logs creation, we log high-level orchestration
   */
  async createMatch(data: CreateMatchData & { created_at?: string }): Promise<Match> {
    try {
      logInfo('MatchManager', '🏀 Creating new match', {
        myTeam: data.my_team_name,
        opponent: data.opponent_name,
        isHome: data.is_home,
        createdAt: data.created_at
      });

      // Create the match in database (logged by repository)
      const match = await this.matchRepository.create(data);

      logInfo('MatchManager', '✅ Match created successfully', {
        matchId: match.id,
        myTeam: match.my_team_name,
        opponent: match.opponent_name,
        createdAt: match.created_at
      });

      return match;
    } catch (error) {
      logError('MatchManager', '❌ Error creating match', {
        error: error instanceof Error ? error.message : error,
        myTeam: data.my_team_name,
        opponent: data.opponent_name
      });
      throw error;
    }
  }

  /**
   * Start a match by setting started_at timestamp
   * Should be called when first action is recorded or timer starts
   */
  async startMatch(matchId: string): Promise<void> {
    try {
      logInfo('MatchManager', '▶️ Starting match timer', { matchId });

      await this.matchRepository.startMatch(matchId);

      logInfo('MatchManager', '✅ Match timer started', { matchId });
    } catch (error) {
      logError('MatchManager', '❌ Error starting match timer', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Resume an existing match
   * Validates match exists and is resumable (status: in_progress)
   */
  async resumeMatch(matchId: string): Promise<Match> {
    try {
      // Repository logs the find operation
      const match = await this.matchRepository.findById(matchId);

      if (!match) {
        logWarn('MatchManager', '⚠️ Cannot resume - match not found', { matchId });
        throw new Error(`Match with id ${matchId} not found`);
      }

      if (match.status !== 'in_progress') {
        logWarn('MatchManager', '⚠️ Cannot resume - invalid status', {
          matchId,
          status: match.status,
          expectedStatus: 'in_progress'
        });
        throw new Error(`Cannot resume match with status: ${match.status}`);
      }

      logInfo('MatchManager', '🔄 Match resume validated', {
        matchId: match.id,
        teamA: match.team_a_name,
        teamB: match.team_b_name,
        currentPeriod: match.current_period,
        timeElapsed: match.time_elapsed
      });

      return match;
    } catch (error) {
      logError('MatchManager', '❌ Error resuming match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * End the current match
   * Marks as completed and triggers action compaction
   * Note: Compaction moves actions from match_actions to match_players.actions JSON
   */
  async endMatch(matchId: string): Promise<void> {
    try {
      logInfo('MatchManager', '🏁 Ending match - starting orchestration', { matchId });

      // Mark match as completed (logged by repository)
      await this.matchRepository.completeMatch(matchId);

      // Compact actions into match_players.actions (logged by repository)
      await this.actionRepository.compactMatchActions(matchId);

      logInfo('MatchManager', '✅ Match end orchestration completed', { matchId });
    } catch (error) {
      logError('MatchManager', '❌ Error in match end orchestration', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Check if there's an active match
   * Delegates to repository (already logged there)
   */
  async getActiveMatch(): Promise<Match | null> {
    try {
      // Repository logs this operation
      return await this.matchRepository.findActiveMatch();
    } catch (error) {
      logError('MatchManager', '❌ Error getting active match', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Pause the current match
   * Updates status to 'paused'
   */
  async pauseMatch(matchId: string): Promise<void> {
    try {
      // Repository logs the status update
      await this.matchRepository.updateStatus(matchId, 'paused');

      logInfo('MatchManager', '⏸️ Match paused', { matchId });
    } catch (error) {
      logError('MatchManager', '❌ Error pausing match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Abandon the current match (mark as abandoned)
   * Used when user discards an incomplete match
   */
  async abandonMatch(matchId: string): Promise<void> {
    try {
      // Repository logs the abandon operation
      await this.matchRepository.abandonMatch(matchId);

      logInfo('MatchManager', '🚫 Match abandoned via manager', { matchId });
    } catch (error) {
      logError('MatchManager', '❌ Error abandoning match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Complete the current match normally (mark as completed)
   * Note: Use endMatch() instead for full orchestration with compaction
   */
  async completeMatch(matchId: string): Promise<void> {
    try {
      // Repository logs the complete operation
      await this.matchRepository.completeMatch(matchId);

      logInfo('MatchManager', '✅ Match marked as completed', { matchId });
    } catch (error) {
      logError('MatchManager', '❌ Error completing match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update the current match state (period, time)
   * Called frequently during active match
   * Note: Not logged to avoid spam (called every timer tick)
   */
  async updateMatchState(matchId: string, currentPeriod: number, timeElapsed: number): Promise<void> {
    try {
      // Repository doesn't log this either to avoid spam
      await this.matchRepository.updateMatchState(matchId, currentPeriod, timeElapsed);
    } catch (error) {
      // Only log errors for state updates
      logError('MatchManager', '❌ Error updating match state', {
        matchId,
        currentPeriod,
        timeElapsed,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}