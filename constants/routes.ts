/**
 * Navigation route names
 * Centralized constants to avoid typos and ensure type safety
 */
export const ROUTES = {
  MAIN_MENU: "MainMenu",
  BOARD: "Board",
  MATCH_HISTORY: "MatchHistory",
  MATCH_SUMMARY: "MatchSummary",
  MATCH_DETAILS: "MatchDetails",
  LOGIN: "Login",
  SIGN_UP: "SignUp",
  CLUB_FORM: "ClubForm",
  TEAM_FORM: "TeamForm",
  JOIN_CLUB: "JoinClub",
} as const;

// Type for route names
export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
