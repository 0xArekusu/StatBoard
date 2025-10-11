import { DatabaseService } from './DatabaseService';

export interface MatchPlayer {
  id: number;
  match_id: number;
  player_number: number;
  player_name: string;
  team: 'A' | 'B';
  is_starter: boolean;
  created_at: string;
}

export interface CreateMatchPlayerData {
  match_id: number;
  player_number: number;
  player_name: string;
  team: 'A' | 'B';
  is_starter: boolean;
}

export interface IMatchPlayerRepository {
  create(data: CreateMatchPlayerData): Promise<MatchPlayer>;
  createBatch(players: CreateMatchPlayerData[]): Promise<MatchPlayer[]>;
  getPlayersForMatch(matchId: number): Promise<MatchPlayer[]>;
  deletePlayersForMatch(matchId: number): Promise<void>;
}

export class MatchPlayerRepository implements IMatchPlayerRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async create(data: CreateMatchPlayerData): Promise<MatchPlayer> {
    const sql = `
      INSERT INTO match_players (
        match_id, player_number, player_name, team, is_starter
      ) VALUES (?, ?, ?, ?, ?)
    `;

    try {
      await this.db.execute(sql, [
        data.match_id,
        data.player_number,
        data.player_name,
        data.team,
        data.is_starter ? 1 : 0,
      ]);

      const players = await this.db.query(
        'SELECT * FROM match_players WHERE match_id = ? ORDER BY id DESC LIMIT 1',
        [data.match_id]
      );

      if (players.length === 0) {
        throw new Error('Failed to create match player');
      }

      return players[0] as MatchPlayer;
    } catch (error) {
      console.error('Error creating match player:', error);
      throw error;
    }
  }

  async createBatch(players: CreateMatchPlayerData[]): Promise<MatchPlayer[]> {
    if (players.length === 0) return [];

    try {
      console.log(`📊 Creating batch of ${players.length} match players...`);

      await this.db.transaction(async (adapter) => {
        const sql = `
          INSERT INTO match_players (
            match_id, player_number, player_name, team, is_starter
          ) VALUES (?, ?, ?, ?, ?)
        `;

        for (const player of players) {
          await adapter.execute(sql, [
            player.match_id,
            player.player_number,
            player.player_name,
            player.team,
            player.is_starter ? 1 : 0,
          ]);
        }
      });

      const matchId = players[0].match_id;
      const createdPlayers = await this.db.query(
        'SELECT * FROM match_players WHERE match_id = ? ORDER BY team, is_starter DESC, player_number',
        [matchId]
      );

      console.log(`✅ Batch of ${players.length} match players created`);
      return createdPlayers as MatchPlayer[];
    } catch (error) {
      console.error('❌ Error creating match player batch:', error);
      throw error;
    }
  }

  async getPlayersForMatch(matchId: number): Promise<MatchPlayer[]> {
    try {
      const players = await this.db.query(
        'SELECT * FROM match_players WHERE match_id = ? ORDER BY team, is_starter DESC, player_number',
        [matchId]
      );

      console.log(`📊 Loaded ${players.length} players for match ${matchId}`);
      return players as MatchPlayer[];
    } catch (error) {
      console.error('❌ Error getting players for match:', error);
      throw error;
    }
  }

  async deletePlayersForMatch(matchId: number): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM match_players WHERE match_id = ?',
        [matchId]
      );
      console.log('🗑️ All players deleted for match:', matchId);
    } catch (error) {
      console.error('❌ Error deleting players for match:', error);
      throw error;
    }
  }
}
