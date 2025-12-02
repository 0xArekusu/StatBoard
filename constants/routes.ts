/**
 * Navigation route names
 * Centralized constants to avoid typos and ensure type safety
 */
export const ROUTES = {
  AUTH: "Auth",
  MAIN_TABS: "MainTabs",
  MAIN_MENU: "MainMenu",
  BOARD: "Board",
  MATCH_HISTORY: "MatchHistory",
  MATCH_SUMMARY: "MatchSummary",
  MATCH_DETAILS: "MatchDetails",
  LOGIN: "Login",
  SIGN_UP: "SignUp",
  CLUB_FORM: "ClubForm",
  CLUB: "Club",
  TEAM_FORM: "TeamForm",
  TEAM_INFO: "TeamInfo",
  TEAM_ROSTER: "TeamRoster",
  TEAM_STARTERS: "TeamStarters",
  JOIN_CLUB: "JoinClub",
  DEBUG_COURT: "DebugCourt",
  NEW_MATCH: "NewMatch",
  LIVE_MATCH: "LiveMatch",
} as const;

// Type for route names
export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
