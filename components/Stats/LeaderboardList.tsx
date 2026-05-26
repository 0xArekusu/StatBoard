import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { PlayerSeasonData } from '../../src/services/seasonStats';
import { LeaderCategory, LEADER_CATEGORY, LEADER_CATEGORY_SUBLABELS } from '../../constants/statsConstants';
import LeaderboardRow from './LeaderboardRow';

function getCategoryValue(player: PlayerSeasonData, category: LeaderCategory): number {
  const n = player.matchesPlayed;
  const a = (total: number) => n > 0 ? Math.round((total / n) * 10) / 10 : 0;
  switch (category) {
    case LEADER_CATEGORY.EFF:     return player.avgEff;
    case LEADER_CATEGORY.PTS:     return player.avgPts;
    case LEADER_CATEGORY.REB:     return player.avgReb;
    case LEADER_CATEGORY.REB_OFF: return a(player.reb_off);
    case LEADER_CATEGORY.REB_DEF: return a(player.reb_def);
    case LEADER_CATEGORY.AST:     return player.avgAst;
    case LEADER_CATEGORY.DEF:     return player.avgDef;
    case LEADER_CATEGORY.STL:     return a(player.stl);
    case LEADER_CATEGORY.BLK:     return a(player.blk);
    case LEADER_CATEGORY.TO:      return a(player.to);
    case LEADER_CATEGORY.PF:      return a(player.pf);
    case LEADER_CATEGORY.FD:      return a(player.fd);
    case LEADER_CATEGORY.FG_PCT:  return player.fga > 0  ? Math.round((player.fgm  / player.fga)  * 1000) / 10 : 0;
    case LEADER_CATEGORY.FG2_PCT: return player.fg2a > 0 ? Math.round((player.fg2m / player.fg2a) * 1000) / 10 : 0;
    case LEADER_CATEGORY.FG3_PCT: return player.fg3a > 0 ? Math.round((player.fg3m / player.fg3a) * 1000) / 10 : 0;
    case LEADER_CATEGORY.FT_PCT:  return player.fta > 0  ? Math.round((player.ftm  / player.fta)  * 1000) / 10 : 0;
    default: return 0;
  }
}

const PCT_CATEGORIES = new Set([
  LEADER_CATEGORY.FG_PCT,
  LEADER_CATEGORY.FG2_PCT,
  LEADER_CATEGORY.FG3_PCT,
  LEADER_CATEGORY.FT_PCT,
]);

function sortByCategory(players: PlayerSeasonData[], category: LeaderCategory): PlayerSeasonData[] {
  return [...players].sort((a, b) => getCategoryValue(b, category) - getCategoryValue(a, category));
}

function getMaxValue(players: PlayerSeasonData[], category: LeaderCategory): number {
  if (players.length === 0) return 1;
  if (PCT_CATEGORIES.has(category)) return 100;
  return Math.max(...players.map((p) => getCategoryValue(p, category)), 1);
}

interface LeaderboardListProps {
  players: PlayerSeasonData[];
  category: LeaderCategory;
  loading: boolean;
  matchCount: number;
  showRenforts: boolean;
  onPlayerPress: (player: PlayerSeasonData) => void;
}

export default function LeaderboardList({
  players,
  category,
  loading,
  matchCount,
  showRenforts,
  onPlayerPress,
}: LeaderboardListProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const visible = showRenforts
    ? players
    : players.filter((p) => p.playerId !== null && UUID_REGEX.test(p.playerId));

  if (visible.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.empty, { color: colors.text.tertiary, fontSize: font.md }]}>
          {matchCount === 0
            ? 'Aucun match enregistré'
            : !showRenforts && players.length > 0
            ? 'Aucun joueur du roster pour cette période'
            : 'Aucune statistique pour cette période'}
        </Text>
      </View>
    );
  }

  const sorted = sortByCategory(visible, category);
  const maxValue = getMaxValue(visible, category);

  return (
    <View style={{ gap: sp.xs }}>
      <Text
        style={[
          styles.subtitle,
          {
            fontSize: font.xs,
            color: colors.text.tertiary,
            paddingHorizontal: sp.md,
            paddingBottom: sp.xs,
          },
        ]}
      >
        {LEADER_CATEGORY_SUBLABELS[category].toUpperCase()} · {matchCount} MATCH{matchCount > 1 ? 'S' : ''}
      </Text>
      {sorted.map((player, index) => (
        <LeaderboardRow
          key={player.playerId ?? `${player.playerNumber}-${player.playerName}`}
          player={player}
          rank={index + 1}
          category={category}
          maxValue={maxValue}
          onPress={() => onPlayerPress(player)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  empty: {
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
