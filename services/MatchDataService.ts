import { Match, Team } from "../src/models/types";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
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
  playingTimeSeconds?: number;
  player_id?: string | null;
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
    private readonly actionRepository: ActionRepository,
    private readonly matchPlayerRepository: MatchPlayerRepository = new MatchPlayerRepository()
  ) {}

  /**
   * Load complete match details including actions and players
   * Automatically determines the data source based on match sync status
   *
   * @param match - The match to load details for
   * @returns Match details with actions and players
   */
  async loadMatchDetails(match: Match): Promise<MatchDetailsData> {
    const matchId = match.id;

    // Check if match has been synced to Supabase
    // If match is synced and has supabase_id, load from Supabase
    // Otherwise, load from local SQLite (guest mode or unsynced match)
    const hasSupabaseId = (match as any).supabase_id !== undefined && (match as any).supabase_id !== null;
    const isSynced = Boolean(match.synced_to_server);

    if (hasSupabaseId && isSynced) {
      return this.loadFromSupabase((match as any).supabase_id);
    } else {
      return this.loadFromLocal(matchId);
    }
  }

  /**
   * Load match details from Supabase
   * Fetches match with embedded players and player_stats from the server
   *
   * @param matchId - UUID of the match in Supabase
   * @returns Match details from server
   */
  private async loadFromSupabase(matchId: string): Promise<MatchDetailsData> {
    const { data: match, error } = await this.supabase
      .from("matches")
      .select("players, player_stats")
      .eq("id", matchId)
      .single();

    if (error) {
      console.error("Error loading match from Supabase:", error);
      throw new Error(`Failed to load match: ${error.message}`);
    }

    if (!match) {
      return { actions: [], players: [] };
    }

    // Extract players from matches.players JSONB array
    const playersArray = match.players || [];
    const players: PlayerData[] = playersArray.map((p: any) => ({
      id: p.player_number,
      num: p.player_number,
      name: p.player_name,
      team: p.team,
      isSubstitute: !p.is_starter,
      photoUrl: p.photo_url,
      playingTimeSeconds: p.playing_time_seconds || 0,
      player_id: p.player_id || null,
    }));

    // Extract actions from matches.player_stats JSONB object
    const playerStatsObject = match.player_stats || {};
    const actions: ActionData[] = [];

    // Create player_id -> player_number mapping
    const playerMap = new Map<string, number>();
    playersArray.forEach((p: any) => {
      const playerId = p.player_id || `temp-${p.team}-${p.player_number}`;
      playerMap.set(playerId, p.player_number);
    });

    // Iterate through player_stats: { [player_id]: { actions: [...] } }
    for (const [playerId, stats] of Object.entries(playerStatsObject)) {
      const isTeamRebound = playerId.startsWith('team-rebound-');
      const playerNumber = isTeamRebound ? -1 : playerMap.get(playerId);

      if (!isTeamRebound && playerNumber === undefined) {
        console.warn(`Player number not found for player_id: ${playerId}`);
        continue;
      }

      const playerActions = (stats as any)?.actions || [];

      const convertedActions = playerActions.map((action: any) => ({
        type: action.action_type,
        specification: action.specification,
        points: action.points,
        player: playerNumber,
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

      actions.push(...convertedActions);
    }

    return { actions, players };
  }

  /**
   * Load match details from local SQLite database
   * Fetches actions and players from repositories
   *
   * @param matchId - Local database ID of the match (can be UUID string or number)
   * @returns Match details from local storage
   */
  private async loadFromLocal(matchId: string | number): Promise<MatchDetailsData> {
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

    // Load match players from database
    const matchPlayers = await this.matchPlayerRepository.getPlayersForMatch(matchId);

    // Convert to PlayerData format
    const players: PlayerData[] = matchPlayers.map((mp) => ({
      id: mp.player_number,
      num: mp.player_number,
      name: mp.player_name,
      team: mp.team as Team,
      isSubstitute: !mp.is_starter,
      photoUrl: mp.photo_url || undefined,
      playingTimeSeconds: mp.playing_time_seconds || 0,
      player_id: mp.player_id || null,
    }));

    return { actions, players };
  }
}
