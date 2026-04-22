/**
 * Action Chain Rules
 *
 * Defines which actions trigger a "next action" suggestion after being finalized.
 * Implemented chains: missed shot → rebound, made shot (2/3pts) → assist.
 * Further chains (foul drawn, turnover) will be added incrementally.
 */

import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
} from "../src/models/ActionTypes";
import {
  TeamId,
  MatchEvent,
  ChainContext,
  ChainSuggestion,
} from "../constants/liveMatchConstants";

/**
 * Given a finalized event, returns a ChainContext if a follow-up action
 * should be suggested, or null if the workflow should simply close.
 */
export function getChainContext(
  event: MatchEvent,
  trackOpponentStats: boolean,
  myTeamId: TeamId,
  myTeamName: string,
  opponentName: string,
  fromChainActionType?: string,
): ChainContext | null {
  const opponentTeamId =
    myTeamId === TeamId.HOME ? TeamId.AWAY : TeamId.HOME;

  // ── Missed shot → Rebound ─────────────────────────────────────────────────
  if (
    event.action_type === ActionType.SHOT &&
    event.specification === ShotSpecification.MISSED
  ) {
    const playerLabel = event.playerNumber
      ? `#${event.playerNumber}`
      : "player";
    const isMyTeam = event.teamId === myTeamId;

    const suggestions: ChainSuggestion[] = [];

    if (isMyTeam) {
      // My team missed → defensive rebound (opponent) first, then offensive
      if (trackOpponentStats) {
        suggestions.push({
          label: "Reb. Défensif",
          action_type: ActionType.REBOUND,
          specification: ReboundSpecification.DEFENSIVE,
          teamTab: opponentTeamId,
          teamLabel: opponentName,
        });
      }
      suggestions.push({
        label: "Reb. Offensif",
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.OFFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
    } else {
      // Opponent missed → defensive rebound (my team) first, then offensive
      suggestions.push({
        label: "Reb. Défensif",
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.DEFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
      if (trackOpponentStats) {
        suggestions.push({
          label: "Reb. Offensif",
          action_type: ActionType.REBOUND,
          specification: ReboundSpecification.OFFENSIVE,
          teamTab: opponentTeamId,
          teamLabel: opponentName,
        });
      }
    }

    return {
      triggerDescription: `Tir raté — ${playerLabel}`,
      suggestions,
      inheritCoords: event.coordinates,
    };
  }

  // ── Made shot (2 or 3pts) → Assist ────────────────────────────────────────
  if (
    event.action_type === ActionType.SHOT &&
    event.specification === ShotSpecification.MADE &&
    event.points !== undefined &&
    event.points >= 2
  ) {
    const isMyTeam = event.teamId === myTeamId;

    // Opponent scored but opponent stats not tracked → no suggestion
    if (!isMyTeam && !trackOpponentStats) return null;

    const teamTab = event.teamId as TeamId;
    const teamLabel = isMyTeam ? myTeamName : opponentName;
    const playerLabel = event.playerNumber ? `#${event.playerNumber}` : "player";

    return {
      triggerDescription: `Panier — ${playerLabel} (${event.points} pts)`,
      suggestions: [
        {
          label: "Passe décisive",
          action_type: ActionType.ASSIST,
          specification: undefined,
          teamTab,
          teamLabel,
          excludePlayerIds: event.playerId ? [event.playerId] : [],
        },
      ],
      inheritCoords: event.coordinates,
    };
  }

  // ── Turnover → Steal ──────────────────────────────────────────────────────
  if (event.action_type === ActionType.TURNOVER) {
    // Break cycle: don't suggest steal if this turnover was already chained from a steal
    if (fromChainActionType === ActionType.STEAL) return null;

    const isMyTeam = event.teamId === myTeamId;

    // My team turned it over but opponent stats not tracked → no suggestion
    if (isMyTeam && !trackOpponentStats) return null;

    const stealTeamTab = isMyTeam ? opponentTeamId : myTeamId;
    const stealTeamLabel = isMyTeam ? opponentName : myTeamName;
    const playerLabel = event.playerNumber ? `#${event.playerNumber}` : "player";

    return {
      triggerDescription: `Balle perdue — ${playerLabel}`,
      triggerActionType: ActionType.TURNOVER,
      suggestions: [
        {
          label: "Interception",
          action_type: ActionType.STEAL,
          specification: undefined,
          teamTab: stealTeamTab,
          teamLabel: stealTeamLabel,
        },
      ],
      inheritCoords: event.coordinates,
    };
  }

  // ── Steal → Turnover ──────────────────────────────────────────────────────
  if (event.action_type === ActionType.STEAL) {
    // Break cycle: don't suggest turnover if this steal was already chained from a turnover
    if (fromChainActionType === ActionType.TURNOVER) return null;

    const isMyTeam = event.teamId === myTeamId;

    // Opponent stole but opponent stats not tracked → no suggestion
    if (!isMyTeam && !trackOpponentStats) return null;

    const turnoverTeamTab = isMyTeam ? opponentTeamId : myTeamId;
    const turnoverTeamLabel = isMyTeam ? opponentName : myTeamName;
    const playerLabel = event.playerNumber ? `#${event.playerNumber}` : "player";

    return {
      triggerDescription: `Interception — ${playerLabel}`,
      triggerActionType: ActionType.STEAL,
      suggestions: [
        {
          label: "Balle perdue",
          action_type: ActionType.TURNOVER,
          specification: undefined,
          teamTab: turnoverTeamTab,
          teamLabel: turnoverTeamLabel,
        },
      ],
      inheritCoords: event.coordinates,
    };
  }

  // ── Block → Rebound ───────────────────────────────────────────────────────
  if (event.action_type === ActionType.BLOCK) {
    const playerLabel = event.playerNumber
      ? `#${event.playerNumber}`
      : "player";
    const isMyTeam = event.teamId === myTeamId;

    const suggestions: ChainSuggestion[] = [];

    if (isMyTeam) {
      // My team blocked → defensive rebound (my team) first, then offensive (opponent)
      suggestions.push({
        label: "Reb. Défensif",
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.DEFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
      if (trackOpponentStats) {
        suggestions.push({
          label: "Reb. Offensif",
          action_type: ActionType.REBOUND,
          specification: ReboundSpecification.OFFENSIVE,
          teamTab: opponentTeamId,
          teamLabel: opponentName,
        });
      }
    } else {
      // Opponent blocked → defensive rebound (opponent) first, then offensive (my team)
      if (trackOpponentStats) {
        suggestions.push({
          label: "Reb. Défensif",
          action_type: ActionType.REBOUND,
          specification: ReboundSpecification.DEFENSIVE,
          teamTab: opponentTeamId,
          teamLabel: opponentName,
        });
      }
      suggestions.push({
        label: "Reb. Offensif",
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.OFFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
    }

    return {
      triggerDescription: `Contre — ${playerLabel}`,
      suggestions,
      inheritCoords: event.coordinates,
    };
  }

  return null;
}
