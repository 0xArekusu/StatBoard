// Match format constants
export const MATCH_FORMATS = {
  TWO_HALVES: '2_halves' as const,
  FOUR_QUARTERS: '4_quarters' as const,
} as const;

export type MatchFormat = typeof MATCH_FORMATS[keyof typeof MATCH_FORMATS];

// Match format labels in French
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

// Period labels
export const getPeriodLabel = (format: MatchFormat, periodNumber: number): string => {
  const labels = MATCH_FORMAT_LABELS[format];
  return `${periodNumber}${labels.short === 'MT' ? 'ère' : 'e'} ${labels.singular}`;
};

// Duration labels (in seconds)
export const DURATION_LABELS = {
  300: '5 min',
  600: '10 min',
  720: '12 min',
  900: '15 min',
  1200: '20 min',
} as const;

// Team modes
export const TEAM_MODES = {
  A: 'A' as const,
  B: 'B' as const,
  BOTH: 'both' as const,
} as const;

export type TeamMode = typeof TEAM_MODES[keyof typeof TEAM_MODES];

// Match status
export const MATCH_STATUS = {
  IN_PROGRESS: 'in_progress' as const,
  COMPLETED: 'completed' as const,
  PAUSED: 'paused' as const,
  ABANDONED: 'abandoned' as const,
} as const;

export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];
