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

import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
} from "../src/models/ActionTypes";

// Specifications for new action types (no specifications needed, just the action itself)
const NO_SPECIFICATION = "none";

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
    shot: 0.50,      // 50% shots
    rebound: 0.20,   // 20% rebounds
    foul: 0.12,      // 12% fouls
    assist: 0.10,    // 10% assists
    steal: 0.04,     // 4% steals
    block: 0.02,     // 2% blocks
    turnover: 0.02   // 2% turnovers
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
      actionType = ActionType.SHOT;

      // Determine shot type
      const shotRand = Math.random();

      if (shotRand < shotDistributions.freeThrow) {
        points = 1; // Free throw
      } else if (shotRand < shotDistributions.freeThrow + shotDistributions.twoPoint) {
        points = 2; // 2-pointer
      } else {
        points = 3; // 3-pointer
      }

      // Determine if made or missed based on success rate
      const successRoll = Math.random();
      const successRate = successRates[points as keyof typeof successRates];
      specification = successRoll < successRate
        ? ShotSpecification.MADE
        : ShotSpecification.MISSED;

      // Keep the points value even if missed (for statistics tracking)
      // The points field indicates the type of shot (1pt/2pt/3pt), not the points scored

    } else if (rand < distributions.shot + distributions.rebound) {
      // REBOUND ACTION
      actionType = ActionType.REBOUND;
      // 60% defensive, 40% offensive
      specification = Math.random() < 0.6
        ? ReboundSpecification.DEFENSIVE
        : ReboundSpecification.OFFENSIVE;

    } else if (rand < distributions.shot + distributions.rebound + distributions.foul) {
      // FOUL ACTION
      actionType = ActionType.FOUL;
      // 50% personal, 30% technical, 15% penality, 5% disqualification
      const foulRand = Math.random();
      if (foulRand < 0.5) {
        specification = FoulSpecification.PERSONAL;
      } else if (foulRand < 0.8) {
        specification = FoulSpecification.TECHNICAL;
      } else if (foulRand < 0.95) {
        specification = FoulSpecification.PENALITY;
      } else {
        specification = FoulSpecification.DISQUALIFICATION;
      }

    } else if (rand < distributions.shot + distributions.rebound + distributions.foul + distributions.assist) {
      // ASSIST ACTION
      actionType = ActionType.ASSIST;
      specification = NO_SPECIFICATION;

    } else if (rand < distributions.shot + distributions.rebound + distributions.foul + distributions.assist + distributions.steal) {
      // STEAL ACTION
      actionType = ActionType.STEAL;
      specification = NO_SPECIFICATION;

    } else if (rand < distributions.shot + distributions.rebound + distributions.foul + distributions.assist + distributions.steal + distributions.block) {
      // BLOCK ACTION
      actionType = ActionType.BLOCK;
      specification = NO_SPECIFICATION;

    } else {
      // TURNOVER ACTION
      actionType = ActionType.TURNOVER;
      specification = NO_SPECIFICATION;
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
  const shots = actions.filter(a => a.action_type === ActionType.SHOT);
  const rebounds = actions.filter(a => a.action_type === ActionType.REBOUND);
  const fouls = actions.filter(a => a.action_type === ActionType.FOUL);
  const assists = actions.filter(a => a.action_type === ActionType.ASSIST);
  const steals = actions.filter(a => a.action_type === ActionType.STEAL);
  const blocks = actions.filter(a => a.action_type === ActionType.BLOCK);
  const turnovers = actions.filter(a => a.action_type === ActionType.TURNOVER);

  const summary = {
    total: actions.length,
    shots: shots.length,
    shotsMade: shots.filter(a => a.specification === ShotSpecification.MADE).length,
    shotsMissed: shots.filter(a => a.specification === ShotSpecification.MISSED).length,
    rebounds: rebounds.length,
    reboundsOffensive: rebounds.filter(a => a.specification === ReboundSpecification.OFFENSIVE).length,
    reboundsDefensive: rebounds.filter(a => a.specification === ReboundSpecification.DEFENSIVE).length,
    fouls: fouls.length,
    assists: assists.length,
    steals: steals.length,
    blocks: blocks.length,
    turnovers: turnovers.length,
    freeThrows: shots.filter(a => a.points === 1 || (a.points === 0 && shots.indexOf(a) % 10 === 0)).length,
    twoPointers: shots.filter(a => a.points === 2).length,
    threePointers: shots.filter(a => a.points === 3).length,
    totalPoints: shots.reduce((sum, a) => sum + (a.points || 0), 0),
  };

  return summary;
}
