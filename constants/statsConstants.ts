export const STAT_PERIOD = {
  SEASON: 'season',
  THREE_MONTHS: '3_months',
  LAST_5: 'last_5',
} as const;

export type StatPeriod = typeof STAT_PERIOD[keyof typeof STAT_PERIOD];

export const STAT_PERIOD_LABELS: Record<StatPeriod, string> = {
  [STAT_PERIOD.SEASON]: 'Saison',
  [STAT_PERIOD.THREE_MONTHS]: '3 mois',
  [STAT_PERIOD.LAST_5]: '5 matchs',
};

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

export const LEADER_CATEGORY_LABELS: Record<LeaderCategory, string> = {
  [LEADER_CATEGORY.EFF]: 'ÉVAL',
  [LEADER_CATEGORY.PTS]: 'PTS',
  [LEADER_CATEGORY.REB]: 'REB',
  [LEADER_CATEGORY.REB_OFF]: 'REB OFF',
  [LEADER_CATEGORY.REB_DEF]: 'REB DÉF',
  [LEADER_CATEGORY.AST]: 'AST',
  [LEADER_CATEGORY.DEF]: 'DÉFENSE',
  [LEADER_CATEGORY.STL]: 'INT',
  [LEADER_CATEGORY.BLK]: 'CTR',
  [LEADER_CATEGORY.TO]: 'BP',
  [LEADER_CATEGORY.PF]: 'FTE',
  [LEADER_CATEGORY.FD]: 'FP',
  [LEADER_CATEGORY.FG_PCT]: '% TIR',
  [LEADER_CATEGORY.FG2_PCT]: '% 2PTS',
  [LEADER_CATEGORY.FG3_PCT]: '% 3PTS',
  [LEADER_CATEGORY.FT_PCT]: '% LF',
};

export const LEADER_CATEGORY_SUBLABELS: Record<LeaderCategory, string> = {
  [LEADER_CATEGORY.EFF]: 'éval / match',
  [LEADER_CATEGORY.PTS]: 'pts / match',
  [LEADER_CATEGORY.REB]: 'reb / match',
  [LEADER_CATEGORY.REB_OFF]: 'reb offensifs / match',
  [LEADER_CATEGORY.REB_DEF]: 'reb défensifs / match',
  [LEADER_CATEGORY.AST]: 'ast / match',
  [LEADER_CATEGORY.DEF]: 'INT+CTR / match',
  [LEADER_CATEGORY.STL]: 'interceptions / match',
  [LEADER_CATEGORY.BLK]: 'contres / match',
  [LEADER_CATEGORY.TO]: 'balles perdues / match',
  [LEADER_CATEGORY.PF]: 'fautes / match',
  [LEADER_CATEGORY.FD]: 'fautes provoquées / match',
  [LEADER_CATEGORY.FG_PCT]: '% réussite aux tirs',
  [LEADER_CATEGORY.FG2_PCT]: '% réussite à 2 pts',
  [LEADER_CATEGORY.FG3_PCT]: '% réussite à 3 pts',
  [LEADER_CATEGORY.FT_PCT]: '% réussite aux lancers',
};
