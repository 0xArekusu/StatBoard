import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { INTL_LOCALES, SupportedLanguage } from '../../src/i18n';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { MatchHistoryEntry } from '../../src/services/seasonStats';
interface MatchHistoryRowProps {
  entry: MatchHistoryEntry;
  onPress: () => void;
}

export default function MatchHistoryRow({ entry, onPress }: MatchHistoryRowProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();
  const { match, played, pts, reb, ast } = entry;

  const isWin = match.my_team_score > match.opponent_score;
  const resultColor = played
    ? isWin ? colors.success : colors.error
    : colors.text.disabled;

  const date = match.created_at
    ? new Date(match.created_at).toLocaleDateString(
        INTL_LOCALES[i18n.language as SupportedLanguage] ?? INTL_LOCALES.fr,
        { day: '2-digit', month: '2-digit' }
      )
    : '—';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          paddingHorizontal: sp.md,
          paddingVertical: sp.sm,
          borderRadius: sp.sm,
          gap: sp.sm,
          opacity: played ? 1 : 0.4,
        },
      ]}
    >
      {/* Result indicator */}
      <View
        style={[
          styles.resultDot,
          { backgroundColor: resultColor, width: 8, height: 8, borderRadius: 4 },
        ]}
      />

      {/* Date */}
      <Text style={[styles.date, { fontSize: font.xs, color: colors.text.tertiary, width: 32 }]}>
        {date}
      </Text>

      {/* Home/Away icon */}
      <MaterialCommunityIcons
        name={match.is_home ? 'home' : 'airplane-takeoff'}
        size={sizes.iconSm}
        color={colors.text.tertiary}
      />

      {/* Opponent */}
      <Text
        style={[
          styles.opponent,
          { fontSize: font.sm, color: played ? colors.text.primary : colors.text.disabled },
        ]}
        numberOfLines={1}
      >
        {match.opponent_name}
      </Text>

      {/* Score */}
      <Text style={[styles.score, { fontSize: font.sm, color: resultColor, fontWeight: '700' }]}>
        {match.is_home
          ? `${match.my_team_score} – ${match.opponent_score}`
          : `${match.opponent_score} – ${match.my_team_score}`}
      </Text>

      {/* Stats (only if played) */}
      {played ? (
        <View style={[styles.stats, { gap: sp.sm }]}>
          <Text style={[styles.stat, { fontSize: font.xs, color: colors.text.secondary }]}>
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>{pts}</Text>{t('matchHistoryRow.ptsAbbr')}
          </Text>
          <Text style={[styles.stat, { fontSize: font.xs, color: colors.text.secondary }]}>
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>{reb}</Text>{t('matchHistoryRow.rebAbbr')}
          </Text>
          <Text style={[styles.stat, { fontSize: font.xs, color: colors.text.secondary }]}>
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>{ast}</Text>{t('matchHistoryRow.astAbbr')}
          </Text>
        </View>
      ) : (
        <Text style={[styles.didNotPlay, { fontSize: font.xs, color: colors.text.disabled }]}>
          {t('matchHistoryRow.didNotPlay')}
        </Text>
      )}

      <MaterialCommunityIcons
        name="chevron-right"
        size={sizes.iconSm}
        color={colors.text.tertiary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultDot: {},
  date: {
    fontWeight: '500',
  },
  opponent: {
    flex: 1,
    fontWeight: '500',
  },
  score: {},
  stats: {
    flexDirection: 'row',
  },
  stat: {},
  didNotPlay: {
    fontStyle: 'italic',
  },
});
