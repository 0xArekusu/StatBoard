import { DatabaseService } from "./DatabaseService";
import { Action, CreateActionData } from "../../models/types";

export interface IActionRepository {
  create(data: CreateActionData): Promise<Action>;
  getActionsForMatch(matchId: number): Promise<Action[]>;
  deleteAction(actionId: number): Promise<void>;
  deleteActionsForMatch(matchId: number): Promise<void>;
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
        match_id, team, player_number, action_type, specification, points,
        semantic_x, semantic_y, action_order, period_number, time_in_period
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.db.execute(sql, [
        data.match_id,
        data.team,
        data.player_number,
        data.action_type,
        data.specification,
        data.points || null,
        data.semantic_x,
        data.semantic_y,
        data.action_order,
        data.period_number,
        data.time_in_period,
      ]);

      // Récupérer l'action créée
      const actions = await this.db.query(
        "SELECT * FROM match_actions WHERE match_id = ? ORDER BY id DESC LIMIT 1",
        [data.match_id]
      );

      if (actions.length === 0) {
        throw new Error("Failed to create action");
      }

      console.log("📊 Action created in DB:", {
        id: actions[0].id,
        type: actions[0].action_type,
        specification: actions[0].specification,
        player: actions[0].player_number,
        team: actions[0].team,
        period: actions[0].period_number,
        timeInPeriod: `${Math.floor(actions[0].time_in_period / 60)}:${(
          actions[0].time_in_period % 60
        )
          .toString()
          .padStart(2, "0")}`,
        order: actions[0].action_order,
      });

      return actions[0] as Action;
    } catch (error) {
      console.error("❌ Error creating action:", error);
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
            match_id, team, player_number, action_type, specification, points,
            semantic_x, semantic_y, action_order, period_number, time_in_period
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const action of actions) {
          await adapter.execute(sql, [
            action.match_id,
            action.team,
            action.player_number,
            action.action_type,
            action.specification,
            action.points || null,
            action.semantic_x,
            action.semantic_y,
            action.action_order,
            action.period_number,
            action.time_in_period,
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
      console.error("❌ Error creating action batch:", error);
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

      return actions as Action[];
    } catch (error) {
      console.error("❌ Error getting actions for match:", error);
      throw error;
    }
  }

  async deleteAction(actionId: number): Promise<void> {
    try {
      const result = await this.db.query(
        "SELECT * FROM match_actions WHERE id = ?",
        [actionId]
      );

      if (result.length === 0) {
        throw new Error(`Action with id ${actionId} not found`);
      }

      await this.db.execute("DELETE FROM match_actions WHERE id = ?", [
        actionId,
      ]);

      console.log("🗑️ Action deleted from DB:", actionId);
    } catch (error) {
      console.error("❌ Error deleting action:", error);
      throw error;
    }
  }

  async deleteActionsForMatch(matchId: number): Promise<void> {
    try {
      await this.db.execute(
        "DELETE FROM match_actions WHERE match_id = ?",
        [matchId]
      );
      console.log("🗑️ All actions deleted for match:", matchId);
    } catch (error) {
      console.error("❌ Error deleting actions for match:", error);
      throw error;
    }
  }

  async getActionCount(matchId: number): Promise<number> {
    try {
      const result = await this.db.query(
        "SELECT COUNT(*) as count FROM match_actions WHERE match_id = ?",
        [matchId]
      );

      return result[0]?.count || 0;
    } catch (error) {
      console.error("❌ Error getting action count:", error);
      return 0;
    }
  }

  async getLastActionOrder(matchId: number): Promise<number> {
    try {
      const result = await this.db.query(
        "SELECT MAX(action_order) as max_order FROM match_actions WHERE match_id = ?",
        [matchId]
      );

      return result[0]?.max_order || 0;
    } catch (error) {
      console.error("❌ Error getting last action order:", error);
      return 0;
    }
  }
}
