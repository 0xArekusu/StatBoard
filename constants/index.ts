/**
 * Constants Index
 *
 * Central export point for all application constants.
 * Import from here to ensure consistency across the codebase.
 */

// Match constants
export * from './matchConstants';

// Re-export enums from types for convenience
export {
  MatchStatus,
  Team,
} from '../src/models/types';

// Re-export action types for convenience
export {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  ACTION_TYPE_FR,
  SHOT_SPECIFICATION_FR,
  REBOUND_SPECIFICATION_FR,
  FOUL_SPECIFICATION_FR,
  isShotMade,
} from '../src/models/ActionTypes';

// Routes
export * from './routes';

// Match Details Screen
export * from './matchDetailsConstants';
export { TAB, ACTION_FILTER } from './matchDetailsConstants';
