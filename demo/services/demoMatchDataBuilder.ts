/**
 * Demo match data builder
 *
 * Builds the navigation payload the LiveMatch screen expects when a coach
 * starts a new match (same shape NewMatchScreen produces), from the static
 * demo configuration.
 */

import { RootStackParamList } from "../../types/navigation";
import {
  DEMO_MATCH_SETTINGS,
  DEMO_MY_TEAM_ROSTER,
  DEMO_OPPONENT_ROSTER,
  DEMO_PLAYER_ID_PREFIX,
  DemoRosterEntry,
} from "../constants/demoConstants";

export type DemoMatchData = NonNullable<RootStackParamList["LiveMatch"]["matchData"]>;
type DemoSerializedPlayer = DemoMatchData["myTeamPlayers"][number];

const toSerializedPlayers = (
  roster: readonly DemoRosterEntry[],
  idPrefix: string,
  createdAt: string,
): DemoSerializedPlayer[] =>
  roster.map((entry) => ({
    id: `${idPrefix}${entry.jerseyNumber}`,
    name: entry.name,
    jerseyNumber: entry.jerseyNumber,
    teamId: "",
    createdAt,
    updatedAt: createdAt,
  }));

const pickStarterIds = (players: DemoSerializedPlayer[]): string[] =>
  players.slice(0, DEMO_MATCH_SETTINGS.startersCount).map((player) => player.id);

/**
 * Returns the payload of a brand new demo match: 0-0, first period.
 */
export function buildDemoMatchData(now: Date): DemoMatchData {
  const createdAt = now.toISOString();
  const myTeamPlayers = toSerializedPlayers(
    DEMO_MY_TEAM_ROSTER,
    DEMO_PLAYER_ID_PREFIX.myTeam,
    createdAt,
  );
  const opponentPlayers = toSerializedPlayers(
    DEMO_OPPONENT_ROSTER,
    DEMO_PLAYER_ID_PREFIX.opponent,
    createdAt,
  );

  return {
    id: now.getTime().toString(),
    clubId: "",
    teamId: "",
    teamName: DEMO_MATCH_SETTINGS.myTeamName,
    opponent: DEMO_MATCH_SETTINGS.opponentName,
    isHome: DEMO_MATCH_SETTINGS.isHome,
    trackOpponentStats: DEMO_MATCH_SETTINGS.trackOpponentStats,
    periodCount: DEMO_MATCH_SETTINGS.periodCount,
    periodDuration: DEMO_MATCH_SETTINGS.periodDurationMinutes,
    myTeamPlayers,
    opponentPlayers,
    starters: pickStarterIds(myTeamPlayers),
    opponentStarters: pickStarterIds(opponentPlayers),
    clubLogoUrl: null,
    createdAt,
    myTeamHandicap: DEMO_MATCH_SETTINGS.handicap,
    opponentHandicap: DEMO_MATCH_SETTINGS.handicap,
  };
}
