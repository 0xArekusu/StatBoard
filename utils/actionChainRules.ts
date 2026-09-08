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
import i18n from "../src/i18n";

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
      : i18n.t("actionChainRules.playerFallback");
    const isMyTeam = event.teamId === myTeamId;

    const suggestions: ChainSuggestion[] = [];

    if (isMyTeam) {
      // My team missed → defensive rebound (opponent) first, then offensive
      if (trackOpponentStats) {
        suggestions.push({
          label: i18n.t("actionChainRules.defensiveRebound"),
          action_type: ActionType.REBOUND,
          specification: ReboundSpecification.DEFENSIVE,
          teamTab: opponentTeamId,
          teamLabel: opponentName,
        });
      }
      suggestions.push({
        label: i18n.t("actionChainRules.offensiveRebound"),
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.OFFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
    } else {
      // Opponent missed → defensive rebound (my team) first, then offensive
      suggestions.push({
        label: i18n.t("actionChainRules.defensiveRebound"),
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.DEFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
      if (trackOpponentStats) {
        suggestions.push({
          label: i18n.t("actionChainRules.offensiveRebound"),
          action_type: ActionType.REBOUND,
          specification: ReboundSpecification.OFFENSIVE,
          teamTab: opponentTeamId,
          teamLabel: opponentName,
        });
      }
    }
    suggestions.push({
      label: i18n.t("actionChainRules.teamRebound"),
      action_type: ActionType.REBOUND,
      specification: ReboundSpecification.TEAM,
      teamTab: myTeamId,
      teamLabel: "",
      teamOnly: true,
      autoTeamId: !trackOpponentStats ? myTeamId : undefined,
    });

    return {
      triggerDescription: i18n.t("actionChainRules.missedShotTrigger", { player: playerLabel }),
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
    const playerLabel = event.playerNumber ? `#${event.playerNumber}` : i18n.t("actionChainRules.playerFallback");

    return {
      triggerDescription: i18n.t("actionChainRules.madeShotTrigger", { player: playerLabel, points: event.points }),
      suggestions: [
        {
          label: i18n.t("actionChainRules.assist"),
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
    const playerLabel = event.playerNumber ? `#${event.playerNumber}` : i18n.t("actionChainRules.playerFallback");

    return {
      triggerDescription: i18n.t("actionChainRules.turnoverTrigger", { player: playerLabel }),
      triggerActionType: ActionType.TURNOVER,
      suggestions: [
        {
          label: i18n.t("actionChainRules.steal"),
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

    // Turnover always goes to the other team — skip if opponent stats not tracked
    if (!trackOpponentStats) return null;

    const turnoverTeamTab = isMyTeam ? opponentTeamId : myTeamId;
    const turnoverTeamLabel = isMyTeam ? opponentName : myTeamName;
    const playerLabel = event.playerNumber ? `#${event.playerNumber}` : i18n.t("actionChainRules.playerFallback");

    return {
      triggerDescription: i18n.t("actionChainRules.stealTrigger", { player: playerLabel }),
      triggerActionType: ActionType.STEAL,
      suggestions: [
        {
          label: i18n.t("actionChainRules.turnover"),
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
      : i18n.t("actionChainRules.playerFallback");
    const isMyTeam = event.teamId === myTeamId;

    const suggestions: ChainSuggestion[] = [];

    if (isMyTeam) {
      // My team blocked → defensive rebound (my team) first, then offensive (opponent)
      suggestions.push({
        label: i18n.t("actionChainRules.defensiveRebound"),
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.DEFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
      if (trackOpponentStats) {
        suggestions.push({
          label: i18n.t("actionChainRules.offensiveRebound"),
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
          label: i18n.t("actionChainRules.defensiveRebound"),
          action_type: ActionType.REBOUND,
          specification: ReboundSpecification.DEFENSIVE,
          teamTab: opponentTeamId,
          teamLabel: opponentName,
        });
      }
      suggestions.push({
        label: i18n.t("actionChainRules.offensiveRebound"),
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.OFFENSIVE,
        teamTab: myTeamId,
        teamLabel: myTeamName,
      });
    }
    suggestions.push({
      label: i18n.t("actionChainRules.teamRebound"),
      action_type: ActionType.REBOUND,
      specification: ReboundSpecification.TEAM,
      teamTab: myTeamId,
      teamLabel: "",
      teamOnly: true,
      autoTeamId: !trackOpponentStats ? myTeamId : undefined,
    });

    return {
      triggerDescription: i18n.t("actionChainRules.blockTrigger", { player: playerLabel }),
      suggestions,
      inheritCoords: event.coordinates,
    };
  }

  return null;
}
