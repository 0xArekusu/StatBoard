/**
 * Match Constants
 *
 * Centralized constants for match-related data.
 * NOTE: Use MatchStatus and Team enums from '../src/models/types' instead of duplicating here.
 */

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
    label: "4 Quarts-temps"
  },
  HALVES: {
    totalPeriods: 2,
    periodDuration: 20, // minutes
    label: "2 Mi-temps"
  }
} as const;

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
  `Joueur ${index}`;

/**
 * Step labels for the match creation flow
 */
export const MATCH_CREATION_STEP_LABELS = {
  1: "Configuration du match",
  2: "Feuille de match"
} as const;

/**
 * Button labels for match creation
 */
export const MATCH_CREATION_BUTTON_LABELS = {
  NEXT: "Configurer les effectifs",
  START: "Coup d'envoi",
  ADD_REINFORCEMENT: "Ajouter un renfort",
  MODIFY_OPTIONS: "Modifier les options",
  GENERATE_PLAYERS: (count: number) => `+${count} Joueurs`
} as const;

/**
 * Info messages for match creation
 */
export const MATCH_CREATION_INFO_MESSAGES = {
  ROSTER_INSTRUCTIONS:
    "Sélectionnez les présents et le 5 de départ (étoile à droite).",
  OPPONENT_ROSTER_INSTRUCTIONS:
    "Sélectionnez le 5 de départ adverse (étoile à droite).",
  NO_TEAM_CREATED: "Pas d'équipe créée",
  OPPONENT_STATS_DISABLED: "Statistiques adverses désactivées",
  OPPONENT_STATS_DISABLED_DETAIL:
    "Activez l'option à l'étape précédente pour saisir l'effectif adverse.",
  NO_OPPONENT_PLAYERS: "Aucun joueur adverse ajouté.",
  OPPONENT_STATS_OPTION: "Saisir aussi les tirs/fautes adverses",
  OPPONENT_STATS_TITLE: "Stats Adversaires"
} as const;

/**
 * Form labels for match creation
 */
export const MATCH_CREATION_FORM_LABELS = {
  MY_TEAM: "MON ÉQUIPE",
  OPPONENT: "ADVERSAIRE",
  MATCH_FORMAT: "FORMAT DU MATCH",
  LOCATION: "LIEU",
  PERIODS: "PÉRIODES",
  MINUTES_PER_PERIOD: "MINUTES / PÉRIODE",
  HOME: "Domicile",
  AWAY: "Extérieur"
} as const;

/**
 * Roster tab labels for match creation
 */
export const MATCH_ROSTER_TAB_LABELS = {
  US: "NOUS",
  THEM: "EUX"
} as const;
