/**
 * Match Constants
 *
 * Centralized constants for match-related data.
 * NOTE: Use MatchStatus and Team enums from '../src/models/types' instead of duplicating here.
 */

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
 * Match format labels in French
 */
export const MATCH_FORMAT_LABELS = {
  [MATCH_FORMATS.TWO_HALVES]: {
    singular: 'mi-temps',
    plural: 'mi-temps',
    short: 'MT',
  },
  [MATCH_FORMATS.FOUR_QUARTERS]: {
    singular: 'quart-temps',
    plural: 'quart-temps',
    short: 'QT',
  },
} as const;

/**
 * Get period label in French
 * @param format - Match format
 * @param periodNumber - Period number (1-based)
 * @returns Localized period label (e.g., "1ère mi-temps", "2e quart-temps")
 */
export const getPeriodLabel = (format: MatchFormat, periodNumber: number): string => {
  const labels = MATCH_FORMAT_LABELS[format];
  return `${periodNumber}${labels.short === 'MT' ? 'ère' : 'e'} ${labels.singular}`;
};
