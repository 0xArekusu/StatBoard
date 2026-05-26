import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { PlayerSeasonData } from '../../src/services/seasonStats';
import PlayerAvatar from '../PlayerAvatar';

interface PlayerProfileHeaderProps {
  player: PlayerSeasonData;
  matchesInPeriod: number;
}

export default function PlayerProfileHeader({ player, matchesInPeriod }: PlayerProfileHeaderProps) {
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surfaceVariant }]}>
      <View style={[styles.inner, { paddingVertical: sp.xl, gap: sp.sm }]}>
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
        <View style={styles.textBlock}>
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
                  backgroundColor: colors.primary,
                  paddingHorizontal: sp.sm,
                  paddingVertical: sp.xs,
                  borderRadius: sp.xs,
                },
              ]}
            >
              <Text
                style={[styles.numberText, { fontSize: font.md, color: colors.onPrimary }]}
              >
                #{player.playerNumber}
              </Text>
            </View>
          </View>
          <Text style={[styles.meta, { fontSize: font.sm, color: colors.text.secondary }]}>
            {player.matchesPlayed} match{player.matchesPlayed > 1 ? 's' : ''} joué{player.matchesPlayed > 1 ? 's' : ''}
            {matchesInPeriod > player.matchesPlayed ? ` sur ${matchesInPeriod}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  inner: {
    alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: 4,
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
});
