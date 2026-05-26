import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { useClub } from '../src/contexts/ClubContext';
import { useResponsive } from '../src/hooks/useResponsive';
import { supabase } from '../src/config/supabase';
import { ServiceFactory } from '../services/ServiceFactory';
import {
  loadAllMatchDetails,
  computeSeasonStats,
  filterMatchesByPeriod,
  PlayerSeasonData,
  MatchWithDetails,
} from '../src/services/seasonStats';
import { StatPeriod, LeaderCategory, STAT_PERIOD, LEADER_CATEGORY, LEADER_CATEGORY_LEGEND } from '../constants/statsConstants';
import { ROUTES } from '../constants/routes';
import { RootNavigationProp } from '../types/navigation';
import { logInfo, logError } from '../utils/logger';
import PeriodFilter from '../components/Stats/PeriodFilter';
import CategoryTabs from '../components/Stats/CategoryTabs';
import LeaderboardList from '../components/Stats/LeaderboardList';

export default function StatsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { currentClub, activeTeamId } = useClub();
  const { sp, font } = useResponsive();
  const navigation = useNavigation<RootNavigationProp>();

  const [period, setPeriod] = useState<StatPeriod>(STAT_PERIOD.SEASON);
  const [category, setCategory] = useState<LeaderCategory>(LEADER_CATEGORY.PTS);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerSeasonData[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [showRenforts, setShowRenforts] = useState(false);

  const allDetailsRef = useRef<MatchWithDetails[]>([]);

  const loadData = useCallback(async () => {
    if (!user || !currentClub) return;
    try {
      setLoading(true);
      logInfo('StatsScreen', 'Chargement des matchs de la saison');
      const matchListService = ServiceFactory.getMatchListService(supabase);
      const matches = await matchListService.loadAllMatchesSorted(
        user.id,
        currentClub.id,
        activeTeamId ?? null
      );
      const details = await loadAllMatchDetails(matches, supabase);
      allDetailsRef.current = details;
      const stats = computeSeasonStats(details, period);
      const filtered = filterMatchesByPeriod(matches, period);
      setPlayers(stats);
      setMatchCount(filtered.length);
    } catch (e) {
      logError('StatsScreen', 'Erreur chargement stats saison', { error: e });
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentClub?.id, activeTeamId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePeriodChange = (newPeriod: StatPeriod) => {
    setPeriod(newPeriod);
    const stats = computeSeasonStats(allDetailsRef.current, newPeriod);
    const filtered = filterMatchesByPeriod(
      allDetailsRef.current.map((d) => d.match),
      newPeriod
    );
    setPlayers(stats);
    setMatchCount(filtered.length);
  };

  const handlePlayerPress = (player: PlayerSeasonData) => {
    navigation.navigate(ROUTES.PLAYER_PROFILE as 'PlayerProfile', {
      playerId: player.playerId,
      playerNumber: player.playerNumber,
      playerName: player.playerName,
      photoUrl: player.photoUrl,
    });
  };

  if (!user || !currentClub) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.locked}>
          <Text style={[styles.lockedText, { fontSize: font.md, color: colors.text.tertiary }]}>
            Rejoignez une équipe pour accéder aux statistiques de la saison.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Sticky header — outside ScrollView */}
      <View style={[styles.header, { paddingHorizontal: sp.md, paddingTop: sp.lg, paddingBottom: sp.sm, gap: sp.md, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { fontSize: font.xxl, color: colors.text.primary }]}>
          Stats Équipe
        </Text>

        <PeriodFilter selected={period} onChange={handlePeriodChange} />

        <CategoryTabs selected={category} onChange={setCategory} />
        {LEADER_CATEGORY_LEGEND[category] ? (
          <Text style={[styles.legend, { fontSize: font.xs, color: colors.text.tertiary, paddingHorizontal: sp.md, paddingTop: sp.xs }]}>
            ℹ︎ {LEADER_CATEGORY_LEGEND[category]}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={() => setShowRenforts((v) => !v)}
          style={[styles.renfortToggle, { gap: sp.xs }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name={showRenforts ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={16}
            color={showRenforts ? colors.primary : colors.text.tertiary}
          />
          <Text style={[styles.renfortLabel, { fontSize: font.xs, color: showRenforts ? colors.text.secondary : colors.text.tertiary }]}>
            Afficher les renforts
          </Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border, marginTop: sp.sm }]} />
      </View>

      {/* Scrollable leaderboard */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: sp.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <LeaderboardList
          players={players}
          category={category}
          loading={loading}
          matchCount={matchCount}
          showRenforts={showRenforts}
          onPlayerPress={handlePlayerPress}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {},
  title: { fontWeight: '800' },
  renfortToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  renfortLabel: { fontWeight: '500' },
  legend: { fontStyle: 'italic' },
  divider: { height: 1 },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockedText: { textAlign: 'center', lineHeight: 22 },
});
