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
  const isGenericOpponent = playerNumber === 9999 && action.team === Team.OPPONENT;
  const prefix =
    isGenericOpponent || playerNumber === undefined || playerNumber === null
      ? `${playerName} — `
      : `#${playerNumber} ${playerName} — `;

  if (action.action_type === ActionType.SHOT) {
    const isMade =
      action.specification === ShotSpecification.MADE ||
      action.specification === "MADE" ||
      action.specification === "made";
    const points = action.points || 0;

    if (isMade) {
      if (points === 3) return `${prefix}Tir (+3)`;
      if (points === 2) return `${prefix}Tir (+2)`;
      if (points === 1) return `${prefix}LF (+1)`;
    } else {
      if (points === 3) return `${prefix}Tir raté (3pts)`;
      if (points === 2) return `${prefix}Tir raté (2pts)`;
      if (points === 1) return `${prefix}LF raté`;
    }

  } else if (action.action_type === ActionType.REBOUND) {
    if (
      action.specification === ReboundSpecification.DEFENSIVE ||
      action.specification === "DEFENSIVE"
    )
      return `${prefix}Rebond défensif`;
    if (
      action.specification === ReboundSpecification.OFFENSIVE ||
      action.specification === "OFFENSIVE"
    )
      return `${prefix}Rebond offensif`;
    if (
      action.specification === ReboundSpecification.TEAM ||
      action.specification === "TEAM"
    )
      return `Équipe — Rebond`;
  } else if (action.action_type === ActionType.FOUL) {
    return `${prefix}Faute`;
  } else if (action.action_type === ActionType.FOUL_DRAWN) {
    return `${prefix}Faute provoquée`;
  } else if (action.action_type === ActionType.ASSIST) {
    return `${prefix}Passe décisive`;
  } else if (action.action_type === ActionType.STEAL) {
    return `${prefix}Interception`;
  } else if (action.action_type === ActionType.BLOCK) {
    return `${prefix}Contre`;
  } else if (action.action_type === ActionType.TURNOVER) {
    return `${prefix}Perte de balle`;
  }
  return `${prefix}${action.action_type}`;
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
