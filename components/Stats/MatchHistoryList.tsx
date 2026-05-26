import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { MatchHistoryEntry } from '../../src/services/seasonStats';
import { RootNavigationProp } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import MatchHistoryRow from './MatchHistoryRow';

interface MatchHistoryListProps {
  entries: MatchHistoryEntry[];
}

export default function MatchHistoryList({ entries }: MatchHistoryListProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();
  const navigation = useNavigation<RootNavigationProp>();

  const handleMatchPress = (entry: MatchHistoryEntry) => {
    navigation.navigate(ROUTES.MATCH_DETAILS as 'MatchDetails', { match: entry.match });
  };

  return (
    <View style={{ paddingHorizontal: sp.md, gap: sp.sm }}>
      <Text style={[styles.title, { fontSize: font.md, color: colors.text.primary }]}>
        Historique des matchs
      </Text>

      {entries.length === 0 ? (
        <Text style={[styles.empty, { fontSize: font.sm, color: colors.text.tertiary }]}>
          Aucun match disponible
        </Text>
      ) : (
        entries.map((entry) => (
          <MatchHistoryRow
            key={entry.match.id}
            entry={entry}
            onPress={() => handleMatchPress(entry)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
  },
  empty: {
    fontStyle: 'italic',
  },
});
