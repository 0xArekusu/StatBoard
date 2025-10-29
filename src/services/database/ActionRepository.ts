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
      // First, check if actions are compacted in match_players.actions
      const compactedPlayers = await this.db.query(
        `SELECT player_number, team, actions FROM match_players
         WHERE match_id = ? AND actions IS NOT NULL`,
        [matchId]
      );

      // If we have compacted actions, use them
      if (compactedPlayers.length > 0) {
        console.log(`📦 [ActionRepository] Reading ${compactedPlayers.length} compacted players for match ${matchId}`);

        const allActions: Action[] = [];
        let actionIdCounter = 1;

        for (const player of compactedPlayers) {
          if (player.actions) {
            try {
              const playerActions = JSON.parse(player.actions);

              for (const action of playerActions) {
                allActions.push({
                  id: actionIdCounter++,
                  match_id: matchId,
                  team: player.team,
                  player_number: player.player_number,
                  action_type: action.action_type,
                  specification: action.specification,
                  points: action.points,
                  semantic_x: action.semantic_x,
                  semantic_y: action.semantic_y,
                  action_order: action.action_order,
                  period_number: action.period_number,
                  time_in_period: action.time_in_period,
                  timestamp: action.timestamp,
                });
              }
            } catch (parseError) {
              console.error(`❌ Error parsing actions for player ${player.team}-${player.player_number}:`, parseError);
            }
          }
        }

        // Sort by action_order
        allActions.sort((a, b) => a.action_order - b.action_order);

        console.log(`✅ [ActionRepository] Loaded ${allActions.length} compacted actions`);
        return allActions;
      }

      // Otherwise, fall back to reading from match_actions table
      console.log(`📊 [ActionRepository] Reading from match_actions table for match ${matchId}`);
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

  /**
   * Compact match actions: group by player and store in match_players.actions as JSON
   * Then delete all actions from match_actions table
   */
  async compactMatchActions(matchId: number): Promise<void> {
    try {
      console.log(`🗜️ [ActionRepository] Compacting actions for match ${matchId}...`);

      // 1. Get all actions for this match
      const actions = await this.getActionsForMatch(matchId);

      if (actions.length === 0) {
        console.log(`⚠️ [ActionRepository] No actions to compact for match ${matchId}`);
        return;
      }

      console.log(`📦 [ActionRepository] Found ${actions.length} actions to compact`);

      // 2. Group actions by player (team + player_number)
      const actionsByPlayer = new Map<string, any[]>();

      for (const action of actions) {
        const playerKey = `${action.team}-${action.player_number}`;

        if (!actionsByPlayer.has(playerKey)) {
          actionsByPlayer.set(playerKey, []);
        }

        // Format action in the same way as Supabase
        actionsByPlayer.get(playerKey)!.push({
          action_type: action.action_type,
          specification: action.specification,
          points: action.points || null,
          semantic_x: action.semantic_x,
          semantic_y: action.semantic_y,
          action_order: action.action_order,
          period_number: action.period_number,
          time_in_period: action.time_in_period,
          timestamp: action.timestamp,
        });
      }

      console.log(`👥 [ActionRepository] Grouped into ${actionsByPlayer.size} players`);

      // 3. Update each match_player with their actions
      for (const [playerKey, playerActions] of actionsByPlayer.entries()) {
        const [team, playerNumber] = playerKey.split('-');
        const actionsJson = JSON.stringify(playerActions);

        await this.db.execute(
          `UPDATE match_players
           SET actions = ?
           WHERE match_id = ? AND team = ? AND player_number = ?`,
          [actionsJson, matchId, team, parseInt(playerNumber)]
        );

        console.log(`💾 [ActionRepository] Saved ${playerActions.length} actions for player ${playerKey}`);
      }

      // 4. Delete all actions from match_actions table
      await this.deleteActionsForMatch(matchId);

      console.log(`✅ [ActionRepository] Actions compacted successfully for match ${matchId}`);
    } catch (error) {
      console.error(`❌ [ActionRepository] Error compacting actions for match ${matchId}:`, error);
      throw error;
    }
  }
}
