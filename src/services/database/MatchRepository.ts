import { DatabaseService } from './DatabaseService';
import { Match, CreateMatchData, MatchStatus } from '../../models/types';

export interface IMatchRepository {
  create(data: CreateMatchData): Promise<Match>;
  findById(id: number): Promise<Match | null>;
  findActiveMatch(): Promise<Match | null>;
  updateStatus(id: number, status: MatchStatus, endedAt?: Date): Promise<void>;
  startMatch(id: number): Promise<void>;
  abandonMatch(id: number): Promise<void>;
  completeMatch(id: number): Promise<void>;
}

export class MatchRepository implements IMatchRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async create(data: CreateMatchData): Promise<Match> {
    const sql = `
      INSERT INTO matches (team_a_name, team_b_name, team_mode, status)
      VALUES (?, ?, ?, 'in_progress')
    `;
    
    try {
      await this.db.execute(sql, [
        data.team_a_name,
        data.team_b_name,
        data.team_mode
      ]);

      // Get the created match
      const matches = await this.db.query(
        'SELECT * FROM matches ORDER BY id DESC LIMIT 1'
      );
      
      if (matches.length === 0) {
        throw new Error('Failed to create match');
      }

      return matches[0] as Match;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<Match | null> {
    try {
      const matches = await this.db.query(
        'SELECT * FROM matches WHERE id = ?',
        [id]
      );
      
      return matches.length > 0 ? matches[0] as Match : null;
    } catch (error) {
      console.error('Error finding match by id:', error);
      throw error;
    }
  }

  async findActiveMatch(): Promise<Match | null> {
    try {
      const matches = await this.db.query(
        "SELECT * FROM matches WHERE status = 'in_progress' ORDER BY created_at DESC LIMIT 1"
      );
      
      return matches.length > 0 ? matches[0] as Match : null;
    } catch (error) {
      console.error('Error finding active match:', error);
      throw error;
    }
  }

  async updateStatus(id: number, status: MatchStatus, endedAt?: Date): Promise<void> {
    try {
      let sql = 'UPDATE matches SET status = ?';
      const params: any[] = [status];

      if (endedAt && status === 'completed') {
        sql += ', ended_at = ?';
        params.push(endedAt.toISOString());
      }

      sql += ' WHERE id = ?';
      params.push(id);

      await this.db.execute(sql, params);
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  async startMatch(id: number): Promise<void> {
    try {
      await this.db.execute(
        'UPDATE matches SET started_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error starting match:', error);
      throw error;
    }
  }

  async abandonMatch(id: number): Promise<void> {
    try {
      await this.db.execute(
        'UPDATE matches SET status = ?, ended_at = ? WHERE id = ?',
        ['abandoned', new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error abandoning match:', error);
      throw error;
    }
  }

  async completeMatch(id: number): Promise<void> {
    try {
      await this.db.execute(
        'UPDATE matches SET status = ?, ended_at = ? WHERE id = ?',
        ['completed', new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error completing match:', error);
      throw error;
    }
  }
}