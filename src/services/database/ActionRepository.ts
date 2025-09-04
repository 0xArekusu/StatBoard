import { DatabaseService } from './DatabaseService';
import { Action, CreateActionData } from '../../models/types';

export interface IActionRepository {
  create(data: CreateActionData): Promise<Action>;
  getActionsForMatch(matchId: number): Promise<Action[]>;
  deleteAction(actionId: number): Promise<void>;
  createBatch(actions: CreateActionData[]): Promise<Action[]>;
  getActionCount(matchId: number): Promise<number>;
}

export class ActionRepository implements IActionRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async create(data: CreateActionData): Promise<Action> {
    const sql = `
      INSERT INTO match_actions (
        match_id, team, player_number, action_type, specification, 
        semantic_x, semantic_y, action_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      await this.db.execute(sql, [
        data.match_id,
        data.team,
        data.player_number,
        data.action_type,
        data.specification,
        data.semantic_x,
        data.semantic_y,
        data.action_order
      ]);

      // Récupérer l'action créée
      const actions = await this.db.query(
        'SELECT * FROM match_actions WHERE match_id = ? ORDER BY id DESC LIMIT 1',
        [data.match_id]
      );
      
      if (actions.length === 0) {
        throw new Error('Failed to create action');
      }

      console.log('📊 Action created in DB:', {
        id: actions[0].id,
        type: actions[0].action_type,
        player: actions[0].player_number
      });

      return actions[0] as Action;
    } catch (error) {
      console.error('❌ Error creating action:', error);
      throw error;
    }
  }

  async createBatch(actions: CreateActionData[]): Promise<Action[]> {
    if (actions.length === 0) return [];

    try {
      console.log(`📊 Creating batch of ${actions.length} actions...`);
      
      await this.db.transaction(async (adapter) => {
        const sql = `
          INSERT INTO match_actions (
            match_id, team, player_number, action_type, specification, 
            semantic_x, semantic_y, action_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const action of actions) {
          await adapter.execute(sql, [
            action.match_id,
            action.team,
            action.player_number,
            action.action_type,
            action.specification,
            action.semantic_x,
            action.semantic_y,
            action.action_order
          ]);
        }
      });

      // Récupérer les actions créées
      const matchId = actions[0].match_id;
      const createdActions = await this.db.query(
        `SELECT * FROM match_actions 
         WHERE match_id = ? 
         ORDER BY id DESC 
         LIMIT ?`,
        [matchId, actions.length]
      );

      console.log(`✅ Batch of ${actions.length} actions created successfully`);
      return createdActions as Action[];
    } catch (error) {
      console.error('❌ Error creating action batch:', error);
      throw error;
    }
  }

  async getActionsForMatch(matchId: number): Promise<Action[]> {
    try {
      const actions = await this.db.query(
        `SELECT * FROM match_actions 
         WHERE match_id = ? 
         ORDER BY action_order ASC, timestamp ASC`,
        [matchId]
      );
      
      console.log(`📊 Loaded ${actions.length} actions for match ${matchId}`);
      return actions as Action[];
    } catch (error) {
      console.error('❌ Error getting actions for match:', error);
      throw error;
    }
  }

  async deleteAction(actionId: number): Promise<void> {
    try {
      const result = await this.db.query(
        'SELECT * FROM match_actions WHERE id = ?',
        [actionId]
      );

      if (result.length === 0) {
        throw new Error(`Action with id ${actionId} not found`);
      }

      await this.db.execute(
        'DELETE FROM match_actions WHERE id = ?',
        [actionId]
      );

      console.log('🗑️ Action deleted from DB:', actionId);
    } catch (error) {
      console.error('❌ Error deleting action:', error);
      throw error;
    }
  }

  async getActionCount(matchId: number): Promise<number> {
    try {
      const result = await this.db.query(
        'SELECT COUNT(*) as count FROM match_actions WHERE match_id = ?',
        [matchId]
      );
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('❌ Error getting action count:', error);
      return 0;
    }
  }

  async getLastActionOrder(matchId: number): Promise<number> {
    try {
      const result = await this.db.query(
        'SELECT MAX(action_order) as max_order FROM match_actions WHERE match_id = ?',
        [matchId]
      );
      
      return result[0]?.max_order || 0;
    } catch (error) {
      console.error('❌ Error getting last action order:', error);
      return 0;
    }
  }
}