/**
 * ActionRepository
 *
 * Repository for managing basketball match actions in SQLite database.
 * Handles CRUD operations for actions (shots, rebounds, fouls, etc.)
 *
 * Features:
 * - Single action creation with immediate logging
 * - Batch action creation within transaction
 * - Action compaction: groups actions by player_id in JSON format for completed matches
 * - Reads from compacted format (matches.player_stats) or live format (match_actions table)
 * - Action deletion (single or all for match)
 * - Action counting and ordering
 *
 * Architecture:
 * - Uses SQLite via DatabaseService
 * - Stores actions in match_actions table during active match
 * - Compacts actions into matches.player_stats JSON after match completion
 * - Automatically detects and reads from correct source based on match status
 */
import { DatabaseService } from "./DatabaseService";
import { Action, CreateActionData } from "../../models/types";
import { logInfo, logError, logWarn } from "../../../utils/logger";
import { generateUUID } from "../../utils/uuid";

export interface IActionRepository {
  create(data: CreateActionData): Promise<Action>;
  getActionsForMatch(matchId: string): Promise<Action[]>;
  deleteAction(actionId: string): Promise<void>;
  deleteActionsForMatch(matchId: string): Promise<void>;
  createBatch(actions: CreateActionData[]): Promise<Action[]>;
  getActionCount(matchId: string): Promise<number>;
}

export class ActionRepository implements IActionRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create a single action in SQLite database
   * Inserts into match_actions table and returns created action with UUID
   */
  async create(data: CreateActionData): Promise<Action> {
    const actionId = generateUUID();
    const sql = `
      INSERT INTO match_actions (
        id, match_id, team, player_number, action_type, specification, points,
        semantic_x, semantic_y, action_order, period_number, time_in_period
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      logInfo('ActionRepository', '📊 Creating action in SQLite', {
        actionId,
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
        actionId,
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
        "SELECT * FROM match_actions WHERE id = ?",
        [actionId]
      );

      if (actions.length === 0) {
        logError('ActionRepository', '❌ Failed to retrieve created action', { actionId });
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

      // Generate UUIDs for all actions
      const actionsWithIds = actions.map(action => ({
        ...action,
        id: generateUUID()
      }));

      await this.db.transaction(async (adapter) => {
        const sql = `
          INSERT INTO match_actions (
            id, match_id, team, player_number, action_type, specification, points,
            semantic_x, semantic_y, action_order, period_number, time_in_period
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const action of actionsWithIds) {
          await adapter.execute(sql, [
            action.id,
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

      // Retrieve created actions by their IDs
      const matchId = actions[0].match_id;
      const ids = actionsWithIds.map(a => a.id);
      const placeholders = ids.map(() => '?').join(',');
      const createdActions = await this.db.query(
        `SELECT * FROM match_actions
         WHERE id IN (${placeholders})
         ORDER BY action_order DESC`,
        ids
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
   * - Completed matches: reads from matches.player_stats (compacted JSON)
   * - Active matches: reads from match_actions table
   */
  async getActionsForMatch(matchId: string): Promise<Action[]> {
    try {
      logInfo('ActionRepository', '📊 Fetching actions for match', { matchId });

      // Check match status and player_stats to determine if actions are compacted
      const matchResult = await this.db.query(
        `SELECT status, player_stats, players FROM matches WHERE id = ?`,
        [matchId]
      );

      const match = matchResult[0];
      const matchStatus = match?.status;
      const playerStatsJson = match?.player_stats;
      const playersJson = match?.players;

      // Only try to read compacted actions if match is completed and has player_stats
      if (matchStatus === 'completed' && playerStatsJson && playerStatsJson !== '{}') {
        try {
          const playerStats = JSON.parse(playerStatsJson);
          const players = playersJson ? JSON.parse(playersJson) : [];

          // Create player_id -> player_number mapping
          const playerMap = new Map<string, { player_number: number; team: string }>();
          for (const player of players) {
            const playerId = player.player_id || `temp-${player.team}-${player.player_number}`;
            playerMap.set(playerId, {
              player_number: player.player_number,
              team: player.team
            });
          }

          logInfo('ActionRepository', '📦 Reading compacted actions from matches.player_stats', {
            matchId,
            playerCount: Object.keys(playerStats).length,
            matchStatus
          });

          const allActions: Action[] = [];
          let actionIdCounter = 1;

          // Iterate through player_stats: { [player_id]: { actions: [...] } }
          for (const [playerId, stats] of Object.entries(playerStats)) {
            // Special key for team rebounds (player_number = -1)
            const isTeamRebound = playerId.startsWith('team-rebound-');

            if (!isTeamRebound) {
              const playerInfo = playerMap.get(playerId);
              if (!playerInfo) {
                logWarn('ActionRepository', '⚠️ Player info not found for player_id', {
                  matchId,
                  playerId
                });
                continue;
              }
            }

            if (stats && (stats as any).actions) {
              try {
                const playerActions = (stats as any).actions;

                for (const action of playerActions) {
                  const playerNumber = isTeamRebound ? -1 : playerMap.get(playerId)!.player_number;
                  allActions.push({
                    id: String(actionIdCounter++),
                    match_id: matchId,
                    team: action.team,
                    player_number: playerNumber,
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
                  playerId,
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
        } catch (parseError) {
          logError('ActionRepository', '❌ Error parsing player_stats JSON', {
            matchId,
            error: parseError instanceof Error ? parseError.message : parseError
          });
          // Fall through to read from match_actions table
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
  async deleteAction(actionId: string): Promise<void> {
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
  async deleteActionsForMatch(matchId: string): Promise<void> {
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
  async getActionCount(matchId: string): Promise<number> {
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
  async getLastActionOrder(matchId: string): Promise<number> {
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
   * Compact match actions: group by player_id and store in matches.player_stats as JSON
   * Then delete all actions from match_actions table
   * Called after match completion to save space and improve performance
   */
  async compactMatchActions(matchId: string): Promise<void> {
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

      // 2. Get players for this match to map player_number -> player_id
      const playersResult = await this.db.query(
        "SELECT players FROM matches WHERE id = ?",
        [matchId]
      );

      if (playersResult.length === 0) {
        throw new Error(`Match not found: ${matchId}`);
      }

      const playersJson = playersResult[0].players || '[]';
      const players = JSON.parse(playersJson);

      // Create mapping: team-playerNumber -> player_id
      const playerIdMap = new Map<string, string>();
      for (const player of players) {
        const key = `${player.team}-${player.player_number}`;
        const playerId = player.player_id || `temp-${player.team}-${player.player_number}`;
        playerIdMap.set(key, playerId);
      }

      // 3. Group actions by player_id
      const actionsByPlayerId: Record<string, any[]> = {};

      for (const action of actions) {
        // Team rebounds (player_number = -1) have no real player — store under a dedicated key
        if (action.player_number === -1) {
          const teamReboundKey = `team-rebound-${action.team}`;
          if (!actionsByPlayerId[teamReboundKey]) {
            actionsByPlayerId[teamReboundKey] = [];
          }
          actionsByPlayerId[teamReboundKey].push({
            team: action.team,
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
          continue;
        }

        const playerKey = `${action.team}-${action.player_number}`;
        const playerId = playerIdMap.get(playerKey);

        if (!playerId) {
          logWarn('ActionRepository', '⚠️ Player not found for action', {
            matchId,
            team: action.team,
            playerNumber: action.player_number
          });
          continue;
        }

        if (!actionsByPlayerId[playerId]) {
          actionsByPlayerId[playerId] = [];
        }

        // Format action in the same way as Supabase
        actionsByPlayerId[playerId].push({
          team: action.team,
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

      logInfo('ActionRepository', '👥 Actions grouped by player_id', {
        matchId,
        playerCount: Object.keys(actionsByPlayerId).length
      });

      // 4. Build player_stats object: { [player_id]: { actions: [...] } }
      const playerStats: Record<string, { actions: any[] }> = {};
      for (const [playerId, actions] of Object.entries(actionsByPlayerId)) {
        playerStats[playerId] = { actions };
      }

      // 5. Update matches.player_stats with compacted data
      const playerStatsJson = JSON.stringify(playerStats);
      await this.db.execute(
        "UPDATE matches SET player_stats = ? WHERE id = ?",
        [playerStatsJson, matchId]
      );

      logInfo('ActionRepository', '💾 Player stats saved to matches.player_stats', {
        matchId,
        playerCount: Object.keys(playerStats).length
      });

      // 6. Delete all actions from match_actions table
      await this.deleteActionsForMatch(matchId);

      logInfo('ActionRepository', '✅ Action compaction completed successfully', {
        matchId,
        totalActionsCompacted: actions.length,
        playerCount: Object.keys(actionsByPlayerId).length
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
