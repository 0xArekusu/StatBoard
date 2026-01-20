/**
 * Live Match Screen Constants
 *
 * Centralized constants, types, and enums for the LiveMatchScreen.
 */

// ===========================
// EVENT TYPES - DEPRECATED
// ===========================
// EventType has been removed. Use ActionType + specification + points instead.
// See ActionTypes.ts and actionConfig.ts for the new system.

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
  action_type: string; // ActionType enum value
  specification?: string; // ShotSpecification, ReboundSpecification, etc.
  points?: number; // For shots: 1, 2, or 3
  playerId?: string;
  playerNumber?: number; // Player jersey number for display
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
  action_type?: string; // ActionType enum value
  specification?: string;
  points?: number;
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

// ===========================
// UI DISPLAY SETTINGS
// ===========================

/**
 * Duration (in milliseconds) to display a newly added marker on the court
 * when stats are hidden. This provides visual feedback to the user
 * about where they clicked before the marker disappears.
 */
export const TEMPORARY_MARKER_DISPLAY_DURATION = 500;
