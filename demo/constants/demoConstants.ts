/**
 * Demo constants
 *
 * Static configuration of the interactive live match demo embedded in the
 * landing page. The demo always starts a fresh match at 0-0 in the first
 * period: the visitor drives the whole match.
 */

/** Value of EXPO_PUBLIC_APP_ENTRY that mounts the demo instead of the app */
export const DEMO_APP_ENTRY = "demo";

/** Query parameter that discards the match in progress and starts a new one */
export const DEMO_RESET_QUERY_PARAM = "reset";

/** Navigation routes owned by the demo */
export const DEMO_ROUTES = {
  LAUNCHER: "DemoLauncher",
  /**
   * Tab name the existing screens navigate to when leaving a match
   * (see MatchDetailsScreen). The demo maps it back to the launcher.
   */
  DASHBOARD_TAB: "Dashboard",
} as const;

/** Match settings: same format a coach would pick in the app */
export const DEMO_MATCH_SETTINGS = {
  myTeamName: "Mon équipe",
  opponentName: "Adversaire",
  isHome: true,
  trackOpponentStats: true,
  periodCount: 4,
  periodDurationMinutes: 10,
  startersCount: 5,
  handicap: 0,
} as const;

/** Prefixes keeping demo player ids distinct from real roster ids */
export const DEMO_PLAYER_ID_PREFIX = {
  myTeam: "demo-home-",
  opponent: "demo-away-",
} as const;

export interface DemoRosterEntry {
  name: string;
  jerseyNumber: number;
}

/** My team roster: the first entries are the starters */
export const DEMO_MY_TEAM_ROSTER: readonly DemoRosterEntry[] = [
  { name: "Lucas", jerseyNumber: 4 },
  { name: "Hugo", jerseyNumber: 7 },
  { name: "Nathan", jerseyNumber: 9 },
  { name: "Théo", jerseyNumber: 11 },
  { name: "Enzo", jerseyNumber: 14 },
  { name: "Louis", jerseyNumber: 5 },
  { name: "Adam", jerseyNumber: 8 },
  { name: "Noah", jerseyNumber: 12 },
];

/** Opponent roster: the first entries are the starters */
export const DEMO_OPPONENT_ROSTER: readonly DemoRosterEntry[] = [
  { name: "Max", jerseyNumber: 3 },
  { name: "Tom", jerseyNumber: 6 },
  { name: "Sam", jerseyNumber: 10 },
  { name: "Leo", jerseyNumber: 13 },
  { name: "Jules", jerseyNumber: 15 },
  { name: "Paul", jerseyNumber: 21 },
  { name: "Gabin", jerseyNumber: 23 },
  { name: "Milo", jerseyNumber: 24 },
];
