import { Match, Team } from "../src/models/types";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Player data structure for match details
 */
export interface PlayerData {
  id: number;
  num: number;
  name: string;
  team: Team;
  isSubstitute: boolean;
  photoUrl?: string;
}

/**
 * Action data structure for match details
 */
export interface ActionData {
  type: string;
  specification?: string;
  points: number;
  player: number;
  team: Team;
  timestamp: Date;
  period_number: number;
  time_in_period: number;
  position: { x: number; y: number };
  semanticPosition: {
    xNormalized: number;
    yNormalized: number;
  };
}

/**
 * Match details response
 */
export interface MatchDetailsData {
  actions: ActionData[];
  players: PlayerData[];
}

/**
 * Service Layer Pattern
 * Business logic for loading match data from both Supabase and local SQLite
 *
 * This service abstracts the complexity of loading match details from
 * different data sources (Supabase for synced matches, SQLite for local matches)
 */
export class MatchDataService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly actionRepository: ActionRepository
  ) {}

  /**
   * Load complete match details including actions and players
   * Automatically determines the data source based on match ID type
   *
   * @param match - The match to load details for
   * @returns Match details with actions and players
   */
  async loadMatchDetails(match: Match): Promise<MatchDetailsData> {
    const matchId = (match as any).supabase_id || match.id;
    const isUUID = typeof matchId === "string" && matchId.includes("-");

    if (isUUID) {
      return this.loadFromSupabase(matchId);
    } else {
      return this.loadFromLocal(Number(matchId));
    }
  }

  /**
   * Load match details from Supabase
   * Fetches match_players with embedded actions from the server
   *
   * @param matchId - UUID of the match in Supabase
   * @returns Match details from server
   */
  private async loadFromSupabase(matchId: string): Promise<MatchDetailsData> {
    const { data: matchPlayers, error } = await this.supabase
      .from("match_players")
      .select("*")
      .eq("match_id", matchId);

    if (error) {
      console.error("Error loading match players from Supabase:", error);
      throw new Error(`Failed to load match players: ${error.message}`);
    }

    if (!matchPlayers) {
      return { actions: [], players: [] };
    }

    // Convert match players to PlayerData format
    const players: PlayerData[] = matchPlayers.map((mp: any) => ({
      id: mp.player_number,
      num: mp.player_number,
      name: mp.player_name,
      team: mp.team,
      isSubstitute: !mp.is_starter,
      photoUrl: mp.photo_url,
    }));

    // Extract and convert actions from match_players
    const actions: ActionData[] = [];
    matchPlayers.forEach((mp: any) => {
      if (mp.actions && Array.isArray(mp.actions)) {
        const playerActions = mp.actions.map((action: any) => ({
          type: action.action_type,
          specification: action.specification,
          points: action.points,
          player: mp.player_number,
          team: mp.team,
          timestamp: new Date(action.timestamp),
          period_number: action.period_number,
          time_in_period: action.time_in_period,
          position: { x: 0, y: 0 },
          semanticPosition: {
            xNormalized: action.semantic_x,
            yNormalized: action.semantic_y,
          },
        }));
        actions.push(...playerActions);
      }
    });

    return { actions, players };
  }

  /**
   * Load match details from local SQLite database
   * Fetches actions from the ActionRepository
   *
   * @param matchId - Local database ID of the match
   * @returns Match details from local storage
   */
  private async loadFromLocal(matchId: number): Promise<MatchDetailsData> {
    const actionsFromDB = await this.actionRepository.getActionsForMatch(matchId);

    // Convert to ActionData format
    const actions: ActionData[] = actionsFromDB.map((action: any) => ({
      type: action.action_type,
      specification: action.specification,
      points: action.points,
      player: action.player_number,
      team: action.team,
      timestamp: new Date(action.timestamp),
      period_number: action.period_number,
      time_in_period: action.time_in_period,
      position: { x: 0, y: 0 },
      semanticPosition: {
        xNormalized: action.semantic_x,
        yNormalized: action.semantic_y,
      },
    }));

    // For local matches, we don't have player data stored separately
    // Players are derived from actions
    return { actions, players: [] };
  }
}
