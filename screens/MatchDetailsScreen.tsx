/**
 * MatchDetailsScreen - Modern Design
 *
 * Affiche les détails d'un match terminé avec:
 * - Vue Statistiques (table des joueurs)
 * - Vue Cartes (fiches joueurs individuelles)
 * - Vue Terrain (carte des tirs)
 * - Modal de détail joueur
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  useColorScheme,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Match, Action, Team } from '../src/models/types';

// Types
interface PlayerStats {
  playerNumber: number;
  name: string;
  team: Team;
  photoUrl?: string;
  pts: number;
  reb: number;
  reb_off: number;
  reb_def: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  ftm: number;
  fta: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  fgm: number;
  fga: number;
  eff: number;
  min: number;
}

type Tab = 'STATS' | 'CARDS' | 'COURT';
type TeamFilter = 'MyTeam' | 'Opponent';

interface RouteParams {
  match: Match;
  actions: Action[];
  fromLiveMatch?: boolean;
}

export default function MatchDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { match, actions, fromLiveMatch } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<Tab>('STATS');
  const [activeTeamFilter, setActiveTeamFilter] = useState<TeamFilter>(Team.MY_TEAM);
  const [viewPlayer, setViewPlayer] = useState<PlayerStats | null>(null);

  // Calculer les statistiques des joueurs
  const calculateStats = (teamFilter: TeamFilter): PlayerStats[] => {
    const playerStatsMap = new Map<string, PlayerStats>();

    actions
      .filter((action) => action.team === teamFilter)
      .forEach((action) => {
        const key = `${action.team}-${action.player_number}`;

        if (!playerStatsMap.has(key)) {
          playerStatsMap.set(key, {
            playerNumber: action.player_number,
            name: `Joueur ${action.player_number}`,
            team: action.team,
            pts: 0,
            reb: 0,
            reb_off: 0,
            reb_def: 0,
            ast: 0,
            stl: 0,
            blk: 0,
            to: 0,
            pf: 0,
            fgm: 0,
            fga: 0,
            ftm: 0,
            fta: 0,
            fg2m: 0,
            fg2a: 0,
            fg3m: 0,
            fg3a: 0,
            eff: 0,
            min: 0,
          });
        }

        const stats = playerStatsMap.get(key)!;

        // Points et tirs
        if (action.action_type === 'SHOT') {
          if (action.specification === 'MADE') {
            stats.pts += action.points || 0;
            stats.fgm += 1;

            if (action.points === 1) stats.ftm += 1;
            else if (action.points === 2) stats.fg2m += 1;
            else if (action.points === 3) stats.fg3m += 1;
          }

          stats.fga += 1;
          if (action.points === 1) stats.fta += 1;
          else if (action.points === 2) stats.fg2a += 1;
          else if (action.points === 3) stats.fg3a += 1;
        }

        // Rebonds
        if (action.action_type === 'REBOUND') {
          stats.reb += 1;
          if (action.specification === 'OFFENSIVE') stats.reb_off += 1;
          else if (action.specification === 'DEFENSIVE') stats.reb_def += 1;
        }

        // Autres actions
        if (action.action_type === 'ASSIST') stats.ast += 1;
        if (action.action_type === 'STEAL') stats.stl += 1;
        if (action.action_type === 'BLOCK') stats.blk += 1;
        if (action.action_type === 'TURNOVER') stats.to += 1;
        if (action.action_type === 'FOUL') stats.pf += 1;
      });

    // Calculer l'évaluation et estimer les minutes
    playerStatsMap.forEach((stats) => {
      stats.eff = stats.pts + stats.reb + stats.ast + stats.stl + stats.blk -
        ((stats.fga - stats.fgm) + (stats.fta - stats.ftm) + stats.to);

      // Estimation heuristique des minutes
      let estimatedMin = 10 + Math.floor(stats.eff / 1.5) + stats.pf * 2;
      if (estimatedMin < 5 && (stats.pts > 0 || stats.reb > 0)) estimatedMin = 8;
      if (estimatedMin > 38) estimatedMin = 36 + Math.floor(Math.random() * 4);
      if (stats.eff === 0 && stats.pts === 0 && stats.reb === 0 && stats.ast === 0) estimatedMin = 0;
      stats.min = estimatedMin;
    });

    return Array.from(playerStatsMap.values()).sort((a, b) => b.pts - a.pts);
  };

  const stats = useMemo(() => calculateStats(activeTeamFilter), [actions, activeTeamFilter]);
  const isWin = match.my_team_score > match.opponent_score;

  const colors = {
    background: isDark ? '#0a0a0a' : '#fafafa',
    surface: isDark ? '#1a1a1a' : '#ffffff',
    text: {
      primary: isDark ? '#ffffff' : '#1e293b',
      secondary: isDark ? '#94a3b8' : '#64748b',
      tertiary: isDark ? '#64748b' : '#94a3b8',
    },
    border: isDark ? '#334155' : '#e2e8f0',
    brand: '#ff6b35',
    brandLight: isDark ? 'rgba(255, 107, 53, 0.1)' : 'rgba(255, 107, 53, 0.05)',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* PLAYER DETAIL MODAL */}
      {viewPlayer && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setViewPlayer(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={[styles.modalHeaderBg, { backgroundColor: colors.brand }]} />
                <TouchableOpacity
                  onPress={() => setViewPlayer(null)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.modalPlayerAvatar}>
                  <View style={[styles.playerAvatarCircle, { borderColor: colors.surface }]}>
                    <Text style={styles.playerAvatarNumber}>{viewPlayer.playerNumber}</Text>
                  </View>
                </View>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalPlayerInfo}>
                  <Text style={[styles.modalPlayerName, { color: colors.text.primary }]}>
                    {viewPlayer.name}
                  </Text>
                  <Text style={[styles.modalPlayerTeam, { color: colors.text.secondary }]}>
                    {viewPlayer.team === Team.MY_TEAM
                      ? match.my_team_name || 'Notre équipe'
                      : match.opponent_name}
                  </Text>
                </View>

                {/* Main Stats Grid */}
                <View style={styles.mainStatsGrid}>
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statCardValue, { color: colors.text.primary }]}>
                      {viewPlayer.min}'
                    </Text>
                    <Text style={[styles.statCardLabel, { color: colors.text.tertiary }]}>
                      Temps
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}>
                    <Text style={[styles.statCardValue, { color: colors.brand }]}>
                      {viewPlayer.pts}
                    </Text>
                    <Text style={[styles.statCardLabel, { color: colors.brand }]}>
                      Points
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statCardValue, { color: colors.text.primary }]}>
                      {viewPlayer.eff}
                    </Text>
                    <Text style={[styles.statCardLabel, { color: colors.text.tertiary }]}>
                      Éval
                    </Text>
                  </View>
                </View>

                {/* Shooting Stats */}
                <View style={[styles.shootingSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    🎯 Performance aux tirs
                  </Text>
                  <ShootingBar label="3 Points" made={viewPlayer.fg3m} attempted={viewPlayer.fg3a} color="#6366f1" colors={colors} />
                  <ShootingBar label="2 Points" made={viewPlayer.fg2m} attempted={viewPlayer.fg2a} color="#3b82f6" colors={colors} />
                  <ShootingBar label="Lancers" made={viewPlayer.ftm} attempted={viewPlayer.fta} color="#f59e0b" colors={colors} />

                  <View style={[styles.shootingSummary, { borderTopColor: colors.border }]}>
                    <View style={styles.shootingSummaryItem}>
                      <Text style={[styles.shootingSummaryValue, { color: colors.text.primary }]}>
                        {viewPlayer.fgm}/{viewPlayer.fga}
                      </Text>
                      <Text style={[styles.shootingSummaryLabel, { color: colors.text.tertiary }]}>
                        TOTAL TIRS
                      </Text>
                    </View>
                    <View style={styles.shootingSummaryItem}>
                      <Text style={[styles.shootingSummaryValue, { color: colors.text.primary }]}>
                        {viewPlayer.fga > 0 ? Math.round((viewPlayer.fgm / viewPlayer.fga) * 100) : 0}%
                      </Text>
                      <Text style={[styles.shootingSummaryLabel, { color: colors.text.tertiary }]}>
                        RÉUSSITE
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Detailed Stats Grid */}
                <View style={styles.detailedStatsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Détails</Text>
                  <View style={styles.detailedStatsGrid}>
                    <StatBox label="REB" value={viewPlayer.reb} sub="Total" colors={colors} />
                    <StatBox label="AST" value={viewPlayer.ast} sub="Passes" colors={colors} />
                    <StatBox label="INT" value={viewPlayer.stl} sub="Vols" colors={colors} />
                    <StatBox label="CTR" value={viewPlayer.blk} sub="Contres" colors={colors} />
                    <StatBox label="BP" value={viewPlayer.to} sub="Pertes" colors={colors} />
                    <StatBox label="RO" value={viewPlayer.reb_off} sub="Reb Off" colors={colors} />
                    <StatBox label="RD" value={viewPlayer.reb_def} sub="Reb Def" colors={colors} />
                    <StatBox label="FTE" value={viewPlayer.pf} sub="Fautes" colors={colors} />
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.headerAccent, { backgroundColor: colors.brand }]} />
        <View style={styles.headerTop}>
          {!fromLiveMatch ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
              <Text style={[styles.backButtonText, { color: colors.text.secondary }]}>RETOUR</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('Dashboard' as never)}
            style={[styles.menuButton, { backgroundColor: colors.background }]}
          >
            <Ionicons name="grid-outline" size={12} color={colors.text.secondary} />
            <Text style={[styles.menuButtonText, { color: colors.text.secondary }]}>Menu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.teamScore}>
            <Text style={[styles.teamLabel, { color: colors.text.secondary }]}>
              {match.my_team_name || 'Notre équipe'}
            </Text>
            <Text style={[styles.scoreValue, { color: colors.text.primary }]}>
              {match.my_team_score}
            </Text>
            {isWin && <Ionicons name="trophy" size={16} color={colors.brand} />}
          </View>

          <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />

          <View style={styles.teamScore}>
            <Text style={[styles.teamLabel, { color: colors.text.secondary }]}>
              {match.opponent_name}
            </Text>
            <Text style={[styles.scoreValue, { color: colors.text.tertiary }]}>
              {match.opponent_score}
            </Text>
            {!isWin && <Ionicons name="trophy" size={16} color={colors.text.tertiary} />}
          </View>
        </View>
      </View>

      {/* FILTERS & TABS */}
      <View style={[styles.filtersTabsContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.teamFilterContainer, { backgroundColor: isDark ? '#27272a' : '#e2e8f0' }]}>
          <TouchableOpacity
            onPress={() => setActiveTeamFilter(Team.MY_TEAM)}
            style={[
              styles.teamFilterButton,
              activeTeamFilter === Team.MY_TEAM && { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[
                styles.teamFilterText,
                { color: activeTeamFilter === Team.MY_TEAM ? colors.brand : colors.text.secondary },
              ]}
            >
              NOUS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTeamFilter(Team.OPPONENT)}
            style={[
              styles.teamFilterButton,
              activeTeamFilter === Team.OPPONENT && { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[
                styles.teamFilterText,
                { color: activeTeamFilter === Team.OPPONENT ? colors.text.primary : colors.text.secondary },
              ]}
            >
              EUX
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('STATS')}
            style={[
              styles.tabButton,
              { backgroundColor: activeTab === 'STATS' ? colors.brand : colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="list" size={20} color={activeTab === 'STATS' ? '#fff' : colors.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('CARDS')}
            style={[
              styles.tabButton,
              { backgroundColor: activeTab === 'CARDS' ? colors.brand : colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="person-outline" size={20} color={activeTab === 'CARDS' ? '#fff' : colors.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('COURT')}
            style={[
              styles.tabButton,
              { backgroundColor: activeTab === 'COURT' ? colors.brand : colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="basketball-outline" size={20} color={activeTab === 'COURT' ? '#fff' : colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* TABLE VIEW */}
        {activeTab === 'STATS' && (
          <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { backgroundColor: isDark ? '#1e293b33' : '#f1f5f9' }]}>
              <Text style={[styles.tableHeaderCell, styles.playerCell, { color: colors.text.secondary }]}>JOUEUR</Text>
              <Text style={[styles.tableHeaderCell, styles.minCell, { color: colors.text.tertiary }]}>MIN</Text>
              <Text style={[styles.tableHeaderCell, styles.statCell, { color: colors.text.secondary }]}>PTS</Text>
              <Text style={[styles.tableHeaderCell, styles.statCell, { color: colors.text.secondary }]}>REB</Text>
              <Text style={[styles.tableHeaderCell, styles.statCell, { color: colors.text.secondary }]}>AST</Text>
              <Text style={[styles.tableHeaderCell, styles.statCell, { color: colors.text.secondary }]}>PF</Text>
              <Text style={[styles.tableHeaderCell, styles.statCell, { color: colors.text.secondary }]}>EFF</Text>
            </View>

            {/* Table Body */}
            {stats.map((player, index) => (
              <TouchableOpacity
                key={`${player.team}-${player.playerNumber}`}
                onPress={() => setViewPlayer(player)}
                style={[
                  styles.tableRow,
                  { borderBottomColor: colors.border },
                  index === stats.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[styles.tableCell, styles.playerCell]}>
                  <View style={[styles.playerNumberBadge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.playerNumberBadgeText, { color: colors.text.secondary }]}>
                      {player.playerNumber}
                    </Text>
                  </View>
                  <Text style={[styles.playerNameText, { color: colors.text.primary }]} numberOfLines={1}>
                    {player.name}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.minCell, { color: colors.text.tertiary }]}>{player.min}'</Text>
                <Text style={[styles.tableCell, styles.statCell, styles.statCellBold, { color: colors.text.primary }]}>
                  {player.pts}
                </Text>
                <Text style={[styles.tableCell, styles.statCell, { color: colors.text.primary }]}>{player.reb}</Text>
                <Text style={[styles.tableCell, styles.statCell, { color: colors.text.primary }]}>{player.ast}</Text>
                <Text style={[styles.tableCell, styles.statCell, { color: colors.text.primary }]}>{player.pf}</Text>
                <Text style={[styles.tableCell, styles.statCell, styles.statCellBold, { color: colors.brand }]}>
                  {player.eff}
                </Text>
              </TouchableOpacity>
            ))}

            {stats.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.tertiary }]}>
                  Aucune donnée disponible
                </Text>
              </View>
            )}
          </View>
        )}

        {/* CARDS VIEW */}
        {activeTab === 'CARDS' && (
          <View style={styles.cardsContainer}>
            {stats.map((player) => (
              <TouchableOpacity
                key={`${player.team}-${player.playerNumber}`}
                onPress={() => setViewPlayer(player)}
                style={[styles.playerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardPlayerInfo}>
                    <View style={[styles.cardAvatar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.cardAvatarText, { color: colors.text.primary }]}>
                        {player.playerNumber}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.cardPlayerName, { color: colors.text.primary }]}>{player.name}</Text>
                      <Text style={[styles.cardPlayerNumber, { color: colors.text.secondary }]}>
                        #{player.playerNumber}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.cardPointsBadge, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}>
                    <Text style={[styles.cardPointsValue, { color: colors.brand }]}>{player.pts}</Text>
                    <Text style={[styles.cardPointsLabel, { color: colors.brand }]}>Points</Text>
                  </View>
                </View>

                {/* Shooting Bars */}
                <View style={styles.cardShootingBars}>
                  <ShootingBar label="3 PTS" made={player.fg3m} attempted={player.fg3a} color="#6366f1" colors={colors} compact />
                  <ShootingBar label="2 PTS" made={player.fg2m} attempted={player.fg2a} color="#3b82f6" colors={colors} compact />
                  <ShootingBar label="LANC" made={player.ftm} attempted={player.fta} color="#f59e0b" colors={colors} compact />
                </View>

                {/* Stats Grid */}
                <View style={[styles.cardStatsGrid, { borderTopColor: colors.border }]}>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>MIN</Text>
                    <Text style={[styles.cardStatValue, { color: colors.text.primary }]}>{player.min}'</Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>REB</Text>
                    <Text style={[styles.cardStatValue, { color: colors.text.primary }]}>{player.reb}</Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>AST</Text>
                    <Text style={[styles.cardStatValue, { color: colors.text.primary }]}>{player.ast}</Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>INT</Text>
                    <Text style={[styles.cardStatValue, { color: colors.text.primary }]}>{player.stl}</Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>CTR</Text>
                    <Text style={[styles.cardStatValue, { color: colors.text.primary }]}>{player.blk}</Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>BP</Text>
                    <Text style={[styles.cardStatValue, { color: colors.text.primary }]}>{player.to}</Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>FT</Text>
                    <Text style={[styles.cardStatValue, { color: colors.text.primary }]}>{player.pf}</Text>
                  </View>
                  <View style={[styles.cardStatItem, { backgroundColor: colors.background }]}>
                    <Text style={[styles.cardStatLabel, { color: colors.text.tertiary }]}>ÉVAL</Text>
                    <Text style={[styles.cardStatValue, { color: player.eff >= 15 ? colors.brand : colors.text.primary }]}>
                      {player.eff}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {stats.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.tertiary }]}>Aucune statistique.</Text>
              </View>
            )}
          </View>
        )}

        {/* COURT VIEW */}
        {activeTab === 'COURT' && (
          <View style={[styles.courtContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyStateText, { color: colors.text.tertiary }]}>
              Carte des tirs - À venir
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
interface ShootingBarProps {
  label: string;
  made: number;
  attempted: number;
  color: string;
  colors: any;
  compact?: boolean;
}

const ShootingBar: React.FC<ShootingBarProps> = ({ label, made, attempted, color, colors, compact }) => {
  const pct = attempted > 0 ? Math.round((made / attempted) * 100) : 0;

  return (
    <View style={[styles.shootingBar, compact && styles.shootingBarCompact]}>
      <Text style={[styles.shootingBarLabel, { color: colors.text.secondary }, compact && styles.shootingBarLabelCompact]}>
        {label}
      </Text>
      <View style={[styles.shootingBarTrack, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }, compact && styles.shootingBarTrackCompact]}>
        <View style={[styles.shootingBarFill, { backgroundColor: color, width: `${pct}%` }]} />
      </View>
      <Text style={[styles.shootingBarValue, { color: colors.text.primary }, compact && styles.shootingBarValueCompact]}>
        <Text style={styles.shootingBarValueBold}>{made}/{attempted}</Text>
        <Text style={[styles.shootingBarPct, { color: colors.text.tertiary }]}> ({pct}%)</Text>
      </Text>
    </View>
  );
};

const isDark = false; // Placeholder - will be replaced by useColorScheme in component

interface StatBoxProps {
  label: string;
  value: number | string;
  sub?: string;
  colors: any;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, sub, colors }) => (
  <View style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
    <Text style={[styles.statBoxLabel, { color: colors.text.tertiary }]}>{label}</Text>
    <Text style={[styles.statBoxValue, { color: colors.text.primary }]}>{value}</Text>
    {sub && <Text style={[styles.statBoxSub, { color: colors.text.tertiary }]}>{sub}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  menuButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  scoreDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 16,
  },

  // Filters & Tabs
  filtersTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  teamFilterContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    flex: 1,
  },
  teamFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  teamFilterText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Table View
  tableContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 80,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 12,
  },
  playerCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  minCell: {
    width: 40,
    textAlign: 'center',
  },
  statCell: {
    width: 40,
    textAlign: 'center',
  },
  statCellBold: {
    fontWeight: '900',
  },

  // Cards View
  cardsContainer: {
    gap: 16,
    marginBottom: 80,
  },
  playerCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 20,
    fontWeight: '900',
  },
  cardPlayerName: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  cardPlayerNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  cardPointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardPointsValue: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 28,
  },
  cardPointsLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardShootingBars: {
    gap: 8,
    marginBottom: 20,
  },
  cardStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cardStatItem: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 4,
  },
  cardStatLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardStatValue: {
    fontSize: 14,
    fontWeight: '900',
  },

  // Shooting Bar
  shootingBar: {
    gap: 8,
  },
  shootingBarCompact: {
    gap: 4,
  },
  shootingBarLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  shootingBarLabelCompact: {
    fontSize: 10,
  },
  shootingBarTrack: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  shootingBarTrackCompact: {
    height: 8,
  },
  shootingBarFill: {
    height: '100%',
  },
  shootingBarValue: {
    fontSize: 12,
  },
  shootingBarValueCompact: {
    fontSize: 10,
  },
  shootingBarValueBold: {
    fontWeight: '700',
  },
  shootingBarPct: {
    fontSize: 10,
  },

  // Stat Box
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statBoxLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 16,
  },
  statBoxSub: {
    fontSize: 8,
    marginTop: 2,
  },

  // Court View
  courtContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },

  // Empty State
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    height: 128,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPlayerAvatar: {
    position: 'absolute',
    bottom: -48,
  },
  playerAvatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#cbd5e1',
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#64748b',
  },
  modalScroll: {
    flex: 1,
  },
  modalPlayerInfo: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalPlayerName: {
    fontSize: 24,
    fontWeight: '900',
    textTransform: 'uppercase',
    lineHeight: 24,
  },
  modalPlayerTeam: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 28,
  },
  statCardLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  shootingSection: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  shootingSummary: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  shootingSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  shootingSummaryValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  shootingSummaryLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  detailedStatsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  detailedStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
