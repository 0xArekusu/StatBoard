/**
 * ActionRepository
 *
 * Repository for managing basketball match actions in SQLite database.
 * Handles CRUD operations for actions (shots, rebounds, fouls, etc.)
 *
 * Features:
 * - Single action creation with immediate logging
 * - Batch action creation within transaction
 * - Action compaction: groups actions by player in JSON format for completed matches
 * - Reads from compacted format (match_players.actions) or live format (match_actions table)
 * - Action deletion (single or all for match)
 * - Action counting and ordering
 *
 * Architecture:
 * - Uses SQLite via DatabaseService
 * - Stores actions in match_actions table during active match
 * - Compacts actions into match_players.actions JSON after match completion
 * - Automatically detects and reads from correct source based on match status
 */
import { DatabaseService } from "./DatabaseService";
import { Action, CreateActionData } from "../../models/types";
import { logInfo, logError, logWarn } from "../../../utils/logger";

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

  /**
   * Create a single action in SQLite database
   * Inserts into match_actions table and returns created action with ID
   */
  async create(data: CreateActionData): Promise<Action> {
    const sql = `
      INSERT INTO match_actions (
        match_id, team, player_number, action_type, specification, points,
        semantic_x, semantic_y, action_order, period_number, time_in_period
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      logInfo('ActionRepository', '📊 Creating action in SQLite', {
        matchId: data.match_id,
        actionType: data.action_type,
        specification: data.specification,
        player: data.player_number,
        team: data.team,
        points: data.points,
        period: data.period_number,
        order: data.action_order
      });

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

      // Retrieve created action
      const actions = await this.db.query(
        "SELECT * FROM match_actions WHERE match_id = ? ORDER BY id DESC LIMIT 1",
        [data.match_id]
      );

      if (actions.length === 0) {
        logError('ActionRepository', '❌ Failed to retrieve created action', { matchId: data.match_id });
        throw new Error("Failed to create action");
      }

      logInfo('ActionRepository', '✅ Action created successfully in SQLite', {
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
      logError('ActionRepository', '❌ Error creating action in SQLite', {
        error: error instanceof Error ? error.message : error,
        matchId: data.match_id,
        actionType: data.action_type
      });
      throw error;
    }
  }

  /**
   * Create multiple actions in a single transaction
   * More efficient than individual creates for bulk operations
   */
  async createBatch(actions: CreateActionData[]): Promise<Action[]> {
    if (actions.length === 0) return [];

    try {
      logInfo('ActionRepository', '📊 Creating batch of actions in SQLite transaction', {
        actionCount: actions.length,
        matchId: actions[0].match_id
      });

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

      // Retrieve created actions
      const matchId = actions[0].match_id;
      const createdActions = await this.db.query(
        `SELECT * FROM match_actions
         WHERE match_id = ?
         ORDER BY id DESC
         LIMIT ?`,
        [matchId, actions.length]
      );

      logInfo('ActionRepository', '✅ Batch created successfully in SQLite', {
        actionCount: actions.length,
        matchId
      });
      return createdActions as Action[];
    } catch (error) {
      logError('ActionRepository', '❌ Error creating action batch in SQLite', {
        error: error instanceof Error ? error.message : error,
        actionCount: actions.length,
        matchId: actions[0]?.match_id
      });
      throw error;
    }
  }

  /**
   * Get all actions for a match
   * Automatically detects source:
   * - Completed matches: reads from match_players.actions (compacted JSON)
   * - Active matches: reads from match_actions table
   */
  async getActionsForMatch(matchId: number): Promise<Action[]> {
    try {
      logInfo('ActionRepository', '📊 Fetching actions for match', { matchId });

      // Check match status to determine if actions are compacted
      const matchResult = await this.db.query(
        `SELECT status FROM matches WHERE id = ?`,
        [matchId]
      );

      const matchStatus = matchResult[0]?.status;

      // Only try to read compacted actions if match is completed
      if (matchStatus === 'completed') {
        const compactedPlayers = await this.db.query(
          `SELECT player_number, team, actions FROM match_players
           WHERE match_id = ? AND actions IS NOT NULL AND actions != ''`,
          [matchId]
        );

        // If we have compacted actions, use them
        if (compactedPlayers.length > 0) {
          logInfo('ActionRepository', '📦 Reading compacted actions from match_players', {
            matchId,
            playerCount: compactedPlayers.length,
            matchStatus
          });

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
                    team: action.team || player.team, // Use team from action if available, fallback to player.team for backward compatibility
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
                logError('ActionRepository', '❌ Error parsing compacted actions for player', {
                  matchId,
                  team: player.team,
                  playerNumber: player.player_number,
                  error: parseError instanceof Error ? parseError.message : parseError
                });
              }
            }
          }

          // Sort by action_order DESC (most recent first)
          allActions.sort((a, b) => b.action_order - a.action_order);

          logInfo('ActionRepository', '✅ Compacted actions loaded successfully', {
            matchId,
            totalActions: allActions.length
          });
          return allActions;
        }
      }

      // For in-progress matches or if no compacted data, read from match_actions table
      logInfo('ActionRepository', '📊 Reading from match_actions table', {
        matchId,
        matchStatus
      });

      const actions = await this.db.query(
        `SELECT * FROM match_actions
         WHERE match_id = ?
         ORDER BY action_order DESC, timestamp DESC`,
        [matchId]
      );

      logInfo('ActionRepository', '✅ Actions loaded from match_actions table', {
        matchId,
        actionCount: actions.length
      });

      return actions as Action[];
    } catch (error) {
      logError('ActionRepository', '❌ Error getting actions for match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Delete a single action by ID
   * Verifies action exists before deletion
   */
  async deleteAction(actionId: number): Promise<void> {
    try {
      logInfo('ActionRepository', '🗑️ Deleting action from SQLite', { actionId });

      const result = await this.db.query(
        "SELECT * FROM match_actions WHERE id = ?",
        [actionId]
      );

      if (result.length === 0) {
        logWarn('ActionRepository', '⚠️ Action not found for deletion', { actionId });
        throw new Error(`Action with id ${actionId} not found`);
      }

      await this.db.execute("DELETE FROM match_actions WHERE id = ?", [
        actionId,
      ]);

      logInfo('ActionRepository', '✅ Action deleted successfully', {
        actionId,
        actionType: result[0].action_type,
        matchId: result[0].match_id
      });
    } catch (error) {
      logError('ActionRepository', '❌ Error deleting action', {
        actionId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Delete all actions for a match
   * Used during match cleanup or compaction
   */
  async deleteActionsForMatch(matchId: number): Promise<void> {
    try {
      logInfo('ActionRepository', '🗑️ Deleting all actions for match', { matchId });

      await this.db.execute(
        "DELETE FROM match_actions WHERE match_id = ?",
        [matchId]
      );

      logInfo('ActionRepository', '✅ All actions deleted for match', { matchId });
    } catch (error) {
      logError('ActionRepository', '❌ Error deleting actions for match', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get total count of actions for a match
   * Returns 0 if error occurs
   */
  async getActionCount(matchId: number): Promise<number> {
    try {
      const result = await this.db.query(
        "SELECT COUNT(*) as count FROM match_actions WHERE match_id = ?",
        [matchId]
      );

      const count = result[0]?.count || 0;
      logInfo('ActionRepository', '📊 Action count retrieved', { matchId, count });
      return count;
    } catch (error) {
      logError('ActionRepository', '❌ Error getting action count', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      return 0;
    }
  }

  /**
   * Get highest action_order value for a match
   * Used to determine next action order number
   */
  async getLastActionOrder(matchId: number): Promise<number> {
    try {
      const result = await this.db.query(
        "SELECT MAX(action_order) as max_order FROM match_actions WHERE match_id = ?",
        [matchId]
      );

      const maxOrder = result[0]?.max_order || 0;
      logInfo('ActionRepository', '📊 Last action order retrieved', { matchId, maxOrder });
      return maxOrder;
    } catch (error) {
      logError('ActionRepository', '❌ Error getting last action order', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      return 0;
    }
  }

  /**
   * Compact match actions: group by player and store in match_players.actions as JSON
   * Then delete all actions from match_actions table
   * Called after match completion to save space and improve performance
   */
  async compactMatchActions(matchId: number): Promise<void> {
    try {
      logInfo('ActionRepository', '🗜️ Starting action compaction', { matchId });

      // 1. Get all actions for this match
      const actions = await this.getActionsForMatch(matchId);

      if (actions.length === 0) {
        logWarn('ActionRepository', '⚠️ No actions to compact', { matchId });
        return;
      }

      logInfo('ActionRepository', '📦 Actions to compact', {
        matchId,
        actionCount: actions.length
      });

      // 2. Group actions by player (team + player_number)
      const actionsByPlayer = new Map<string, any[]>();

      for (const action of actions) {
        const playerKey = `${action.team}-${action.player_number}`;

        if (!actionsByPlayer.has(playerKey)) {
          actionsByPlayer.set(playerKey, []);
        }

        // Format action in the same way as Supabase
        actionsByPlayer.get(playerKey)!.push({
          team: action.team, // Include team field to preserve it during compaction
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

      logInfo('ActionRepository', '👥 Actions grouped by player', {
        matchId,
        playerCount: actionsByPlayer.size
      });

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

        logInfo('ActionRepository', '💾 Actions saved for player', {
          matchId,
          playerKey,
          actionCount: playerActions.length
        });
      }

      // 4. Delete all actions from match_actions table
      await this.deleteActionsForMatch(matchId);

      logInfo('ActionRepository', '✅ Action compaction completed successfully', {
        matchId,
        totalActionsCompacted: actions.length,
        playerCount: actionsByPlayer.size
      });
    } catch (error) {
      logError('ActionRepository', '❌ Error compacting actions', {
        matchId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}
