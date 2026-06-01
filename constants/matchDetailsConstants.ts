/**
 * Match Details Screen Constants
 *
 * Centralized constants, types, and enums for the MatchDetailsScreen.
 */

// ===========================
// TAB TYPES
// ===========================

export const TAB = {
  EVOLUTION: "EVOLUTION",
  STATS: "STATS",
  CARDS: "CARDS",
  COURT: "COURT",
  TIMELINE: "TIMELINE",
} as const;

export type Tab = typeof TAB[keyof typeof TAB];

// ===========================
// FILTER TYPES
// ===========================

// TeamFilter uses the Team enum from src/models/types
// No need to redefine it here
export type TeamFilter = "MyTeam" | "Opponent";

export const ACTION_FILTER = {
  ALL: "ALL",
  SHOOTING: "SHOOTING",
  REBOUNDS: "REBOUNDS",
  ASSISTS: "ASSISTS",
  STEALS: "STEALS",
  BLOCKS: "BLOCKS",
  TURNOVERS: "TURNOVERS",
  FOULS: "FOULS",
  FOUL_DRAWN: "FOUL_DRAWN",
} as const;

export type ActionFilterType = typeof ACTION_FILTER[keyof typeof ACTION_FILTER];

// ===========================
// SORT TYPES
// ===========================

export type SortBy =
  | "name"
  | "min"
  | "pts"
  | "reb"
  | "reb_off"
  | "reb_def"
  | "ast"
  | "stl"
  | "blk"
  | "to"
  | "pf"
  | "fd"
  | "eff"
  | "pm"
  | "fgm"
  | "fga"
  | "fg2m"
  | "fg2a"
  | "fg3m"
  | "fg3a"
  | "ftm"
  | "fta";

export type SortOrder = "asc" | "desc";

// ===========================
// PLAYER STATS INTERFACE
// ===========================

export interface PlayerStats {
  playerNumber: number;
  name: string;
  team: "MyTeam" | "Opponent";
  photoUrl?: string;
  isSubstitute: boolean;
  pts: number;
  reb: number;
  reb_off: number;
  reb_def: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  fd: number;
  ftm: number;
  fta: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  fgm: number;
  fga: number;
  eff: number;
  pm: number | null;
  min: string; // Format "MM:SS"
}

// ===========================
// ROUTE PARAMS
// ===========================

export interface MatchDetailsRouteParams {
  match: any; // Will use Match type from models
  actions?: any[];
  fromLiveMatch?: boolean;
  players?: any[];
}
