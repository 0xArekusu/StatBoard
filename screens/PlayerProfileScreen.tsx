import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PDFExportService } from '../src/services/export/PDFExportService';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { useClub } from '../src/contexts/ClubContext';
import { useResponsive } from '../src/hooks/useResponsive';
import { recordReviewPromptSignal } from '../hooks/useReviewPrompt';
import { supabase } from '../src/config/supabase';
import { ServiceFactory } from '../services/ServiceFactory';
import {
  loadAllMatchDetails,
  computeSeasonStats,
  computePlayerMatchHistory,
  filterMatchesByPeriod,
  MatchHistoryEntry,
  PlayerSeasonData,
  MatchWithDetails,
} from '../src/services/seasonStats';
import { StatPeriod, STAT_PERIOD } from '../constants/statsConstants';
import { ANALYTICS_EVENTS, ANALYTICS_PDF_EXPORT_TYPE } from '../constants/analyticsEvents';
import { usePostHog } from 'posthog-react-native';
import { RootStackParamList, RootNavigationProp } from '../types/navigation';
import { logInfo, logError } from '../utils/logger';
import PeriodFilter from '../components/Stats/PeriodFilter';
import PlayerProfileHeader from '../components/Stats/PlayerProfileHeader';
import PlayerSeasonStats from '../components/Stats/PlayerSeasonStats';
import MatchHistoryList from '../components/Stats/MatchHistoryList';

type PlayerProfileRouteProp = RouteProp<RootStackParamList, 'PlayerProfile'>;

const EMPTY_PLAYER = (
  playerId: string | null,
  playerNumber: number,
  playerName: string,
  photoUrl?: string
): PlayerSeasonData => ({
  playerId,
  playerNumber,
  playerName,
  photoUrl,
  matchesPlayed: 0,
  pts: 0, reb: 0, reb_off: 0, reb_def: 0,
  ast: 0, stl: 0, blk: 0, to: 0, pf: 0, fd: 0,
  ftm: 0, fta: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0,
  fgm: 0, fga: 0, eff: 0, totalPlayingTimeSeconds: 0, matchesWithTrackedTime: 0,
  avgPts: 0, avgReb: 0, avgAst: 0, avgDef: 0, avgEff: 0,
});

export default function PlayerProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { currentClub, activeTeamId } = useClub();
  const { sp, font, sizes } = useResponsive();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<PlayerProfileRouteProp>();
  const posthog = usePostHog();
  const { playerId, playerNumber, playerName, photoUrl } = route.params;

  // All hooks declared at top level in consistent order
  const [period, setPeriod] = useState<StatPeriod>(STAT_PERIOD.SEASON);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<PlayerSeasonData>(
    EMPTY_PLAYER(playerId ?? null, playerNumber, playerName, photoUrl)
  );
  const [matchesInPeriod, setMatchesInPeriod] = useState(0);
  const [historyEntries, setHistoryEntries] = useState<MatchHistoryEntry[]>([]);
  const allDetailsRef = useRef<MatchWithDetails[]>([]);

  const applyPeriod = useCallback(
    (details: MatchWithDetails[], p: StatPeriod) => {
      const allPlayers = computeSeasonStats(details, p);
      const found = allPlayers.find((pl) =>
        playerId ? pl.playerId === playerId : pl.playerNumber === playerNumber
      );

      const filteredMatches = filterMatchesByPeriod(details.map((d) => d.match), p);
      const filteredIds = new Set(filteredMatches.map((m) => m.id));
      const filteredDetails = details.filter((d) => filteredIds.has(d.match.id));
      const history = computePlayerMatchHistory(details, playerNumber, playerId, playerName);

      setPlayerData(found ?? EMPTY_PLAYER(playerId ?? null, playerNumber, playerName, photoUrl));
      setMatchesInPeriod(filteredDetails.length);
      setHistoryEntries(history);
    },
    [playerId, playerNumber, playerName, photoUrl]
  );

  const loadData = useCallback(async () => {
    if (!user || !currentClub) return;
    try {
      setLoading(true);
      logInfo('PlayerProfileScreen', 'Chargement profil joueur', { playerNumber });
      const matchListService = ServiceFactory.getMatchListService(supabase);
      const matches = await matchListService.loadAllMatchesSorted(
        user.id,
        currentClub.id,
        activeTeamId ?? null
      );
      const details = await loadAllMatchDetails(matches, supabase);
      allDetailsRef.current = details;
      applyPeriod(details, period);
    } catch (e) {
      logError('PlayerProfileScreen', 'Erreur chargement profil', { error: e });
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentClub?.id, activeTeamId, playerNumber, applyPeriod, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportPDF = async () => {
    if (isExportingPDF || playerData.matchesPlayed === 0) return;
    setIsExportingPDF(true);
    try {
      await PDFExportService.generatePlayerSeasonPDF({
        player: playerData,
        clubLogoUrl: currentClub?.logoUrl,
        period,
      });
      posthog?.capture(ANALYTICS_EVENTS.PDF_EXPORTED, { type: ANALYTICS_PDF_EXPORT_TYPE.PLAYER_SEASON });
      recordReviewPromptSignal();
    } catch (e) {
      logError('PlayerProfileScreen', 'Erreur export PDF', { error: e });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePeriodChange = (newPeriod: StatPeriod) => {
    setPeriod(newPeriod);
    applyPeriod(allDetailsRef.current, newPeriod);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { padding: sp.md }]}
        >
          <Ionicons name="arrow-back" size={sizes.iconMd} color={colors.text.primary} />
        </TouchableOpacity>
        {playerData.matchesPlayed > 0 && (
          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={isExportingPDF}
            style={[styles.pdfBtn, { paddingVertical: sp.xs, paddingHorizontal: sp.sm }]}
          >
            {isExportingPDF ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={font.md} color={colors.primary} />
                <Text style={[styles.pdfBtnText, { color: colors.primary, fontSize: font.xs }]}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: sp.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <PlayerProfileHeader player={playerData} matchesInPeriod={matchesInPeriod} />

          <View style={{ paddingHorizontal: sp.md, paddingVertical: sp.md }}>
            <PeriodFilter selected={period} onChange={handlePeriodChange} />
          </View>

          {playerData.matchesPlayed > 0 ? (
            <PlayerSeasonStats player={playerData} />
          ) : (
            <View style={styles.noData}>
              <Text style={[styles.noDataText, { fontSize: font.md, color: colors.text.tertiary }]}>
                Aucune statistique pour cette période.
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: sp.lg }]} />

          <MatchHistoryList entries={historyEntries} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { alignSelf: 'flex-start' },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  pdfBtnText: { fontWeight: '700', letterSpacing: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noData: { alignItems: 'center', padding: 32 },
  noDataText: { textAlign: 'center' },
  divider: { height: 1 },
});
