/**
 * MatchRepository
 *
 * Repository for managing basketball matches in SQLite database.
 * Handles CRUD operations for match lifecycle and state management.
 *
 * Features:
 * - Match creation with team names, format, and configuration
 * - Match state tracking (in_progress, completed, abandoned)
 * - Real-time state updates (period, time elapsed)
 * - Final score management with manual adjustment support
 * - Active match detection (resume functionality)
 * - Sync status tracking for Supabase synchronization
 * - Match history retrieval
 *
 * Architecture:
 * - Uses SQLite via DatabaseService
 * - Stores matches in matches table
 * - Tracks sync status for offline-first architecture
 */
import { DatabaseService } from './DatabaseService';
import { Match, CreateMatchData, MatchStatus } from '../../models/types';
import { logInfo, logError, logWarn } from '../../../utils/logger';
import { generateUUID } from '../../utils/uuid';

export interface IMatchRepository {
  create(data: CreateMatchData): Promise<Match>;
  findById(id: string): Promise<Match | null>;
  findActiveMatch(): Promise<Match | null>;
  getAllMatches(): Promise<Match[]>;
  getMatchesByTeamId(teamId: string): Promise<Match[]>;
  updateStatus(id: string, status: MatchStatus, endedAt?: Date): Promise<void>;
  startMatch(id: string): Promise<void>;
  abandonMatch(id: string): Promise<void>;
  completeMatch(id: string): Promise<void>;
  updateMatchState(id: string, currentPeriod: number, timeElapsed: number): Promise<void>;
  updateFinalScores(id: string, myTeamScore: number, opponentScore: number, manuallyAdjusted?: boolean): Promise<void>;
  updateOvertimePeriods(id: string, overtimePeriods: number): Promise<void>;
  updateSyncStatus(id: string, synced: boolean): Promise<void>;
  findUnsyncedCompletedMatches(): Promise<Match[]>;
  delete(id: string): Promise<void>;
}

export class MatchRepository implements IMatchRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create a new match in SQLite database
   * Generates UUID and sets initial status to 'in_progress'
   */
  async create(data: CreateMatchData): Promise<Match> {
    const matchId = generateUUID();
    const sql = `
      INSERT INTO matches (
        id,
        my_team_name,
        opponent_name,
        is_home,
        total_periods,
        period_duration,
        overtime_duration,
        overtime_periods,
        my_team_score,
        opponent_score,
        status,
        club_id,
        team_id,
        club_logo_url,
        court_background_color,
        court_line_color,
        track_opponent_stats
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'in_progress', ?, ?, ?, ?, ?, ?)
    `;

    try {
      logInfo('MatchRepository', '🏀 Creating new match in SQLite', {
        matchId,
        myTeam: data.my_team_name,
        opponent: data.opponent_name,
        isHome: data.is_home,
        totalPeriods: data.total_periods,
        periodDuration: data.period_duration,
        overtimeDuration: data.overtime_duration,
        clubId: data.club_id,
        teamId: data.team_id,
        clubLogoUrl: data.club_logo_url,
        courtBackgroundColor: data.court_background_color,
        courtLineColor: data.court_line_color
      });

      await this.db.execute(sql, [
        matchId,
        data.my_team_name || null,
        data.opponent_name,
        data.is_home ? 1 : 0,
        data.total_periods,
        data.period_duration,
        data.overtime_duration || 300,
        data.club_id || null,
        data.team_id || null,
        data.club_logo_url || null,
        data.court_background_color || null,
        data.court_line_color || null,
        data.track_opponent_stats ? 1 : 0
      ]);

      // Get the created match
      const matches = await this.db.query(
        'SELECT * FROM matches WHERE id = ?',
        [matchId]
      );

      if (matches.length === 0) {
        logError('MatchRepository', '❌ Failed to retrieve created match', { matchId });
        throw new Error('Failed to create match');
      }

      logInfo('MatchRepository', '✅ Match created successfully in SQLite', {
        matchId: matches[0].id,
        opponent: data.opponent_name,
        isHome: data.is_home
      });

      return matches[0] as Match;
    } catch (error) {
      logError('MatchRepository', '❌ Error creating match in SQLite', {
        error: error instanceof Error ? error.message : error,
        opponent: data.opponent_name
      });
      throw error;
    }
  }

  /**
   * Find a match by its ID
   * Returns null if not found
   */
  async findById(id: string): Promise<Match | null> {
    try {
      logInfo('MatchRepository', '🔍 Finding match by ID', { matchId: id });

      const matches = await this.db.query(
        'SELECT * FROM matches WHERE id = ?',
        [id]
      );

      const match = matches.length > 0 ? matches[0] as Match : null;

      if (match) {
        logInfo('MatchRepository', '✅ Match found', {
          matchId: id,
          myTeam: match.my_team_name,
          opponent: match.opponent_name,
          status: match.status
        });
      } else {
        logWarn('MatchRepository', '⚠️ Match not found', { matchId: id });
      }

      return match;
    } catch (error) {
      logError('MatchRepository', '❌ Error finding match by ID', {
        matchId: id,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Find the most recent active (in_progress) match
   * Used for match resume functionality
   */
  async findActiveMatch(): Promise<Match | null> {
    try {
      logInfo('MatchRepository', '🔍 Searching for active match');

      const matches = await this.db.query(
        "SELECT * FROM matches WHERE status = 'in_progress' ORDER BY created_at DESC LIMIT 1"
      );

      const match = matches.length > 0 ? matches[0] as Match : null;

      if (match) {
        logInfo('MatchRepository', '✅ Active match found', {
          matchId: match.id,
          myTeam: match.my_team_name,
          opponent: match.opponent_name,
          currentPeriod: match.current_period,
          timeElapsed: match.time_elapsed
        });
      } else {
        logInfo('MatchRepository', 'ℹ️ No active match found');
      }

      return match;
    } catch (error) {
      logError('MatchRepository', '❌ Error finding active match', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get all matches ordered by creation date (newest first)
   * Used for match history display
   * @deprecated Use getMatchesByClubId instead to filter by club ownership
   */
  async getAllMatches(): Promise<Match[]> {
    try {
      logInfo('MatchRepository', '📚 Fetching all matches');

      const matches = await this.db.query(
        'SELECT * FROM matches ORDER BY created_at DESC'
      );

      logInfo('MatchRepository', '✅ Matches retrieved', {
        matchCount: matches.length
      });

      return matches as Match[];
    } catch (error) {
      logError('MatchRepository', '❌ Error getting all matches', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get matches for a specific team (filtered by team ownership)
   * Used for match history display - only shows matches for teams the user owns
   */
  async getMatchesByTeamId(teamId: string): Promise<Match[]> {
    try {
      logInfo('MatchRepository', '📚 Fetching matches for team', { teamId });

      const matches = await this.db.query(
        'SELECT * FROM matches WHERE team_id = ? ORDER BY created_at DESC',
        [teamId]
      );

      logInfo('MatchRepository', '✅ Team matches retrieved', {
        teamId,
        matchCount: matches.length
      });

      return matches as Match[];
    } catch (error) {
      logError('MatchRepository', '❌ Error getting matches for team', {
        teamId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update match status
   * Optionally sets ended_at timestamp for completed matches
   */
  async updateStatus(id: string, status: MatchStatus, endedAt?: Date): Promise<void> {
    try {
      logInfo('MatchRepository', '🔄 Updating match status', {
        matchId: id,
        status,
        endedAt: endedAt?.toISOString()
      });

      let sql = 'UPDATE matches SET status = ?';
      const params: any[] = [status];

      if (endedAt && status === 'completed') {
        sql += ', ended_at = ?';
        params.push(endedAt.toISOString());
      }

      sql += ' WHERE id = ?';
      params.push(id);

      await this.db.execute(sql, params);

      logInfo('MatchRepository', '✅ Match status updated', {
        matchId: id,
        newStatus: status
      });
    } catch (error) {
      logError('MatchRepository', '❌ Error updating match status', {
        matchId: id,
        status,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Mark match as started
   * Sets started_at timestamp
   */
  async startMatch(id: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      logInfo('MatchRepository', '▶️ Starting match', {
        matchId: id,
        startedAt: timestamp
      });

      await this.db.execute(
        'UPDATE matches SET started_at = ? WHERE id = ?',
        [timestamp, id]
      );

      logInfo('MatchRepository', '✅ Match started', { matchId: id });
    } catch (error) {
      logError('MatchRepository', '❌ Error starting match', {
        matchId: id,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Mark match as abandoned
   * Sets status to 'abandoned' and records ended_at timestamp
   */
  async abandonMatch(id: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      logInfo('MatchRepository', '🚫 Abandoning match', {
        matchId: id,
        endedAt: timestamp
      });

      await this.db.execute(
        'UPDATE matches SET status = ?, ended_at = ? WHERE id = ?',
        ['abandoned', timestamp, id]
      );

      logInfo('MatchRepository', '✅ Match abandoned', { matchId: id });
    } catch (error) {
      logError('MatchRepository', '❌ Error abandoning match', {
        matchId: id,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Mark match as completed
   * Sets status to 'completed' and records ended_at timestamp
   */
  async completeMatch(id: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      logInfo('MatchRepository', '🏁 Completing match', {
        matchId: id,
        endedAt: timestamp
      });

      await this.db.execute(
        'UPDATE matches SET status = ?, ended_at = ? WHERE id = ?',
        ['completed', timestamp, id]
      );

      logInfo('MatchRepository', '✅ Match completed', { matchId: id });
    } catch (error) {
      logError('MatchRepository', '❌ Error completing match', {
        matchId: id,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update match real-time state
   * Updates current period, time elapsed, and last_updated timestamp
   * Called periodically during active match
   */
  async updateMatchState(id: string, currentPeriod: number, timeElapsed: number): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      await this.db.execute(
        'UPDATE matches SET current_period = ?, time_elapsed = ?, last_updated = ? WHERE id = ?',
        [currentPeriod, timeElapsed, timestamp, id]
      );

      // Don't log every state update to avoid log spam
      // State updates happen frequently (every timer tick)
    } catch (error) {
      logError('MatchRepository', '❌ Error updating match state', {
        matchId: id,
        currentPeriod,
        timeElapsed,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update final scores for match
   * Called at match completion, optionally marks as manually adjusted
   */
  async updateFinalScores(id: string, myTeamScore: number, opponentScore: number, manuallyAdjusted: boolean = false): Promise<void> {
    try {
      logInfo('MatchRepository', '📊 Updating final scores', {
        matchId: id,
        myTeamScore,
        opponentScore,
        manuallyAdjusted
      });

      await this.db.execute(
        'UPDATE matches SET my_team_score = ?, opponent_score = ?, score_manually_adjusted = ? WHERE id = ?',
        [myTeamScore, opponentScore, manuallyAdjusted ? 1 : 0, id]
      );

      logInfo('MatchRepository', '✅ Final scores updated', {
        matchId: id,
        myTeamScore,
        opponentScore,
        manuallyAdjusted
      });
    } catch (error) {
      logError('MatchRepository', '❌ Error updating final scores', {
        matchId: id,
        myTeamScore,
        opponentScore,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update overtime periods count
   * Called at match completion to record how many OT were played
   */
  async updateOvertimePeriods(id: string, overtimePeriods: number): Promise<void> {
    try {
      logInfo('MatchRepository', '⏱️ Updating overtime periods', {
        matchId: id,
        overtimePeriods
      });

      await this.db.execute(
        'UPDATE matches SET overtime_periods = ? WHERE id = ?',
        [overtimePeriods, id]
      );

      logInfo('MatchRepository', '✅ Overtime periods updated', {
        matchId: id,
        overtimePeriods
      });
    } catch (error) {
      logError('MatchRepository', '❌ Error updating overtime periods', {
        matchId: id,
        overtimePeriods,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update Supabase sync status
   * Tracks whether match has been uploaded to server
   */
  async updateSyncStatus(id: string, synced: boolean): Promise<void> {
    try {
      logInfo('MatchRepository', '🔄 Updating sync status', {
        matchId: id,
        synced
      });

      await this.db.execute(
        'UPDATE matches SET synced_to_server = ? WHERE id = ?',
        [synced ? 1 : 0, id]
      );

      logInfo('MatchRepository', '✅ Sync status updated', {
        matchId: id,
        synced
      });
    } catch (error) {
      logError('MatchRepository', '❌ Error updating sync status', {
        matchId: id,
        synced,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Find completed matches that haven't been synced to Supabase
   * Used for offline-first sync operations
   */
  async findUnsyncedCompletedMatches(): Promise<Match[]> {
    try {
      logInfo('MatchRepository', '🔍 Finding unsynced completed matches');

      const matches = await this.db.query(
        `SELECT * FROM matches
         WHERE status = 'completed'
         AND (synced_to_server = 0 OR synced_to_server IS NULL)
         ORDER BY ended_at DESC`
      );

      logInfo('MatchRepository', '✅ Unsynced matches found', {
        matchCount: matches.length
      });

      return matches as Match[];
    } catch (error) {
      logError('MatchRepository', '❌ Error finding unsynced completed matches', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Delete a match by ID
   * Permanently removes match from database
   */
  async delete(id: string): Promise<void> {
    try {
      logInfo('MatchRepository', '🗑️ Deleting match from SQLite', { matchId: id });

      await this.db.execute(
        'DELETE FROM matches WHERE id = ?',
        [id]
      );

      logInfo('MatchRepository', '✅ Match deleted successfully', { matchId: id });
    } catch (error) {
      logError('MatchRepository', '❌ Error deleting match', {
        matchId: id,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}
