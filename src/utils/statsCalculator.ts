/**
 * Stats Calculator Utility
 *
 * Common utilities for calculating basketball statistics
 */

import { ActionType, SubstitutionSpecification, ShotSpecification } from "../models/ActionTypes";

/**
 * Shooting counters mutated by {@link accumulateShot}.
 */
export interface ShotStats {
  pts: number;
  ftm: number;
  fta: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  fgm: number;
  fga: number;
}

/**
 * Apply a single SHOT action to a player's shooting counters.
 *
 * Free throws are tracked in ftm/fta ONLY: per the FIBA Statisticians Manual
 * (ch. 2 Field Goals vs ch. 3 Free Throws), a field goal excludes free throws,
 * so fgm/fga always equal the 2pt + 3pt totals. Counting a free throw in both
 * pairs is what inflated the season and match shooting lines.
 *
 * @param stats Counters to increment in place
 * @param points Point value of the shot (1 = free throw, 2, 3)
 * @param made Whether the shot was converted
 */
export function accumulateShot(
  stats: ShotStats,
  points: number | undefined,
  made: boolean
): void {
  if (points === 1) {
    stats.fta += 1;
    if (made) {
      stats.ftm += 1;
      stats.pts += 1;
    }
    return;
  }

  stats.fga += 1;
  if (points === 2) stats.fg2a += 1;
  else if (points === 3) stats.fg3a += 1;

  if (!made) return;

  stats.fgm += 1;
  stats.pts += points ?? 0;
  if (points === 2) stats.fg2m += 1;
  else if (points === 3) stats.fg3m += 1;
}

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
 * Whether a match actually recorded substitution events.
 *
 * +/- is only meaningful when the on-court lineup can be replayed. Without
 * substitution actions {@link calculatePlusMinus} keeps the starting five on
 * court for the whole game, so every starter ends up with the full team
 * differential and every substitute with 0.
 *
 * This is derived from the actions rather than read from matches.has_sub_tracking,
 * which is written as a constant at match creation and therefore says nothing
 * about whether substitutions were tracked. Deriving it also gives the right
 * answer for matches already archived.
 */
export function hasSubstitutionTracking(
  actions: { action_type?: string; type?: string }[]
): boolean {
  return actions.some(
    (a) => ((a.action_type || a.type) ?? "").toLowerCase() === ActionType.SUBSTITUTION
  );
}

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
