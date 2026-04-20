/**
 * Action Chain Rules
 *
 * Defines which actions trigger a "next action" suggestion after being finalized.
 * Only the first step (tir raté → rebond) is implemented here.
 * Further chains (assist, foul drawn, turnover) will be added incrementally.
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

  // ── Tir raté → Rebond ──────────────────────────────────────────────────────
  if (
    event.action_type === ActionType.SHOT &&
    event.specification === ShotSpecification.MISSED
  ) {
    const playerLabel = event.playerNumber
      ? `#${event.playerNumber}`
      : "joueur";
    const isMyTeam = event.teamId === myTeamId;

    const suggestions: ChainSuggestion[] = [];

    if (isMyTeam) {
      // Mon équipe a raté → Reb. Défensif (adverse) en premier, puis Offensif
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
      // Adversaire a raté → Reb. Défensif (mon équipe) en premier, puis Offensif
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

  return null;
}