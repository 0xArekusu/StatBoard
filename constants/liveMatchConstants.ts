/**
 * Live Match Screen Constants
 *
 * Centralized constants, types, and enums for the LiveMatchScreen.
 */

// ===========================
// EVENT TYPES
// ===========================

/**
 * Event types for match actions displayed on court
 * These represent UI events that are shown to the user
 */
export enum EventType {
  POINT_1 = "POINT_1",
  POINT_2 = "POINT_2",
  POINT_3 = "POINT_3",
  MISS_1 = "MISS_1",
  MISS_2 = "MISS_2",
  MISS_3 = "MISS_3",
  FOUL = "FOUL",
  REBOUND_DEF = "REBOUND_DEF",
  REBOUND_OFF = "REBOUND_OFF",
  ASSIST = "ASSIST",
  STEAL = "STEAL",
  BLOCK = "BLOCK",
  TURNOVER = "TURNOVER",
  SUBSTITUTION = "SUBSTITUTION",
  POINT = "POINT",
}

// ===========================
// WORKFLOW STATES
// ===========================

/**
 * Workflow step states for the live match UI
 */
export enum WorkflowStep {
  IDLE = "IDLE",
  SELECT_PLAYER = "SELECT_PLAYER",
  SELECT_ACTION_FROM_COURT = "SELECT_ACTION_FROM_COURT",
  SUBSTITUTION = "SUBSTITUTION",
}

// ===========================
// INTERFACES
// ===========================

/**
 * Match event displayed on court and in history
 */
export interface MatchEvent {
  id: string;
  type: EventType;
  value?: number;
  playerId?: string;
  teamId: "HOME" | "AWAY";
  timestamp: number;
  description: string;
  coordinates?: { x: number; y: number };
  period_number?: number;
  time_in_period?: number;
}

/**
 * LiveMatchScreen route props
 */
export interface LiveMatchScreenProps {
  navigation: any;
  route: any;
}

/**
 * Pending event data during workflow
 */
export interface PendingEvent {
  type?: EventType;
  value?: number;
  coords?: { x: number; y: number };
  playerId?: string;
}

/**
 * Substitution selection state
 */
export interface SubstitutionSelection {
  out: string[];
  in: string[];
}

// ===========================
// TEAM IDENTIFIERS
// ===========================

/**
 * Team/Location identifiers for UI state (different from database Team enum)
 * Used for both team identification and match location
 */
export enum TeamId {
  HOME = "HOME",
  AWAY = "AWAY",
}

// ===========================
// VIEW MODES
// ===========================

/**
 * View modes for the main content area
 */
export enum ViewMode {
  GRID = "GRID",
  COURT = "COURT",
}

// ===========================
// FILTER MODES
// ===========================

/**
 * Filter modes for displaying events
 */
export enum FilterMode {
  ALL = "ALL",
  SHOOTING = "SHOOTING",
  REBOUNDS = "REBOUNDS",
  FOULS = "FOULS",
  TURNOVERS = "TURNOVERS",
  BLOCKS = "BLOCKS",
  STEALS = "STEALS",
}
