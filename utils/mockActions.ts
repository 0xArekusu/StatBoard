/**
 * Mock Actions Generator
 *
 * Utility to generate realistic test actions for load testing.
 * Generates 100 actions with random but realistic distributions:
 * - 60% shots (with realistic success rates)
 * - 25% rebounds
 * - 15% fouls
 *
 * Usage:
 * import { generateMockActions } from './utils/mockActions';
 *
 * const mockActions = generateMockActions(
 *   matchId,
 *   teamPlayers,
 *   currentPeriod,
 *   periodDuration
 * );
 */

interface MockPlayer {
  jersey_number: number;
  name: string;
}

interface MockAction {
  match_id: number;
  team: "A" | "B";
  player_number: number;
  action_type: string;
  specification: string;
  points?: number;
  semantic_x: number;
  semantic_y: number;
  action_order: number;
  period_number: number;
  time_in_period: number;
}

/**
 * Generate 100 mock actions for load testing
 *
 * @param matchId - ID of the current match
 * @param players - Array of team players with jersey numbers
 * @param currentPeriod - Current period number (1-4 for quarters, 1-2 for halves)
 * @param periodDuration - Duration of period in seconds
 * @returns Array of 100 mock actions
 */
export function generateMockActions(
  matchId: number,
  players: MockPlayer[],
  currentPeriod: number = 1,
  periodDuration: number = 600
): MockAction[] {
  const actions: MockAction[] = [];
  const jerseyNumbers = players.map(p => p.jersey_number);

  // Action distributions (realistic basketball game)
  const distributions = {
    shot: 0.60,      // 60% shots
    rebound: 0.25,   // 25% rebounds
    foul: 0.15       // 15% fouls
  };

  // Shot distributions
  const shotDistributions = {
    twoPoint: 0.60,   // 60% 2-point attempts
    threePoint: 0.30, // 30% 3-point attempts
    freeThrow: 0.10   // 10% free throws
  };

  // Shot success rates (realistic)
  const successRates = {
    1: 0.75,  // 75% free throw success
    2: 0.45,  // 45% 2-point success
    3: 0.35   // 35% 3-point success
  };

  for (let i = 0; i < 100; i++) {
    const actionOrder = i + 1;

    // Random time in period (spread throughout period)
    const timeInPeriod = Math.floor(Math.random() * periodDuration);

    // Random player
    const playerNumber = jerseyNumbers[Math.floor(Math.random() * jerseyNumbers.length)];

    // Random position on court (normalized 0-1)
    const semantic_x = Math.random();
    const semantic_y = Math.random();

    // Determine action type based on distribution
    const rand = Math.random();
    let actionType: string;
    let specification: string;
    let points: number | undefined;

    if (rand < distributions.shot) {
      // SHOT ACTION
      actionType = "tir";

      // Determine shot type
      const shotRand = Math.random();
      if (shotRand < shotDistributions.freeThrow) {
        points = 1;
      } else if (shotRand < shotDistributions.freeThrow + shotDistributions.twoPoint) {
        points = 2;
      } else {
        points = 3;
      }

      // Determine if made or missed based on success rate
      const successRoll = Math.random();
      specification = successRoll < successRates[points] ? "reussi" : "rate";

    } else if (rand < distributions.shot + distributions.rebound) {
      // REBOUND ACTION
      actionType = "rebond";
      // 60% defensive, 40% offensive
      specification = Math.random() < 0.6 ? "defensif" : "offensif";

    } else {
      // FOUL ACTION
      actionType = "faute";
      // 70% personal, 20% offensive, 10% technical
      const foulRand = Math.random();
      if (foulRand < 0.7) {
        specification = "personnelle";
      } else if (foulRand < 0.9) {
        specification = "offensive";
      } else {
        specification = "technique";
      }
    }

    actions.push({
      match_id: matchId,
      team: "A",
      player_number: playerNumber,
      action_type: actionType,
      specification: specification,
      points: points,
      semantic_x: semantic_x,
      semantic_y: semantic_y,
      action_order: actionOrder,
      period_number: currentPeriod,
      time_in_period: timeInPeriod,
    });
  }

  // Sort by time_in_period for realistic chronological order
  actions.sort((a, b) => a.time_in_period - b.time_in_period);

  // Re-assign action_order after sorting
  actions.forEach((action, index) => {
    action.action_order = index + 1;
  });

  return actions;
}

/**
 * Get summary statistics of generated actions
 * Useful for logging/debugging
 */
export function getMockActionsSummary(actions: MockAction[]) {
  const summary = {
    total: actions.length,
    shots: actions.filter(a => a.action_type === "tir").length,
    shotsMade: actions.filter(a => a.action_type === "tir" && a.specification === "reussi").length,
    shotsMissed: actions.filter(a => a.action_type === "tir" && a.specification === "rate").length,
    rebounds: actions.filter(a => a.action_type === "rebond").length,
    reboundsOffensive: actions.filter(a => a.action_type === "rebond" && a.specification === "offensif").length,
    reboundsDefensive: actions.filter(a => a.action_type === "rebond" && a.specification === "defensif").length,
    fouls: actions.filter(a => a.action_type === "faute").length,
    freeThrows: actions.filter(a => a.points === 1).length,
    twoPointers: actions.filter(a => a.points === 2).length,
    threePointers: actions.filter(a => a.points === 3).length,
    totalPoints: actions.reduce((sum, a) => {
      if (a.action_type === "tir" && a.specification === "reussi" && a.points) {
        return sum + a.points;
      }
      return sum;
    }, 0),
  };

  return summary;
}
