import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { PlayerSeasonData } from '../../src/services/seasonStats';
import PlayerAvatar from '../PlayerAvatar';
import RadarChart from './RadarChart';

interface PlayerProfileHeaderProps {
  player: PlayerSeasonData;
  matchesInPeriod: number;
}

export default function PlayerProfileHeader({ player, matchesInPeriod }: PlayerProfileHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();

  const radarSize = isCompact ? 130 : 160;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surfaceVariant }]}>
      <View style={[styles.inner, { paddingVertical: sp.sm, paddingHorizontal: sp.lg, gap: sp.lg }]}>
        <View style={[styles.playerInfo, { gap: sp.sm, flex: 1 }]}>
          <PlayerAvatar
            playerName={player.playerName}
            playerNumber={player.playerNumber}
            photoUrl={player.photoUrl}
            size={sizes.avatarMd}
            backgroundColor={colors.surface}
            textColor={colors.text.secondary}
            borderColor={colors.border}
            borderWidth={2}
          />
          <View style={[styles.textBlock, { gap: sp.xs }]}>
            <View style={[styles.nameRow, { gap: sp.sm }]}>
              <Text
                style={[styles.name, { fontSize: font.xxl, color: colors.text.primary }]}
                numberOfLines={1}
              >
                {player.playerName}
              </Text>
              <View
                style={[
                  styles.numberBadge,
                  {
                    backgroundColor: colors.surfaceVariant,
                    paddingHorizontal: sp.sm,
                    paddingVertical: sp.xs,
                    borderRadius: sp.xs,
                    borderWidth: 2,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.numberText, { fontSize: font.md, color: colors.primary }]}>
                  #{player.playerNumber}
                </Text>
              </View>
            </View>
            <Text style={[styles.meta, { fontSize: font.sm, color: colors.text.secondary }]}>
              {t('playerProfileHeader.matchesPlayed', { count: player.matchesPlayed })}
              {matchesInPeriod > player.matchesPlayed ? ` ${t('playerProfileHeader.outOfTotal', { total: matchesInPeriod })}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.radarCol}>
          <RadarChart player={player} size={radarSize} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfo: {
    alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
  },
  numberBadge: {},
  numberText: {
    fontWeight: '800',
  },
  meta: {
    fontWeight: '500',
  },
  radarCol: {
    flex: 1,
    alignItems: 'center',
  },
});
