/**
 * Match Data Converters
 *
 * Utilities for converting between database action format and UI event format
 */

import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
} from "../src/models/ActionTypes";
import { Team } from "../src/models/types";
import { EventType, MatchEvent, TeamId } from "../constants/liveMatchConstants";
import { getActionDescription } from "./liveMatchHelpers";

interface DatabaseAction {
  id: number;
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
 * Maps database action type and specification to UI EventType
 */
export function mapActionToEventType(
  actionType: string,
  specification?: string,
  points?: number
): { eventType: EventType; eventValue: number } {
  let eventType: EventType = EventType.POINT;
  let eventValue = points || 0;

  if (actionType === ActionType.SHOT) {
    const isMade =
      specification === ShotSpecification.MADE ||
      specification?.toLowerCase() === ShotSpecification.MADE.toLowerCase();
    const shotPoints = points || 0;

    if (isMade) {
      // Tirs réussis
      if (shotPoints === 3) {
        eventType = EventType.POINT_3;
        eventValue = 3;
      } else if (shotPoints === 2) {
        eventType = EventType.POINT_2;
        eventValue = 2;
      } else if (shotPoints === 1) {
        eventType = EventType.POINT_1;
        eventValue = 1;
      }
    } else {
      // Tirs ratés
      if (shotPoints === 3) {
        eventType = EventType.MISS_3;
        eventValue = 0;
      } else if (shotPoints === 2) {
        eventType = EventType.MISS_2;
        eventValue = 0;
      } else if (shotPoints === 1) {
        eventType = EventType.MISS_1;
        eventValue = 0;
      }
    }

    // Support legacy format for backwards compatibility
    const specUpper = specification?.toUpperCase();
    if (specUpper === "THREE_POINT_MADE") {
      eventType = EventType.POINT_3;
      eventValue = 3;
    } else if (specUpper === "TWO_POINT_MADE") {
      eventType = EventType.POINT_2;
      eventValue = 2;
    } else if (specUpper === "FREE_THROW_MADE") {
      eventType = EventType.POINT_1;
      eventValue = 1;
    } else if (specUpper === "THREE_POINT_MISSED") {
      eventType = EventType.MISS_3;
      eventValue = 0;
    } else if (specUpper === "TWO_POINT_MISSED") {
      eventType = EventType.MISS_2;
      eventValue = 0;
    } else if (specUpper === "FREE_THROW_MISSED") {
      eventType = EventType.MISS_1;
      eventValue = 0;
    }
  } else if (actionType === ActionType.FOUL) {
    eventType = EventType.FOUL;
  } else if (actionType === ActionType.REBOUND) {
    const reboundSpecUpper = specification?.toUpperCase();
    if (reboundSpecUpper === ReboundSpecification.DEFENSIVE.toUpperCase()) {
      eventType = EventType.REBOUND_DEF;
    } else if (
      reboundSpecUpper === ReboundSpecification.OFFENSIVE.toUpperCase()
    ) {
      eventType = EventType.REBOUND_OFF;
    }
  } else if (actionType === ActionType.ASSIST) {
    eventType = EventType.ASSIST;
  } else if (actionType === ActionType.STEAL) {
    eventType = EventType.STEAL;
  } else if (actionType === ActionType.BLOCK) {
    eventType = EventType.BLOCK;
  } else if (actionType === ActionType.TURNOVER) {
    eventType = EventType.TURNOVER;
  }

  return { eventType, eventValue };
}

/**
 * Converts a database action to a MatchEvent for UI display
 */
export function convertActionToMatchEvent(
  action: DatabaseAction,
  players: DatabasePlayer[],
  opponentName: string = "Adversaire"
): MatchEvent {
  const player = players.find(
    (p) =>
      p.player_number === action.player_number && p.team === action.team
  );

  const { eventType, eventValue } = mapActionToEventType(
    action.action_type,
    action.specification,
    action.points
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
    id: `evt-${action.id}`,
    type: eventType,
    value: eventValue,
    timestamp,
    playerId: player?.player_id || `temp-${action.player_number}`,
    teamId: action.team === Team.MY_TEAM ? TeamId.HOME : TeamId.AWAY,
    coordinates:
      action.semantic_x !== null && action.semantic_y !== null
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
  opponentName: string = "Adversaire"
): MatchEvent[] {
  return actions.map((action) =>
    convertActionToMatchEvent(action, players, opponentName)
  );
}

/**
 * Calculates scores from actions (only counting MADE shots)
 */
export function calculateScoresFromActions(
  actions: DatabaseAction[]
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
      if (action.team === Team.MY_TEAM) {
        scoreHome += action.points;
      } else {
        scoreAway += action.points;
      }
    }
  });

  return { scoreHome, scoreAway };
}
