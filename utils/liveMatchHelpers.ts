/**
 * Live Match Helpers
 *
 * Utility functions for LiveMatchScreen.
 */

import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
} from "../src/models/ActionTypes";
import { Team } from "../src/models/types";

/**
 * Format time in MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "10:25")
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Get human-readable action description for display
 * @param action - Action object from database
 * @param playerName - Name of the player who performed the action
 * @returns Human-readable description in French with player number prefix
 */
export const getActionDescription = (
  action: any,
  playerName: string,
): string => {
  const playerNumber = action.player_number;
  const prefix = playerNumber !== undefined && playerNumber !== null ? `${playerNumber} - ` : '';

  if (action.action_type === ActionType.SHOT) {
    const isMade =
      action.specification === ShotSpecification.MADE ||
      action.specification === "MADE" ||
      action.specification === "made";
    const points = action.points || 0;

    if (isMade) {
      // Use "+X" format for generic opponent (9999), "(+X)" for specific players
      const isGenericOpponent =
        action.player_number === 9999 && action.team === Team.OPPONENT;
      if (points === 3)
        return isGenericOpponent ? `${playerName} +3` : `${prefix}${playerName} (+3)`;
      if (points === 2)
        return isGenericOpponent ? `${playerName} +2` : `${prefix}${playerName} (+2)`;
      if (points === 1)
        return isGenericOpponent ? `${playerName} +1` : `${prefix}${playerName} (+1)`;
    } else {
      if (points === 3) return `${prefix}${playerName} Raté (3pts)`;
      if (points === 2) return `${prefix}${playerName} Raté (2pts)`;
      if (points === 1) return `${prefix}${playerName} Raté (LF)`;
    }

    // Support ancien format pour compatibilité
    if (action.specification === "THREE_POINT_MADE")
      return `${prefix}${playerName} (+3)`;
    if (action.specification === "TWO_POINT_MADE") return `${prefix}${playerName} (+2)`;
    if (action.specification === "FREE_THROW_MADE") return `${prefix}${playerName} (+1)`;
    if (action.specification === "THREE_POINT_MISSED")
      return `${prefix}${playerName} Raté (3pts)`;
    if (action.specification === "TWO_POINT_MISSED")
      return `${prefix}${playerName} Raté (2pts)`;
    if (action.specification === "FREE_THROW_MISSED")
      return `${prefix}${playerName} Raté (LF)`;
  } else if (action.action_type === ActionType.REBOUND) {
    if (
      action.specification === ReboundSpecification.DEFENSIVE ||
      action.specification === "DEFENSIVE"
    )
      return `${prefix}${playerName} Rebond Déf`;
    if (
      action.specification === ReboundSpecification.OFFENSIVE ||
      action.specification === "OFFENSIVE"
    )
      return `${prefix}${playerName} Rebond Off`;
  } else if (action.action_type === ActionType.FOUL) {
    return `${prefix}Faute ${playerName}`;
  } else if (action.action_type === ActionType.ASSIST) {
    return `${prefix}${playerName} Passe décisive`;
  } else if (action.action_type === ActionType.STEAL) {
    return `${prefix}${playerName} Interception`;
  } else if (action.action_type === ActionType.BLOCK) {
    return `${prefix}${playerName} Contre`;
  } else if (action.action_type === ActionType.TURNOVER) {
    return `${prefix}${playerName} Perte de balle`;
  }
  return `${prefix}${playerName} - ${action.action_type}`;
};

/**
 * Get event type description suffix for UI display
 * @deprecated Use getActionDescription from this file instead
 */

/**
 * Get period label based on period number and max periods
 * @param periodNumber - Current period number (1-based)
 * @param maxPeriods - Maximum number of regular periods (2 or 4)
 * @returns Period label (e.g., "Q1", "MT1", "OT1")
 */
export const getPeriodLabel = (
  periodNumber: number,
  maxPeriods: number = 4,
): string => {
  if (periodNumber <= maxPeriods) {
    return maxPeriods === 2 ? `MT${periodNumber}` : `Q${periodNumber}`;
  }
  return `OT${periodNumber - maxPeriods}`;
};
