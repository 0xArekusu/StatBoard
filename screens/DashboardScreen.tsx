import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from '../src/theme/clubDefaults';
import { MatchRepository } from '../src/services/database/MatchRepository';
import { Match } from '../src/models/types';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [winsLosses, setWinsLosses] = useState({ wins: 0, losses: 0 });

  const isGuest = !user;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Invité';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const matchRepo = new MatchRepository();
      const matches = await matchRepo.getAllMatches();

      // Filter completed matches
      const completedMatches = matches.filter(m => m.status === 'completed');
      setTotalMatches(completedMatches.length);

      // Get recent matches (last 3)
      const recent = completedMatches
        .sort((a, b) => new Date(b.ended_at || b.created_at).getTime() - new Date(a.ended_at || a.created_at).getTime())
        .slice(0, 3);
      setRecentMatches(recent);

      // Calculate wins/losses (assuming team A is "our" team)
      let wins = 0;
      let losses = 0;
      completedMatches.forEach(match => {
        if (match.final_score_a !== undefined && match.final_score_b !== undefined) {
          if (match.final_score_a > match.final_score_b) {
            wins++;
          } else if (match.final_score_b > match.final_score_a) {
            losses++;
          }
        }
      });
      setWinsLosses({ wins, losses });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.navigate('Auth');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BRAND_COLORS[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: textSecondary }]}>Bonjour,</Text>
          <Text style={[styles.userName, { color: textPrimary }]}>{userName}</Text>
          {isGuest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Mode Invité</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            <MaterialCommunityIcons
              name={isDark ? "white-balance-sunny" : "moon-waning-crescent"}
              size={24}
              color={textPrimary}
            />
          </TouchableOpacity>

          {!isGuest && (
            <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
              <MaterialCommunityIcons name="logout" size={24} color={textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
            <MaterialCommunityIcons name="basketball" size={32} color={BRAND_COLORS[500]} />
            <Text style={[styles.statValue, { color: textPrimary }]}>{totalMatches}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Matchs joués</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
            <MaterialCommunityIcons name="trophy" size={32} color={BRAND_COLORS[500]} />
            <Text style={[styles.statValue, { color: textPrimary }]}>
              {winsLosses.wins}/{winsLosses.losses}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Victoires/Défaites</Text>
          </View>
        </View>

        {/* New Match Button */}
        <TouchableOpacity
          style={[styles.newMatchButton, { backgroundColor: BRAND_COLORS[500] }]}
          onPress={() => {
            // Navigation to be implemented later
          }}
        >
          <MaterialCommunityIcons name="plus-circle" size={24} color={COMMON_COLORS.white} />
          <Text style={styles.newMatchButtonText}>Nouveau Match</Text>
        </TouchableOpacity>

        {/* Recent Matches */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Matchs récents</Text>

          {recentMatches.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: surfaceColor, borderColor }]}>
              <MaterialCommunityIcons name="basketball-hoop-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyStateText, { color: textSecondary }]}>
                Aucun match joué pour le moment
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: textSecondary }]}>
                Commencez par créer votre premier match !
              </Text>
            </View>
          ) : (
            recentMatches.map((match) => {
              const scoreA = match.final_score_a || 0;
              const scoreB = match.final_score_b || 0;
              const isWin = scoreA > scoreB;

              return (
                <View
                  key={match.id}
                  style={[styles.matchCard, { backgroundColor: surfaceColor, borderColor }]}
                >
                  <View style={styles.matchHeader}>
                    <Text style={[styles.matchDate, { color: textSecondary }]}>
                      {formatDate(match.ended_at || match.created_at)}
                    </Text>
                    <View style={[
                      styles.resultBadge,
                      { backgroundColor: isWin ? '#10b981' : '#ef4444' }
                    ]}>
                      <Text style={styles.resultBadgeText}>{isWin ? 'V' : 'D'}</Text>
                    </View>
                  </View>

                  <View style={styles.matchScore}>
                    <View style={styles.matchTeam}>
                      <Text style={[styles.teamName, { color: textPrimary }]}>
                        {match.team_a_name}
                      </Text>
                      <Text style={[
                        styles.score,
                        { color: textPrimary, fontWeight: isWin ? 'bold' : 'normal' }
                      ]}>
                        {scoreA}
                      </Text>
                    </View>

                    <Text style={[styles.scoreSeparator, { color: textSecondary }]}>-</Text>

                    <View style={styles.matchTeam}>
                      <Text style={[styles.teamName, { color: textPrimary }]}>
                        {match.team_b_name}
                      </Text>
                      <Text style={[
                        styles.score,
                        { color: textPrimary, fontWeight: !isWin ? 'bold' : 'normal' }
                      ]}>
                        {scoreB}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* CTA for users without club (not guests) */}
        {!isGuest && (
          <View style={[styles.ctaCard, { backgroundColor: surfaceColor, borderColor }]}>
            <MaterialCommunityIcons name="account-group" size={32} color={BRAND_COLORS[500]} />
            <Text style={[styles.ctaTitle, { color: textPrimary }]}>Rejoignez un club</Text>
            <Text style={[styles.ctaDescription, { color: textSecondary }]}>
              Créez ou rejoignez un club pour gérer vos équipes et accéder à plus de fonctionnalités
            </Text>
            <TouchableOpacity
              style={[styles.ctaButton, { borderColor: BRAND_COLORS[500] }]}
              onPress={() => {
                // Navigation to Club tab to be implemented
              }}
            >
              <Text style={[styles.ctaButtonText, { color: BRAND_COLORS[500] }]}>
                Gérer mon club
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  guestBadge: {
    backgroundColor: BRAND_COLORS[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  guestBadgeText: {
    color: COMMON_COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  newMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  newMatchButtonText: {
    color: COMMON_COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  matchCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchDate: {
    fontSize: 14,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resultBadgeText: {
    color: COMMON_COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeam: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 14,
    marginBottom: 4,
  },
  score: {
    fontSize: 28,
  },
  scoreSeparator: {
    fontSize: 24,
    marginHorizontal: 16,
  },
  ctaCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  ctaDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
