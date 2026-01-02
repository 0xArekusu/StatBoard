/**
 * Stats Calculator Utility
 *
 * Common utilities for calculating basketball statistics
 */

/**
 * Calculate player efficiency (EFF) using the standard formula:
 * EFF = (Points + Rebounds + Assists + Steals + Blocks)
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
}): number {
  const fieldGoalsMissed = (stats.fg2a - stats.fg2m) + (stats.fg3a - stats.fg3m);
  const freeThrowsMissed = stats.fta - stats.ftm;

  const efficiency =
    stats.pts +
    stats.reb +
    stats.ast +
    stats.stl +
    stats.blk -
    (fieldGoalsMissed + freeThrowsMissed + stats.to);

  return efficiency;
}
