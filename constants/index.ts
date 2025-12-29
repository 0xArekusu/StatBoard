/**
 * Constants Index
 *
 * Central export point for all application constants.
 * Import from here to ensure consistency across the codebase.
 */

// Platform constants
export enum PlatformOS {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  WINDOWS = 'windows',
  MACOS = 'macos',
}

// Match constants
export * from "./matchConstants";
export type { MatchCreationStep } from "./matchConstants";

// Re-export enums from types for convenience
export { MatchStatus, Team } from "../src/models/types";

// Re-export action types for convenience
export {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  GenericSpecification,
  ACTION_TYPE_FR,
  SHOT_SPECIFICATION_FR,
  REBOUND_SPECIFICATION_FR,
  FOUL_SPECIFICATION_FR,
  isShotMade,
} from "../src/models/ActionTypes";

// Routes
export * from "./routes";

// Match Details Screen
export * from "./matchDetailsConstants";
export { TAB, ACTION_FILTER } from "./matchDetailsConstants";

// Club Screen
export * from "./clubConstants";
export {
  CLUB_TAB,
  CLUB_SUB_TAB,
  CLUB_COLOR_PALETTE,
  COURT_COLOR_PALETTE,
} from "./clubConstants";

// Live Match Screen
export * from "./liveMatchConstants";
export {
  WorkflowStep,
  TeamId,
  ViewMode,
  FilterMode,
} from "./liveMatchConstants";

// Live Match Helpers
export {
  formatTime,
  getActionDescription,
  getPeriodLabel,
} from "../utils/liveMatchHelpers";

// Auth Screen
export * from "./authConstants";
export { AUTH_VIEW } from "./authConstants";
export type { AuthView } from "./authConstants";
