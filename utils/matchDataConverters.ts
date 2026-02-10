/**
 * Match Data Converters
 *
 * Utilities for converting between database action format and UI event format
 */

import { ShotSpecification } from "../src/models/ActionTypes";
import { Team } from "../src/models/types";
import { MatchEvent, TeamId } from "../constants/liveMatchConstants";
import { getActionDescription } from "./liveMatchHelpers";

interface DatabaseAction {
  id: string;
  player_number: number;
  team: Team.MY_TEAM | Team.OPPONENT;
  action_type: string;
  specification?: string;
  points?: number;
  semantic_x: number | null;
  semantic_y: number | null;
  timestamp?: string;
  period_number: number;
  time_in_period: number;
}

interface DatabasePlayer {
  player_id?: string | null;
  player_number: number;
  player_name: string;
  team: "MyTeam" | "Opponent";
}

/**
 * Converts a database action to a MatchEvent for UI display
 */
export function convertActionToMatchEvent(
  action: DatabaseAction,
  players: DatabasePlayer[],
  opponentName: string = "Adversaire",
  isHome: boolean = true
): MatchEvent {
  const player = players.find(
    (p) =>
      p.player_number === action.player_number && p.team === action.team
  );

  const playerName =
    action.player_number === 9999 && action.team === Team.OPPONENT
      ? opponentName
      : player?.player_name || `#${action.player_number}`;

  const description = getActionDescription(action, playerName);

  // Parse timestamp safely
  let timestamp = Date.now();
  if (action.timestamp) {
    const parsedDate = new Date(action.timestamp);
    if (!isNaN(parsedDate.getTime())) {
      timestamp = parsedDate.getTime();
    }
  }

  return {
    id: action.id,
    action_type: action.action_type,
    specification: action.specification,
    points: action.points,
    timestamp,
    playerId: player?.player_id || `temp-${action.player_number}`,
    playerNumber: action.player_number !== 9999 ? action.player_number : undefined,
    teamId: action.team === Team.MY_TEAM
      ? (isHome ? TeamId.HOME : TeamId.AWAY)
      : (isHome ? TeamId.AWAY : TeamId.HOME),
    coordinates:
      action.semantic_x !== null &&
      action.semantic_y !== null &&
      action.semantic_x >= 0 &&
      action.semantic_y >= 0
        ? { x: action.semantic_x, y: action.semantic_y }
        : undefined,
    description,
    period_number: action.period_number,
    time_in_period: action.time_in_period,
  };
}

/**
 * Converts multiple database actions to MatchEvents
 */
export function convertActionsToMatchEvents(
  actions: DatabaseAction[],
  players: DatabasePlayer[],
  opponentName: string = "Adversaire",
  isHome: boolean = true
): MatchEvent[] {
  return actions.map((action) =>
    convertActionToMatchEvent(action, players, opponentName, isHome)
  );
}

/**
 * Calculates scores from actions (only counting MADE shots)
 *
 * @param actions - Array of database actions
 * @param isHome - Whether my team is playing at home (true) or away (false)
 *                If not provided, defaults to true (assumes home game)
 * @returns Object with scoreHome and scoreAway
 */
export function calculateScoresFromActions(
  actions: DatabaseAction[],
  isHome: boolean = true
): { scoreHome: number; scoreAway: number } {
  let scoreHome = 0;
  let scoreAway = 0;

  actions.forEach((action) => {
    // Only count points for MADE shots (not missed ones)
    if (
      action.points &&
      action.points > 0 &&
      action.specification === ShotSpecification.MADE
    ) {
      // When at home: MyTeam -> scoreHome, Opponent -> scoreAway
      // When away: MyTeam -> scoreAway, Opponent -> scoreHome
      if (isHome) {
        if (action.team === Team.MY_TEAM) {
          scoreHome += action.points;
        } else {
          scoreAway += action.points;
        }
      } else {
        if (action.team === Team.MY_TEAM) {
          scoreAway += action.points;
        } else {
          scoreHome += action.points;
        }
      }
    }
  });

  return { scoreHome, scoreAway };
}
