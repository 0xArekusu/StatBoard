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

  return null;
}
