/**
 * Stats Calculator Utility
 *
 * Common utilities for calculating basketball statistics
 */

import { ActionType, SubstitutionSpecification, ShotSpecification } from "../models/ActionTypes";

/**
 * Calculate player efficiency (EVAL) using the standard formula:
 * EVAL = (Points + Rebounds + Assists + Steals + Blocks + Fouls Drawn)
 *       - (Field Goals Missed + Free Throws Missed + Turnovers)
 *
 * @param stats Player statistics
 * @returns Efficiency rating
 */
export function calculateEfficiency(stats: {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fg2a: number;
  fg2m: number;
  fg3a: number;
  fg3m: number;
  fta: number;
  ftm: number;
  to: number;
  fd?: number;
}): number {
  const fieldGoalsMissed = stats.fg2a - stats.fg2m + (stats.fg3a - stats.fg3m);
  const freeThrowsMissed = stats.fta - stats.ftm;

  const efficiency =
    stats.pts +
    stats.reb +
    stats.ast +
    stats.stl +
    stats.blk +
    (stats.fd || 0) -
    (fieldGoalsMissed + freeThrowsMissed + stats.to);

  return efficiency;
}

/**
 * Calculate player efficiency from database stats structure
 * Handles the naming differences between DB and app structures
 *
 * @param stats Player statistics from database
 * @returns Efficiency rating
 */
/**
 * Calculate +/- (plus/minus) for all players in a match.
 *
 * Returns a Map with key "team-playerNumber" → plusMinus value.
 *
 * Algorithm:
 * - Start with starters on court (is_starter = true)
 * - Process actions chronologically: substitution events update the lineup,
 *   made-shot events add/subtract points from all players currently on court.
 */
export function calculatePlusMinus(
  actions: { action_type?: string; type?: string; specification: string; points?: number; team: string; player_number?: number; player?: number; period_number: number; time_in_period: number; action_order?: number }[],
  players: { player_number: number; team: "MyTeam" | "Opponent"; is_starter: boolean }[]
): Map<string, number> {
  const pmMap = new Map<string, number>();

  // Initialize +/- to 0 for all players
  for (const p of players) {
    pmMap.set(`${p.team}-${p.player_number}`, 0);
  }

  // Track who is on court per team (Set of player_number)
  const onCourt: Record<"MyTeam" | "Opponent", Set<number>> = {
    MyTeam: new Set(players.filter(p => p.team === "MyTeam" && p.is_starter).map(p => p.player_number)),
    Opponent: new Set(players.filter(p => p.team === "Opponent" && p.is_starter).map(p => p.player_number)),
  };

  // Sort all actions chronologically
  const sorted = [...actions].sort((a, b) => {
    if (a.period_number !== b.period_number) return a.period_number - b.period_number;
    if (a.time_in_period !== b.time_in_period) return a.time_in_period - b.time_in_period;
    return (a.action_order ?? 0) - (b.action_order ?? 0);
  });

  for (const action of sorted) {
    const type = ((action.action_type || action.type) ?? "").toLowerCase();
    const spec = (action.specification ?? "").toLowerCase();
    const team = action.team as "MyTeam" | "Opponent";
    const playerNum = action.player_number ?? action.player ?? 0;

    if (type === ActionType.SUBSTITUTION) {
      if (spec === SubstitutionSpecification.OUT) {
        onCourt[team]?.delete(playerNum);
      } else if (spec === SubstitutionSpecification.IN) {
        onCourt[team]?.add(playerNum);
      }
      continue;
    }

    if (type === ActionType.SHOT && spec === ShotSpecification.MADE) {
      const pts = action.points || 0;
      if (pts === 0) continue;

      const scoringTeam: "MyTeam" | "Opponent" = team;
      const concedingTeam: "MyTeam" | "Opponent" = team === "MyTeam" ? "Opponent" : "MyTeam";

      for (const num of onCourt[scoringTeam]) {
        const key = `${scoringTeam}-${num}`;
        pmMap.set(key, (pmMap.get(key) || 0) + pts);
      }
      for (const num of onCourt[concedingTeam]) {
        const key = `${concedingTeam}-${num}`;
        pmMap.set(key, (pmMap.get(key) || 0) - pts);
      }
    }
  }

  return pmMap;
}

export function calculateEfficiencyFromDB(stats: {
  points: number;
  orb: number;
  drb: number;
  ast: number;
  stl: number;
  blk: number;
  twopa: number;
  twopm: number;
  threepa: number;
  threepm: number;
  fta: number;
  ftm: number;
  tov: number;
  fd?: number;
}): number {
  return calculateEfficiency({
    pts: stats.points,
    reb: stats.orb + stats.drb,
    ast: stats.ast,
    stl: stats.stl,
    blk: stats.blk,
    fg2a: stats.twopa,
    fg2m: stats.twopm,
    fg3a: stats.threepa,
    fg3m: stats.threepm,
    fta: stats.fta,
    ftm: stats.ftm,
    to: stats.tov,
    fd: stats.fd || 0,
  });
}
