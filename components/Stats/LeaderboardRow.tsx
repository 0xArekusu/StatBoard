import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { PlayerSeasonData } from '../../src/services/seasonStats';
import { LeaderCategory, LEADER_CATEGORY } from '../../constants/statsConstants';
import PlayerAvatar from '../PlayerAvatar';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardRowProps {
  player: PlayerSeasonData;
  rank: number;
  category: LeaderCategory;
  maxValue: number;
  onPress: () => void;
}

function avg(total: number, n: number): number {
  return n > 0 ? Math.round((total / n) * 10) / 10 : 0;
}

function getCategoryValue(player: PlayerSeasonData, category: LeaderCategory): number {
  const n = player.matchesPlayed;
  switch (category) {
    case LEADER_CATEGORY.EFF:     return player.avgEff;
    case LEADER_CATEGORY.PTS:     return player.avgPts;
    case LEADER_CATEGORY.REB:     return player.avgReb;
    case LEADER_CATEGORY.REB_OFF: return avg(player.reb_off, n);
    case LEADER_CATEGORY.REB_DEF: return avg(player.reb_def, n);
    case LEADER_CATEGORY.AST:     return player.avgAst;
    case LEADER_CATEGORY.DEF:     return player.avgDef;
    case LEADER_CATEGORY.STL:     return avg(player.stl, n);
    case LEADER_CATEGORY.BLK:     return avg(player.blk, n);
    case LEADER_CATEGORY.TO:      return avg(player.to, n);
    case LEADER_CATEGORY.PF:      return avg(player.pf, n);
    case LEADER_CATEGORY.FD:      return avg(player.fd, n);
    case LEADER_CATEGORY.FG_PCT:  return player.fga > 0  ? Math.round((player.fgm  / player.fga)  * 1000) / 10 : 0;
    case LEADER_CATEGORY.FG2_PCT: return player.fg2a > 0 ? Math.round((player.fg2m / player.fg2a) * 1000) / 10 : 0;
    case LEADER_CATEGORY.FG3_PCT: return player.fg3a > 0 ? Math.round((player.fg3m / player.fg3a) * 1000) / 10 : 0;
    case LEADER_CATEGORY.FT_PCT:  return player.fta > 0  ? Math.round((player.ftm  / player.fta)  * 1000) / 10 : 0;
    default: return 0;
  }
}

export default function LeaderboardRow({
  player,
  rank,
  category,
  maxValue,
  onPress,
}: LeaderboardRowProps) {
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();

  const value = getCategoryValue(player, category);
  const barWidth = maxValue > 0 ? Math.max(0, (value / maxValue) * 100) : 0;
  const rankLabel = rank <= 3 ? RANK_MEDALS[rank - 1] : `${rank}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.row,
        {
          paddingHorizontal: sp.md,
          paddingVertical: sp.sm,
          gap: sp.sm,
        },
      ]}
    >
      <Text
        style={[styles.rank, { fontSize: font.md, color: colors.text.secondary, width: 28 }]}
      >
        {rankLabel}
      </Text>

      <PlayerAvatar
        playerName={player.playerName}
        playerNumber={player.playerNumber}
        photoUrl={player.photoUrl}
        size={sizes.avatarSm}
        backgroundColor={colors.surfaceVariant}
        textColor={colors.text.secondary}
        borderColor={colors.border}
        borderWidth={1}
      />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { fontSize: font.md, color: colors.text.primary }]}
            numberOfLines={1}
          >
            {player.playerName}
          </Text>
          <Text style={[styles.number, { fontSize: font.xs, color: colors.text.tertiary }]}>
            #{player.playerNumber}
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
          <View
            style={[
              styles.barFill,
              { width: `${barWidth}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      </View>

      <Text style={[styles.value, { fontSize: font.lg, color: colors.text.primary }]}>
        {value.toFixed(1)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    textAlign: 'center',
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  name: {
    fontWeight: '600',
    flexShrink: 1,
  },
  number: {
    fontWeight: '500',
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  value: {
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'right',
  },
});
