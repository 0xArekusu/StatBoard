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

export interface IMatchRepository {
  create(data: CreateMatchData): Promise<Match>;
  findById(id: number): Promise<Match | null>;
  findActiveMatch(): Promise<Match | null>;
  getAllMatches(): Promise<Match[]>;
  updateStatus(id: number, status: MatchStatus, endedAt?: Date): Promise<void>;
  startMatch(id: number): Promise<void>;
  abandonMatch(id: number): Promise<void>;
  completeMatch(id: number): Promise<void>;
  updateMatchState(id: number, currentPeriod: number, timeElapsed: number): Promise<void>;
  updateFinalScores(id: number, scoreA: number, scoreB: number, manuallyAdjusted?: boolean): Promise<void>;
  updateSyncStatus(id: number, synced: boolean): Promise<void>;
  findUnsyncedCompletedMatches(): Promise<Match[]>;
  delete(id: number): Promise<void>;
}

export class MatchRepository implements IMatchRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create a new match in SQLite database
   * Sets initial status to 'in_progress'
   */
  async create(data: CreateMatchData): Promise<Match> {
    const sql = `
      INSERT INTO matches (team_a_name, team_b_name, team_mode, status, match_format, period_duration, club_id, team_id)
      VALUES (?, ?, ?, 'in_progress', ?, ?, ?, ?)
    `;

    try {
      logInfo('MatchRepository', '🏀 Creating new match in SQLite', {
        teamA: data.team_a_name,
        teamB: data.team_b_name,
        teamMode: data.team_mode,
        matchFormat: data.match_format,
        periodDuration: data.period_duration,
        clubId: data.club_id,
        teamId: data.team_id
      });

      await this.db.execute(sql, [
        data.team_a_name,
        data.team_b_name,
        data.team_mode,
        data.match_format,
        data.period_duration,
        data.club_id || null,
        data.team_id || null
      ]);

      // Get the created match
      const matches = await this.db.query(
        'SELECT * FROM matches ORDER BY id DESC LIMIT 1'
      );

      if (matches.length === 0) {
        logError('MatchRepository', '❌ Failed to retrieve created match');
        throw new Error('Failed to create match');
      }

      logInfo('MatchRepository', '✅ Match created successfully in SQLite', {
        matchId: matches[0].id,
        teamA: data.team_a_name,
        teamB: data.team_b_name
      });

      return matches[0] as Match;
    } catch (error) {
      logError('MatchRepository', '❌ Error creating match in SQLite', {
        error: error instanceof Error ? error.message : error,
        teamA: data.team_a_name,
        teamB: data.team_b_name
      });
      throw error;
    }
  }

  /**
   * Find a match by its ID
   * Returns null if not found
   */
  async findById(id: number): Promise<Match | null> {
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
          teamA: match.team_a_name,
          teamB: match.team_b_name,
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
          teamA: match.team_a_name,
          teamB: match.team_b_name,
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
   * Update match status
   * Optionally sets ended_at timestamp for completed matches
   */
  async updateStatus(id: number, status: MatchStatus, endedAt?: Date): Promise<void> {
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
  async startMatch(id: number): Promise<void> {
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
  async abandonMatch(id: number): Promise<void> {
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
  async completeMatch(id: number): Promise<void> {
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
  async updateMatchState(id: number, currentPeriod: number, timeElapsed: number): Promise<void> {
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
  async updateFinalScores(id: number, scoreA: number, scoreB: number, manuallyAdjusted: boolean = false): Promise<void> {
    try {
      logInfo('MatchRepository', '📊 Updating final scores', {
        matchId: id,
        scoreA,
        scoreB,
        manuallyAdjusted
      });

      await this.db.execute(
        'UPDATE matches SET final_score_a = ?, final_score_b = ?, score_manually_adjusted = ? WHERE id = ?',
        [scoreA, scoreB, manuallyAdjusted ? 1 : 0, id]
      );

      logInfo('MatchRepository', '✅ Final scores updated', {
        matchId: id,
        scoreA,
        scoreB,
        manuallyAdjusted
      });
    } catch (error) {
      logError('MatchRepository', '❌ Error updating final scores', {
        matchId: id,
        scoreA,
        scoreB,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Update Supabase sync status
   * Tracks whether match has been uploaded to server
   */
  async updateSyncStatus(id: number, synced: boolean): Promise<void> {
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
  async delete(id: number): Promise<void> {
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
