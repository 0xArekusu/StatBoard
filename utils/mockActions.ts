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
 * import { generateMockActions, MOCK_ROSTER, MOCK_OPPONENT_ROSTER } from './utils/mockActions';
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
import { Team } from "../src/models/types";
import { Player } from "../models/Player";

// Specifications for new action types (no specifications needed, just the action itself)
const NO_SPECIFICATION = "none";

// ===========================
// MOCK ROSTERS
// ===========================

/**
 * Mock roster for testing - Home team
 */
export const MOCK_ROSTER: Player[] = [
  {
    id: "p1",
    name: "T. Parker",
    jerseyNumber: 9,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p2",
    name: "B. Diaw",
    jerseyNumber: 13,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p3",
    name: "N. Batum",
    jerseyNumber: 5,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p4",
    name: "R. Gobert",
    jerseyNumber: 27,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p5",
    name: "E. Fournier",
    jerseyNumber: 10,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Mock roster for testing - Opponent team
 */
export const MOCK_OPPONENT_ROSTER: Player[] = [
  {
    id: "adv1",
    name: "Joueur 1",
    jerseyNumber: 4,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv2",
    name: "Joueur 2",
    jerseyNumber: 7,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv3",
    name: "Joueur 3",
    jerseyNumber: 11,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv4",
    name: "Joueur 4",
    jerseyNumber: 15,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv5",
    name: "Joueur 5",
    jerseyNumber: 23,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

interface MockPlayer {
  jersey_number: number;
  name: string;
}

interface MockAction {
  match_id: string;
  team: Team;
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
 * Generate mock actions for load testing
 *
 * @param matchId - ID of the current match
 * @param playersMyTeam - Array of my team players with jersey numbers
 * @param playersOpponent - Array of opponent team players with jersey numbers (optional, enables detailed opponent stats)
 * @param matchFormat - "2_halves" or "4_quarters"
 * @param periodDuration - Duration of period in seconds
 * @param actionsPerPeriod - Number of actions to generate per period (default: 25)
 * @returns Array of mock actions spread across all periods
 */
export function generateMockActions(
  matchId: string,
  playersMyTeam: MockPlayer[],
  playersOpponent?: MockPlayer[],
  matchFormat: "2_halves" | "4_quarters" = "4_quarters",
  periodDuration: number = 600,
  actionsPerPeriod: number = 25,
): MockAction[] {
  const actions: MockAction[] = [];
  const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
  const trackOpponentStats = !!playersOpponent;

  const jerseyNumbersMyTeam = playersMyTeam.map((p) => p.jersey_number);
  const jerseyNumbersOpponent =
    playersOpponent && Array.isArray(playersOpponent)
      ? playersOpponent.map((p) => p.jersey_number)
      : [];

  // Action distributions (realistic basketball game)
  const distributions = {
    shot: 0.7, // 70% shots
    rebound: 0.12, // 12% rebounds
    foul: 0.06, // 6% fouls
    assist: 0.05, // 5% assists
    steal: 0.03, // 3% steals
    block: 0.02, // 2% blocks
    turnover: 0.02, // 2% turnovers
  };

  // Shot distributions
  const shotDistributions = {
    twoPoint: 0.6, // 60% 2-point attempts
    threePoint: 0.3, // 30% 3-point attempts
    freeThrow: 0.1, // 10% free throws
  };

  // Shot success rates (realistic)
  const successRates = {
    1: 0.75, // 75% free throw success
    2: 0.45, // 45% 2-point success
    3: 0.35, // 35% 3-point success
  };

  let globalActionOrder = 1;

  // Generate actions for each period
  for (let period = 1; period <= totalPeriods; period++) {
    // Generate actions for this period
    for (let i = 0; i < actionsPerPeriod; i++) {
      // Progressive time in period (actions spread chronologically)
      // Add some randomness to avoid perfect spacing
      const baseTime = (i / actionsPerPeriod) * periodDuration;
      const randomOffset =
        (Math.random() - 0.5) * (periodDuration / actionsPerPeriod);
      const timeInPeriod = Math.max(
        0,
        Math.min(periodDuration, baseTime + randomOffset),
      );

      // Determine which team this action is for
      // If tracking opponent stats, alternate between both teams (50/50)
      // If not tracking, generate more MY_TEAM actions to balance scores (since opponent only gets made shots)
      const opponentProbability = trackOpponentStats ? 0.5 : 0.3; // 30% for opponent when not tracking (vs 50% when tracking)
      const team: Team =
        Math.random() < opponentProbability ? Team.OPPONENT : Team.MY_TEAM;

      let playerNumber: number;
      if (team === Team.MY_TEAM) {
        const jerseyNumbers = jerseyNumbersMyTeam;
        playerNumber =
          jerseyNumbers[Math.floor(Math.random() * jerseyNumbers.length)];
      } else {
        // For opponent, use a dummy player number if we don't track opponent stats
        if (trackOpponentStats) {
          const jerseyNumbers = jerseyNumbersOpponent;
          playerNumber =
            jerseyNumbers[Math.floor(Math.random() * jerseyNumbers.length)];
        } else {
          // Use generic player number 9999 for opponent when not tracking stats (same as +1/+2/+3 buttons)
          playerNumber = 9999;
        }
      }

      // Determine action type based on distribution
      const rand = Math.random();
      let actionType: string;
      let specification: string;
      let points: number | undefined;
      let semantic_x: number;
      let semantic_y: number;

      // If this is an opponent action and we don't track opponent stats, generate simple point actions only
      if (team === Team.OPPONENT && !trackOpponentStats) {
        // Generate only simple point actions for opponent (like +1, +2, +3 buttons)
        actionType = ActionType.SHOT;
        specification = ShotSpecification.MADE;

        // Randomly choose 1, 2, or 3 points with realistic distribution
        const pointRand = Math.random();
        if (pointRand < 0.1) {
          points = 1; // 10% free throws
        } else if (pointRand < 0.7) {
          points = 2; // 60% 2-pointers
        } else {
          points = 3; // 30% 3-pointers
        }

        // No court position (like quick score buttons)
        semantic_x = -999;
        semantic_y = -999;
      } else if (rand < distributions.shot) {
        // SHOT ACTION
        actionType = ActionType.SHOT;

        // Determine shot type
        const shotRand = Math.random();

        if (shotRand < shotDistributions.freeThrow) {
          points = 1; // Free throw
          // Lancers francs : près du panier, centrés
          semantic_x = 0.45 + Math.random() * 0.1; // 0.45-0.55 (centré)
          semantic_y = 0.15 + Math.random() * 0.1; // 0.15-0.25 (près du panier)
        } else if (
          shotRand <
          shotDistributions.freeThrow + shotDistributions.twoPoint
        ) {
          points = 2; // 2-pointer
          // 2-points : zone intérieure (raquette + mid-range)
          semantic_x = 0.2 + Math.random() * 0.6; // 0.2-0.8 (largeur)
          semantic_y = 0.1 + Math.random() * 0.4; // 0.1-0.5 (proche-moyen)
        } else {
          points = 3; // 3-pointer
          // 3-points : arc périphérique
          const angle = Math.random() * Math.PI; // 0 à π (demi-cercle)
          const radius = 0.35 + Math.random() * 0.15; // Distance variable
          semantic_x = 0.5 + radius * Math.cos(angle);
          semantic_y = 0.2 + radius * Math.sin(angle);
          // Clamp pour rester dans le terrain
          semantic_x = Math.max(0.05, Math.min(0.95, semantic_x));
          semantic_y = Math.max(0.05, Math.min(0.95, semantic_y));
        }

        // Determine if made or missed based on success rate
        const successRoll = Math.random();
        const successRate = successRates[points as keyof typeof successRates];
        specification =
          successRoll < successRate
            ? ShotSpecification.MADE
            : ShotSpecification.MISSED;

        // Keep the points value even if missed (for statistics tracking)
        // The points field indicates the type of shot (1pt/2pt/3pt), not the points scored
      } else if (rand < distributions.shot + distributions.rebound) {
        // REBOUND ACTION
        actionType = ActionType.REBOUND;
        // 60% defensive, 40% offensive
        specification =
          Math.random() < 0.6
            ? ReboundSpecification.DEFENSIVE
            : ReboundSpecification.OFFENSIVE;

        // Rebonds : près du panier
        semantic_x = 0.3 + Math.random() * 0.4; // 0.3-0.7 (autour du panier)
        semantic_y = 0.05 + Math.random() * 0.25; // 0.05-0.3 (zone du panier)
      } else if (
        rand <
        distributions.shot + distributions.rebound + distributions.foul
      ) {
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

        // Fautes : partout sur le terrain
        semantic_x = 0.1 + Math.random() * 0.8;
        semantic_y = 0.1 + Math.random() * 0.8;
      } else if (
        rand <
        distributions.shot +
          distributions.rebound +
          distributions.foul +
          distributions.assist
      ) {
        // ASSIST ACTION
        actionType = ActionType.ASSIST;
        specification = NO_SPECIFICATION;

        // Passes : principalement zone médiane et offensive
        semantic_x = 0.2 + Math.random() * 0.6;
        semantic_y = 0.2 + Math.random() * 0.6;
      } else if (
        rand <
        distributions.shot +
          distributions.rebound +
          distributions.foul +
          distributions.assist +
          distributions.steal
      ) {
        // STEAL ACTION
        actionType = ActionType.STEAL;
        specification = NO_SPECIFICATION;

        // Interceptions : milieu de terrain
        semantic_x = 0.2 + Math.random() * 0.6;
        semantic_y = 0.3 + Math.random() * 0.4;
      } else if (
        rand <
        distributions.shot +
          distributions.rebound +
          distributions.foul +
          distributions.assist +
          distributions.steal +
          distributions.block
      ) {
        // BLOCK ACTION
        actionType = ActionType.BLOCK;
        specification = NO_SPECIFICATION;

        // Contres : près du panier défensif
        semantic_x = 0.3 + Math.random() * 0.4;
        semantic_y = 0.05 + Math.random() * 0.2;
      } else {
        // TURNOVER ACTION
        actionType = ActionType.TURNOVER;
        specification = NO_SPECIFICATION;

        // Pertes : partout
        semantic_x = 0.15 + Math.random() * 0.7;
        semantic_y = 0.2 + Math.random() * 0.6;
      }

      actions.push({
        match_id: matchId,
        team: team,
        player_number: playerNumber,
        action_type: actionType,
        specification: specification,
        points: points,
        semantic_x: semantic_x,
        semantic_y: semantic_y,
        action_order: globalActionOrder++,
        period_number: period,
        time_in_period: Math.floor(timeInPeriod),
      });
    }
  }

  // Sort by period, then by time_in_period for realistic chronological order
  actions.sort((a, b) => {
    if (a.period_number !== b.period_number) {
      return a.period_number - b.period_number;
    }
    return a.time_in_period - b.time_in_period;
  });

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
  const shots = actions.filter((a) => a.action_type === ActionType.SHOT);
  const rebounds = actions.filter((a) => a.action_type === ActionType.REBOUND);
  const fouls = actions.filter((a) => a.action_type === ActionType.FOUL);
  const assists = actions.filter((a) => a.action_type === ActionType.ASSIST);
  const steals = actions.filter((a) => a.action_type === ActionType.STEAL);
  const blocks = actions.filter((a) => a.action_type === ActionType.BLOCK);
  const turnovers = actions.filter(
    (a) => a.action_type === ActionType.TURNOVER,
  );

  const summary = {
    total: actions.length,
    shots: shots.length,
    shotsMade: shots.filter((a) => a.specification === ShotSpecification.MADE)
      .length,
    shotsMissed: shots.filter(
      (a) => a.specification === ShotSpecification.MISSED,
    ).length,
    rebounds: rebounds.length,
    reboundsOffensive: rebounds.filter(
      (a) => a.specification === ReboundSpecification.OFFENSIVE,
    ).length,
    reboundsDefensive: rebounds.filter(
      (a) => a.specification === ReboundSpecification.DEFENSIVE,
    ).length,
    fouls: fouls.length,
    assists: assists.length,
    steals: steals.length,
    blocks: blocks.length,
    turnovers: turnovers.length,
    freeThrows: shots.filter(
      (a) => a.points === 1 || (a.points === 0 && shots.indexOf(a) % 10 === 0),
    ).length,
    twoPointers: shots.filter((a) => a.points === 2).length,
    threePointers: shots.filter((a) => a.points === 3).length,
    totalPoints: shots.reduce((sum, a) => sum + (a.points || 0), 0),
  };

  return summary;
}
