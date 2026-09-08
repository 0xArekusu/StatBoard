import i18n from '../src/i18n';

export const STAT_PERIOD = {
  SEASON: 'season',
  THREE_MONTHS: '3_months',
  LAST_5: 'last_5',
} as const;

export type StatPeriod = typeof STAT_PERIOD[keyof typeof STAT_PERIOD];

export function getStatPeriodLabel(period: StatPeriod): string {
  return i18n.t(`statPeriodLabels.${period}`);
}

export const LEADER_CATEGORY = {
  EFF: 'eff',
  PTS: 'pts',
  REB: 'reb',
  REB_OFF: 'reb_off',
  REB_DEF: 'reb_def',
  AST: 'ast',
  DEF: 'def',
  STL: 'stl',
  BLK: 'blk',
  TO: 'to',
  PF: 'pf',
  FD: 'fd',
  FG_PCT: 'fg_pct',
  FG2_PCT: 'fg2_pct',
  FG3_PCT: 'fg3_pct',
  FT_PCT: 'ft_pct',
} as const;

export type LeaderCategory = typeof LEADER_CATEGORY[keyof typeof LEADER_CATEGORY];

export function getLeaderCategoryLabel(category: LeaderCategory): string {
  return i18n.t(`leaderCategoryLabels.${category}`);
}

const LEADER_CATEGORY_LEGEND_KEYS: Partial<Record<LeaderCategory, string>> = {
  [LEADER_CATEGORY.REB]: 'rebound',
  [LEADER_CATEGORY.DEF]: 'defense',
  [LEADER_CATEGORY.FG_PCT]: 'fgPct',
};

export function getLeaderCategoryLegend(category: LeaderCategory): string | undefined {
  const key = LEADER_CATEGORY_LEGEND_KEYS[category];
  return key ? i18n.t(`leaderCategoryLegend.${key}`) : undefined;
}

export function getLeaderCategorySublabel(category: LeaderCategory): string {
  return i18n.t(`leaderCategorySublabels.${category}`);
}
