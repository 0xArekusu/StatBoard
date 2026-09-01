/**
 * Match Constants
 *
 * Centralized constants for match-related data.
 * NOTE: Use MatchStatus and Team enums from '../src/models/types' instead of duplicating here.
 */

import i18n from '../src/i18n';

// ===========================
// GUEST IDS
// ===========================

export const GUEST_IDS = {
  CLUB: "guest-club",
  TEAM: "guest-team",
} as const;

// ===========================
// MATCH FORMATS
// ===========================

/**
 * Match format constants
 */
export const MATCH_FORMATS = {
  TWO_HALVES: '2_halves' as const,
  FOUR_QUARTERS: '4_quarters' as const,
} as const;

export type MatchFormat = typeof MATCH_FORMATS[keyof typeof MATCH_FORMATS];

/**
 * Get localized labels for a match format
 */
export function getMatchFormatLabels(format: MatchFormat): { singular: string; plural: string; short: string } {
  const key = format === MATCH_FORMATS.TWO_HALVES ? 'halves' : 'quarters';
  return {
    singular: i18n.t(`matchFormatLabels.${key}.singular`),
    plural: i18n.t(`matchFormatLabels.${key}.plural`),
    short: i18n.t(`matchFormatLabels.${key}.short`),
  };
}

/**
 * Get period label (e.g., "1ère mi-temps", "2e quart-temps")
 * @param format - Match format
 * @param periodNumber - Period number (1-based)
 */
export const getPeriodLabel = (format: MatchFormat, periodNumber: number): string => {
  const labels = getMatchFormatLabels(format);
  return `${periodNumber}${labels.short === 'MT' ? 'ère' : 'e'} ${labels.singular}`;
};

// ===========================
// MATCH CREATION (NEW MATCH SCREEN)
// ===========================

/**
 * Match creation step type
 */
export type MatchCreationStep = 1 | 2;

/**
 * Predefined match format presets for creation UI
 * Maps to total_periods and period_duration in Match model
 */
export const MATCH_FORMAT_PRESETS = {
  QUARTERS: {
    totalPeriods: 4,
    periodDuration: 10, // minutes
  },
  HALVES: {
    totalPeriods: 2,
    periodDuration: 20, // minutes
  }
} as const;

/**
 * Get localized label for a match format preset
 */
export function getMatchFormatPresetLabel(preset: 'QUARTERS' | 'HALVES'): string {
  return i18n.t(`matchFormatPresets.${preset}.label`);
}

/**
 * Default match format for new matches
 */
export const DEFAULT_MATCH_PRESET = MATCH_FORMAT_PRESETS.QUARTERS;

/**
 * Player and roster constraints
 */
export const ROSTER_LIMITS = {
  MIN_PLAYERS: 1,
  STARTERS: 5,
  QUICK_ADD: {
    SMALL: 5,
    LARGE: 8
  },
  PERIOD: {
    MIN: 1,
    MAX: 8
  },
  DURATION: {
    MIN: 1,
    MAX: 60
  }
} as const;

/**
 * Default number of opponent players when stats tracking is enabled
 */
export const DEFAULT_OPPONENT_PLAYERS_COUNT = 5;

/**
 * Generate default opponent player name
 * @param index - Player index (1-based)
 * @returns Default player name
 */
export const getDefaultOpponentPlayerName = (index: number): string =>
  i18n.t('matchConstants.defaultOpponentPlayerName', { index });

/**
 * Step label for the match creation flow
 */
export function getMatchCreationStepLabel(step: MatchCreationStep): string {
  return i18n.t(`matchCreationStepLabels.step${step}`);
}

/**
 * Button label for match creation
 */
export function getMatchCreationButtonLabel(
  key: 'NEXT' | 'START' | 'ADD_REINFORCEMENT' | 'MODIFY_OPTIONS'
): string {
  return i18n.t(`matchCreationButtonLabels.${key}`);
}

/**
 * Info message for match creation
 */
export function getMatchCreationInfoMessage(
  key:
    | 'ROSTER_INSTRUCTIONS'
    | 'OPPONENT_ROSTER_INSTRUCTIONS'
    | 'NO_TEAM_CREATED'
    | 'OPPONENT_STATS_DISABLED'
    | 'OPPONENT_STATS_DISABLED_DETAIL'
    | 'NO_OPPONENT_PLAYERS'
    | 'OPPONENT_STATS_OPTION'
    | 'OPPONENT_STATS_TITLE'
): string {
  return i18n.t(`matchCreationInfoMessages.${key}`);
}

/**
 * Form label for match creation
 */
export function getMatchCreationFormLabel(
  key:
    | 'MY_TEAM'
    | 'OPPONENT'
    | 'MATCH_FORMAT'
    | 'LOCATION'
    | 'PERIODS'
    | 'MINUTES_PER_PERIOD'
    | 'HOME'
    | 'AWAY'
): string {
  return i18n.t(`matchCreationFormLabels.${key}`);
}

/**
 * Roster tab label for match creation
 */
export function getMatchRosterTabLabel(key: 'US' | 'THEM'): string {
  return i18n.t(`matchRosterTabLabels.${key}`);
}
