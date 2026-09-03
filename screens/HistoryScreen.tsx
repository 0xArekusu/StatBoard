import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { INTL_LOCALES, SupportedLanguage } from "../src/i18n";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { useClub } from "../src/contexts/ClubContext";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";
import { useResponsive } from "../src/hooks/useResponsive";
import { Match } from "../src/models/types";
import { supabase } from "../src/config/supabase";
import { ROUTES } from "../constants/routes";
import { ServiceFactory } from "../services/ServiceFactory";
import { OPACITY } from "../src/theme";
import { Club } from "../models/Club";
import { TeamStatus } from "../models/Team";
import SyncErrorModal from "../components/SyncErrorModal";
import { BannerAdView } from "../components/ads/BannerAdView";
import { showErrorAlert } from "../utils/errorAlert";

interface HistoryScreenProps {
  navigation: any;
}

/**
 * HistoryScreen - Displays match history and sync management
 *
 * Features:
 * - Displays all matches (both local and synced) in chronological order
 * - Shows sync status for each match (synced to cloud or local only)
 * - Provides batch sync functionality for unsynced matches
 * - Displays match results, scores, and metadata
 * - Navigates to detailed match statistics on tap
 *
 * Sync States:
 * - SYNCED: Match data is backed up to Supabase cloud
 * - LOCAL: Match data exists only on device (not backed up)
 */
export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const posthog = usePostHog();
  const { currentClub, activeTeamId, setActiveTeamId } = useClub();
  const { sp, font, sizes } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncError, setSyncError] = useState<{
    visible: boolean;
    reason: string;
    isNotConnected?: boolean;
    isFreemium?: boolean;
  }>({
    visible: false,
    reason: "",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState<string | number | null>(null);

  useEffect(() => {
    // Only load if we have a club or are in guest mode
    if (!user || currentClub) {
      loadHistoryData();
    }
  }, [user?.id, currentClub?.id]);

  // Reload data when screen comes into focus (e.g., after switching tabs)
  useFocusEffect(
    React.useCallback(() => {
      // Only load if we have a club or are in guest mode
      if (!user || currentClub) {
        loadHistoryData();
      }
    }, [user?.id, currentClub?.id, activeTeamId])
  );

  /**
   * Loads all matches from both local storage and Supabase
   * - Fetches matches from MatchListService (combines local + cloud data)
   * - Uses current club from context to filter matches
   * - Sorts matches by date (most recent first)
   * - Updates the matches state with combined results
   */
  const loadHistoryData = async () => {
    try {
      setLoading(true);

      let clubId: string | null = null;
      let teamId: string | null = null;

      // Use current club from context
      if (user && currentClub) {
        clubId = currentClub.id;

        try {
          // Load teams for the club
          const teamService = ServiceFactory.getTeamService(supabase);
          const clubTeams = await teamService.getClubTeams(currentClub.id);

          // Filter to only show approved teams where user is the owner
          const myApprovedTeams = clubTeams.filter(
            (team) =>
              team.ownerId === user.id && team.status === TeamStatus.APPROVED
          );

          // Use activeTeamId from context if available and valid
          if (myApprovedTeams.length > 0) {
            const isActiveTeamValid = activeTeamId && myApprovedTeams.some(t => t.id === activeTeamId);

            if (isActiveTeamValid) {
              // Use the existing valid activeTeamId
              teamId = activeTeamId;
              console.log("HistoryScreen: Using existing activeTeamId", teamId);
            } else if (!activeTeamId) {
              // Only set activeTeamId if it's null (first time)
              teamId = myApprovedTeams[0].id;
              await setActiveTeamId(teamId);
              console.log("HistoryScreen: First time - selecting first team", teamId);
            } else {
              // activeTeamId is set but not valid (team was deleted?) - use it anyway for this load
              // Don't override it, let the user or Dashboard handle it
              teamId = activeTeamId;
              console.log("HistoryScreen: activeTeamId not in list but keeping it", teamId);
            }
          }
        } catch (error) {
          console.error("Error loading teams:", error);
        }
      }

      // Use MatchListService to load all matches from both sources
      const matchListService = ServiceFactory.getMatchListService(supabase);
      const allMatches = await matchListService.loadAllMatchesSorted(
        user?.id || null,
        clubId,
        teamId
      );

      setMatches(allMatches);
    } catch (error) {
      console.error("Error loading history data:", error);
      showErrorAlert({
        messageKey: "historyScreen.errors.loadFailed",
        error,
        context: "HistoryScreen",
        showRetry: true,
        onRetry: () => loadHistoryData(),
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Synchronizes all unsynced matches to Supabase cloud
   * - Uploads local-only matches to the server
   * - Shows success message with count of synced matches
   * - Shows error message if any matches fail to sync
   * - Reloads match list after successful sync
   * - Closes sync confirmation modal when complete
   */
  const handleDeleteMatch = (match: Match) => {
    Alert.alert(
      t("historyScreen.deleteAlert.title"),
      t("historyScreen.deleteAlert.message", { opponent: match.opponent_name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingMatchId(match.id);
              const matchListService = ServiceFactory.getMatchListService(supabase);
              await matchListService.deleteMatch(match, user?.id);
              posthog?.capture(ANALYTICS_EVENTS.MATCH_DELETED, { status: match.status });
              await loadHistoryData();
            } catch (error) {
              showErrorAlert({
                messageKey: "historyScreen.errors.deleteFailed",
                error,
                context: "HistoryScreen",
              });
            } finally {
              setDeletingMatchId(null);
            }
          },
        },
      ]
    );
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);

      // Use MatchSyncService to sync all pending matches
      const matchSyncService = ServiceFactory.getMatchSyncService(supabase);
      const result = await matchSyncService.syncAllPendingMatches();

      if (result.synced > 0) {
        Alert.alert(
          t("historyScreen.syncSuccessTitle"),
          t("historyScreen.syncSuccessMessage", { count: result.synced }),
        );
        // Reload data to reflect changes
        await loadHistoryData();
      }

      if (result.failed > 0) {
        // Analyze errors to determine if it's a connection or freemium issue.
        // MatchSyncService's error strings are i18n-translated, so compare against
        // the current-language translation rather than hardcoded French substrings.
        const errorMessages = result.errors.join(" ");
        const isNotConnected =
          errorMessages.includes(t("matchSyncService.authRequired")) ||
          errorMessages.includes(t("matchSyncService.userNotAuthenticated"));
        const isFreemium = errorMessages.includes(t("matchSyncService.subscriptionDoesNotAllowSync"));

        setSyncError({
          visible: true,
          reason: result.errors[0] || t("historyScreen.syncErrorFallback"),
          isNotConnected,
          isFreemium,
        });
      }

      setShowSyncModal(false);
    } catch (error) {
      console.error("Error syncing matches:", error);
      setSyncError({
        visible: true,
        reason: t("historyScreen.syncUnexpectedError"),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const bgColor = colors.background;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  // Count unsynced matches
  const unsyncedMatches = matches.filter((m) => !m.synced_to_server);
  const unsyncedCount = unsyncedMatches.length;

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {/* Sync Confirmation Modal */}
      <Modal
        visible={showSyncModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isSyncing && setShowSyncModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { padding: sp.lg }]}
          activeOpacity={1}
          onPress={() => !isSyncing && setShowSyncModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderRadius: sp.lg,
                padding: sp.lg,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              onPress={() => !isSyncing && setShowSyncModal(false)}
              style={styles.modalCloseButton}
              disabled={isSyncing}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconContainer,
                  {
                    backgroundColor: isDark
                      ? `${colors.primary}33`
                      : `${colors.primary}1A`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="cloud-upload"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: colors.text.primary,
                  },
                ]}
              >
                {t("historyScreen.syncModal.title")}
              </Text>
              <Text
                style={[
                  styles.modalDescription,
                  {
                    color: colors.text.secondary,
                  },
                ]}
              >
                {t("historyScreen.syncModal.descriptionPrefix")}{" "}
                <Text style={{ fontWeight: "bold" }}>
                  {t("historyScreen.matchCount", { count: unsyncedCount })}
                </Text>{" "}
                {t("historyScreen.syncModal.descriptionSuffix")}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handleSyncAll}
                disabled={isSyncing}
                style={[
                  styles.modalPrimaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isSyncing ? 0.5 : 1,
                  },
                ]}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons
                    name="refresh"
                    size={20}
                    color="#FFFFFF"
                  />
                )}
                <Text style={styles.modalPrimaryButtonText}>
                  {isSyncing ? t("historyScreen.syncModal.sending") : t("historyScreen.syncModal.confirm")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSyncModal(false)}
                disabled={isSyncing}
                style={[
                  styles.modalSecondaryButton,
                  {
                    backgroundColor: colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalSecondaryButtonText,
                    {
                      color: colors.text.primary,
                    },
                  ]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={[styles.content, { padding: sp.lg, paddingTop: sp.md }]}>
          {/* Title */}
          <Text style={[styles.title, { color: textPrimary, fontSize: font.xxl, marginBottom: sp.lg }]}>
            {t("historyScreen.title")}
          </Text>

          {/* Sync Banner - Only show if user is authenticated (not in guest mode) */}
          {user && unsyncedCount > 0 && (
            <TouchableOpacity
              onPress={() => setShowSyncModal(true)}
              style={[
                styles.syncBanner,
                {
                  backgroundColor: isDark
                    ? `${colors.primary}1A`
                    : `${colors.primary}0D`,
                  borderColor: isDark
                    ? `${colors.primary}33`
                    : `${colors.primary}33`,
                  padding: sp.md,
                  borderRadius: sp.md,
                  marginBottom: sp.md,
                },
              ]}
              activeOpacity={OPACITY.interaction.high}
            >
              <View style={styles.syncBannerLeft}>
                <View
                  style={[
                    styles.syncBannerIcon,
                    {
                      backgroundColor: colors.primary,
                      width: sizes.avatarSm,
                      height: sizes.avatarSm,
                      borderRadius: sizes.avatarSm / 2,
                      marginRight: sp.sm,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={sizes.iconSm}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.syncBannerTextContainer}>
                  <Text
                    style={[
                      styles.syncBannerTitle,
                      {
                        color: colors.text.primary,
                        fontSize: font.md,
                        marginBottom: sp.xs,
                      },
                    ]}
                  >
                    {t("historyScreen.unsyncedCount", { count: unsyncedCount })}
                  </Text>
                  <Text
                    style={[
                      styles.syncBannerSubtitle,
                      {
                        color: colors.primary,
                        fontSize: font.xs,
                      },
                    ]}
                  >
                    {t("historyScreen.syncNowCta")}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={sizes.iconSm}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}

          {/* Matches List */}
          {matches.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor,
                  paddingVertical: sp.xxl * 2,
                  paddingHorizontal: sp.xl,
                  borderRadius: sp.md,
                  marginTop: sp.xxl * 2,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-blank"
                size={sizes.avatarSm}
                color={textSecondary}
                style={{ opacity: 0.5 }}
              />
              <Text style={[styles.emptyStateText, { color: textSecondary, fontSize: font.lg, marginTop: sp.md }]}>
                {t("historyScreen.noMatches")}
              </Text>
            </View>
          ) : (
            <View style={[styles.matchesList, { gap: sp.md }]}>
              {matches.map((match, index) => (
                <MatchCard
                  key={`match-${match.id}-${index}`}
                  match={match}
                  isDeleting={deletingMatchId === match.id}
                  onPress={() => {
                    navigation.navigate(
                      ROUTES.MATCH_DETAILS as never,
                      {
                        match,
                      } as never,
                    );
                  }}
                  onDelete={user ? () => handleDeleteMatch(match) : undefined}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <BannerAdView />

      {/* Sync Error Modal */}
      <SyncErrorModal
        visible={syncError.visible}
        reason={syncError.reason}
        isNotConnected={syncError.isNotConnected}
        isFreemium={syncError.isFreemium}
        onClose={() => setSyncError({ visible: false, reason: "" })}
        onLogin={() => navigation.navigate(ROUTES.LOGIN)}
        onUpgrade={() => {
          // TODO: Navigate to subscription screen
          Alert.alert(t("common.info"), t("historyScreen.upgradeComingSoon"));
        }}
      />
    </>
  );
}

interface MatchCardProps {
  match: Match;
  onPress: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

/**
 * MatchCard - Individual match display card
 *
 * Displays:
 * - Match date and location (home/away)
 * - Team names and final scores
 * - Match result badge (WIN/LOSS)
 * - Sync status indicator (SYNC/LOCAL)
 * - Action button to view detailed statistics
 *
 * Visual highlights:
 * - Winning score is emphasized with primary color
 * - Losing score is dimmed
 * - Result badge uses success/error colors
 * - Sync status shows cloud icon for synced, warning for local-only
 */
function MatchCard({ match, onPress, onDelete, isDeleting }: MatchCardProps) {
  const { t, i18n } = useTranslation();
  const { isDark, colors } = useTheme();
  const { sp, font, sizes } = useResponsive();
  const scoreA = match.my_team_score || 0;
  const scoreB = match.opponent_score || 0;
  const isWin = scoreA > scoreB;
  const isSynced = Boolean(match.synced_to_server);

  /**
   * Formats a date string to French locale format
   * @param dateString - ISO date string to format
   * @returns Formatted date string (e.g., "lun. 15 janvier 2024")
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(INTL_LOCALES[i18n.language as SupportedLanguage] ?? INTL_LOCALES.fr, {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.matchCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: sp.md,
          padding: sp.md,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Date and Location */}
      <View style={[styles.matchCardHeader, { marginBottom: sp.md }]}>
        <View style={[styles.matchCardInfo, { gap: sp.xs }]}>
          <MaterialCommunityIcons
            name="calendar"
            size={font.sm}
            color={colors.text.secondary}
          />
          <Text
            style={[styles.matchCardInfoText, { color: colors.text.secondary, fontSize: font.sm }]}
          >
            {formatDate(match.ended_at || match.created_at)}
          </Text>
        </View>
        <View style={[styles.matchCardInfo, { gap: sp.xs }]}>
          <MaterialCommunityIcons
            name="map-marker"
            size={font.sm}
            color={colors.text.secondary}
          />
          <Text
            style={[styles.matchCardInfoText, { color: colors.text.secondary, fontSize: font.sm }]}
          >
            {match.is_home ? t("historyScreen.matchCard.home") : t("historyScreen.matchCard.away")}
          </Text>
        </View>
      </View>

      {/* Scores */}
      <View style={[styles.matchScores, { marginBottom: sp.sm }]}>
        {/* Left Team - Home team on left, Away team on right */}
        {match.is_home ? (
          // We are home, we go on the left
          <View style={styles.matchTeamContainer}>
            <Text
              style={[
                styles.matchScoreValue,
                {
                  color: isWin ? colors.text.primary : colors.text.tertiary,
                  fontSize: font.xxl,
                },
              ]}
            >
              {scoreA}
            </Text>
            <Text
              style={[styles.matchTeamLabel, { color: colors.text.secondary, fontSize: font.sm, marginTop: sp.xs }]}
              numberOfLines={1}
            >
              {match.my_team_name || t("historyScreen.matchCard.usFallback")}
            </Text>
          </View>
        ) : (
          // We are away, opponent goes on the left
          <View style={styles.matchTeamContainer}>
            <Text
              style={[
                styles.matchScoreValue,
                {
                  color: isWin ? colors.text.tertiary : colors.text.primary,
                  fontSize: font.xxl,
                },
              ]}
            >
              {scoreB}
            </Text>
            <Text
              style={[styles.matchTeamLabel, { color: colors.text.secondary, fontSize: font.sm, marginTop: sp.xs }]}
              numberOfLines={1}
            >
              {match.opponent_name}
            </Text>
          </View>
        )}

        {/* VS */}
        <View
          style={[
            styles.matchVs,
            {
              backgroundColor: colors.surfaceVariant,
              paddingHorizontal: sp.sm,
              paddingVertical: sp.xs,
              marginHorizontal: sp.sm,
            },
          ]}
        >
          <Text style={[styles.matchVsText, { color: colors.text.secondary, fontSize: font.sm }]}>
            {t("historyScreen.matchCard.vs")}
          </Text>
        </View>

        {/* Right Team - Home team on left, Away team on right */}
        {match.is_home ? (
          // We are home, opponent goes on the right
          <View style={styles.matchTeamContainer}>
            <Text
              style={[
                styles.matchScoreValue,
                {
                  color: isWin ? colors.text.tertiary : colors.text.primary,
                  fontSize: font.xxl,
                },
              ]}
            >
              {scoreB}
            </Text>
            <Text
              style={[styles.matchTeamLabel, { color: colors.text.secondary, fontSize: font.sm, marginTop: sp.xs }]}
              numberOfLines={1}
            >
              {match.opponent_name}
            </Text>
          </View>
        ) : (
          // We are away, we go on the right
          <View style={styles.matchTeamContainer}>
            <Text
              style={[
                styles.matchScoreValue,
                {
                  color: isWin ? colors.text.primary : colors.text.tertiary,
                  fontSize: font.xxl,
                },
              ]}
            >
              {scoreA}
            </Text>
            <Text
              style={[styles.matchTeamLabel, { color: colors.text.secondary, fontSize: font.sm, marginTop: sp.xs }]}
              numberOfLines={1}
            >
              {match.my_team_name || t("historyScreen.matchCard.usFallback")}
            </Text>
          </View>
        )}
      </View>

      {/* Result and Action */}
      <View style={[styles.matchCardFooter, { borderTopColor: colors.border, paddingTop: sp.sm }]}>
        {/* Result Badge */}
        <View style={styles.matchCardFooterLeft}>
          <View
            style={[
              styles.matchResultBadge,
              {
                backgroundColor: isWin
                  ? isDark
                    ? `${colors.success}33`
                    : `${colors.success}1A`
                  : isDark
                    ? `${colors.error}33`
                    : `${colors.error}1A`,
                paddingHorizontal: sp.sm,
                paddingVertical: sp.xs,
                borderRadius: sp.xs,
              },
            ]}
          >
            <Text
              style={[
                styles.matchResultText,
                {
                  color: isWin ? colors.success : colors.error,
                  fontSize: font.sm,
                },
              ]}
            >
              {isWin ? t("historyScreen.matchCard.win") : t("historyScreen.matchCard.loss")}
            </Text>
          </View>
        </View>

        {/* Sync Status Badge — colonne centrale */}
        <View style={styles.matchCardFooterCenter}>
          {isSynced ? (
            <View style={[styles.syncStatusBadge, { gap: sp.xs }]}>
              <MaterialCommunityIcons
                name="cloud-check"
                size={font.sm}
                color={colors.success}
                style={{ opacity: 0.4 }}
              />
              <Text
                style={[
                  styles.syncStatusText,
                  {
                    color: colors.success,
                    opacity: 0.4,
                    fontSize: font.xs,
                  },
                ]}
              >
                {t("historyScreen.matchCard.synced")}
              </Text>
            </View>
          ) : (
            <View style={[styles.syncStatusBadge, { gap: sp.xs }]}>
              <MaterialCommunityIcons
                name="cloud-off-outline"
                size={font.sm}
                color={colors.warning}
              />
              <Text
                style={[
                  styles.syncStatusText,
                  {
                    color: colors.warning,
                    fontSize: font.xs,
                  },
                ]}
              >
                {t("historyScreen.matchCard.local")}
              </Text>
            </View>
          )}
        </View>

        {/* Détails + Delete — colonne droite, contenu poussé à droite */}
        <View style={[styles.matchCardFooterRight, { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: sp.md }]}>
          <TouchableOpacity style={[styles.matchAnalyzeButton, { gap: sp.xs }]} onPress={onPress}>
            <Text style={[styles.matchAnalyzeText, { color: colors.primary, fontSize: font.xs }]}>
              {t("historyScreen.matchCard.details")}
            </Text>
            <MaterialCommunityIcons
              name="chart-bar"
              size={font.sm}
              color={colors.primary}
            />
          </TouchableOpacity>

          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              disabled={isDeleting}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={font.lg}
                  color={colors.error}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  teamSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    marginBottom: 24,
  },
  teamSelectorIcon: {
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 58,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 80,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  matchesList: {
    gap: 16,
  },
  matchCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  matchCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  matchCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchCardInfoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  matchScores: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  matchTeamContainer: {
    flex: 1,
    alignItems: "center",
  },
  matchScoreValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  matchTeamLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
    textAlign: "center",
  },
  matchVs: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginHorizontal: 8,
  },
  matchVsText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  matchCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  matchCardFooterLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  matchCardFooterCenter: {
    flex: 1,
    alignItems: "center",
  },
  matchCardFooterRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  matchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchResultText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  syncStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  syncStatusText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  matchAnalyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matchAnalyzeText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  syncBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  syncBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  syncBannerTextContainer: {
    flex: 1,
  },
  syncBannerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  syncBannerSubtitle: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  modalActions: {
    gap: 12,
  },
  modalPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  modalSecondaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
