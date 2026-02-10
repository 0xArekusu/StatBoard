/**
 * Stats Calculator Utility
 *
 * Common utilities for calculating basketball statistics
 */

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
