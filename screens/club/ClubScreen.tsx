import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity, Alert,
  ActivityIndicator
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { useClub } from "../../src/contexts/ClubContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import { ClubStorageService } from "../../services/ClubStorageService";
import { Team, TeamStatus } from "../../models/Team";
import { SubscriptionTier, SUBSCRIPTION_LIMITS, SUBSCRIPTION_TIER } from "../../models/Subscription";
import {
  JoinClubForm,
  SubscriptionView,
  ClubInfoView,
  CreateClubForm,
} from "../../components/Club";
import { ROUTES } from "../../constants/routes";
import { showErrorAlert } from "../../utils/errorAlert";
import {
  CLUB_SUB_TAB,
  ClubSubTab,
  CLUB_TAB,
  ClubTab, ClubFormData,
  INITIAL_CLUB_FORM_DATA,
  ANALYTICS_EVENTS
} from "../../constants";
import { usePostHog } from "posthog-react-native";

interface ClubScreenProps {
  navigation: any;
}

/**
 * ClubScreen - Main screen for managing clubs and teams
 *
 * Features:
 * - Create a new club or join an existing one
 * - View and edit club information (for owners)
 * - Manage teams (create, approve, reject, delete)
 * - View subscription information and limits
 * - Color customization for club branding
 *
 * User Roles:
 * - Owner: Full access to club settings and team management
 * - Member: Can create teams but needs owner approval
 */
export default function ClubScreen({ navigation }: ClubScreenProps) {
  const { t } = useTranslation();
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const posthog = usePostHog();
  const { currentClub, refreshClubs } = useClub();
  const { sp, font, isCompact } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<ClubTab>(CLUB_TAB.CREATE);
  const [subTab, setSubTab] = useState<ClubSubTab>(CLUB_SUB_TAB.INFO);
  const [subscriptionName, setSubscriptionName] = useState<string>("");

  // Create Club Form
  const [formData, setFormData] = useState<ClubFormData>(INITIAL_CLUB_FORM_DATA);

  // Add Team Logic

  useEffect(() => {
    loadClubData();
  }, [user?.id, currentClub?.id]);

  useFocusEffect(
    useCallback(() => {
      if (currentClub) {
        loadClubData();
      }
    }, [currentClub?.id]),
  );

  /**
   * Loads teams for the current club from context
   * - Uses current club from ClubContext
   * - Loads teams for the current club
   * - Sets loading states appropriately
   */
  const loadClubData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (currentClub) {
        const teamService = ServiceFactory.getTeamService(supabase);
        const clubTeams = await teamService.getClubTeams(currentClub.id);
        setTeams(clubTeams);

        // Load subscription name from database
        const subscriptionService = ServiceFactory.getSubscriptionService(supabase);
        const limits = await subscriptionService.getLimitsForTier(currentClub.subscriptionTier);
        setSubscriptionName(limits.name || currentClub.subscriptionTier);
      }
    } catch (error) {
      console.error("Error loading club data:", error);
      showErrorAlert({
        messageKey: "clubScreen.errors.loadFailed",
        error,
        context: "ClubScreen",
        showRetry: true,
        onRetry: () => loadClubData(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter teams: owners see all, members see only their own
  const visibleTeams = teams.filter((team) => {
    if (!currentClub || !user) return false;
    if (currentClub.ownerId === user.id) return true; // Owner sees all
    return team.ownerId === user.id; // Members see only their teams
  });

  // Count only approved teams for subscription limits
  const approvedTeams = teams.filter(
    (team) => team.status === TeamStatus.APPROVED,
  );
  const currentTeamCount = approvedTeams.length;
  const currentTier: SubscriptionTier = currentClub?.subscriptionTier || SUBSCRIPTION_TIER.FREE;
  const maxTeams = SUBSCRIPTION_LIMITS[currentTier].maxTeams;
  const isLimitReached = currentTeamCount >= maxTeams;
  const isOwner = currentClub?.ownerId === user?.id;

  /**
   * Handles adding a new team to the club
   * - Checks subscription limits before allowing team creation
   * - Shows alert if limit is reached
   * - Navigates to team creation screen if allowed
   */
  const handleAddTeam = () => {
    if (!currentClub) return;
    if (isLimitReached) {
      posthog?.capture(ANALYTICS_EVENTS.TEAM_LIMIT_REACHED, {
        tier: currentTier,
        max_teams: maxTeams,
      });
      Alert.alert(
        t("clubScreen.alerts.teamLimitReachedTitle"),
        t("clubScreen.alerts.teamLimitReachedMessage", { tier: currentTier, maxTeams }),
      );
      return;
    }

    navigation.navigate(ROUTES.TEAM_INFO, { clubId: currentClub.id });
  };

  /**
   * Approves a pending team (owner only)
   * - Shows confirmation dialog
   * - Updates team status to APPROVED
   * - Reloads club data to reflect changes
   * @param teamId - ID of the team to approve
   */
  const handleApproveTeam = async (teamId: string) => {
    if (!currentClub || !isOwner || !user) return;
    Alert.alert(
      t("clubScreen.alerts.approveTeamTitle"),
      t("clubScreen.alerts.approveTeamMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("clubScreen.alerts.approveButton"),
          onPress: async () => {
            try {
              const teamService = ServiceFactory.getTeamService(supabase);
              await teamService.updateTeamStatus(
                teamId,
                TeamStatus.APPROVED,
                user.id,
              );
              await loadClubData();
              posthog?.capture(ANALYTICS_EVENTS.TEAM_STATUS_UPDATED, { status: TeamStatus.APPROVED });
              Alert.alert(t("common.success"), t("clubScreen.alerts.teamApprovedSuccess"));
            } catch (error) {
              console.error("Error approving team:", error);
              showErrorAlert({
                messageKey: "clubScreen.errors.approveTeamFailed",
                error,
                context: "ClubScreen",
              });
            }
          },
        },
      ],
    );
  };

  /**
   * Rejects a pending team (owner only)
   * - Shows confirmation dialog
   * - Updates team status to REJECTED
   * - Team creator will be notified of rejection
   * - Reloads club data to reflect changes
   * @param teamId - ID of the team to reject
   */
  const handleRejectTeam = async (teamId: string) => {
    if (!currentClub || !isOwner || !user) return;
    Alert.alert(
      t("clubScreen.alerts.rejectTeamTitle"),
      t("clubScreen.alerts.rejectTeamMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("clubScreen.alerts.rejectButton"),
          style: "destructive",
          onPress: async () => {
            try {
              const teamService = ServiceFactory.getTeamService(supabase);
              await teamService.updateTeamStatus(
                teamId,
                TeamStatus.REJECTED,
                user.id,
              );
              await loadClubData();
              posthog?.capture(ANALYTICS_EVENTS.TEAM_STATUS_UPDATED, { status: TeamStatus.REJECTED });
              Alert.alert(t("clubScreen.alerts.teamRejectedSuccess"));
            } catch (error) {
              console.error("Error rejecting team:", error);
              showErrorAlert({
                messageKey: "clubScreen.errors.rejectTeamFailed",
                error,
                context: "ClubScreen",
              });
            }
          },
        },
      ],
    );
  };

  /**
   * Permanently deletes a team (owner only)
   * - Shows confirmation dialog with warning
   * - Deletes team and all associated data
   * - Action is irreversible
   * - Reloads club data to reflect changes
   * @param teamId - ID of the team to delete
   */
  const handleDeleteTeam = async (teamId: string) => {
    if (!currentClub || !isOwner || !user) return;
    Alert.alert(
      t("clubScreen.alerts.deleteTeamTitle"),
      t("clubScreen.alerts.deleteTeamMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const teamService = ServiceFactory.getTeamService(supabase);
              await teamService.deleteTeam(teamId, user.id);
              await loadClubData();
              Alert.alert(t("clubScreen.alerts.teamDeletedSuccess"));
            } catch (error) {
              console.error("Error deleting team:", error);
              showErrorAlert({
                messageKey: "clubScreen.errors.deleteTeamFailed",
                error,
                context: "ClubScreen",
              });
            }
          },
        },
      ],
    );
  };

  /**
   * Handles club logo image selection
   * - Requests media library permissions
   * - Opens image picker with 1:1 aspect ratio
   * - Stores local URI (upload happens on submit)
   */
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      setFormData({ ...formData, logoUri: localUri });
    }
  };

  /**
   * Soumet le formulaire de l'état vide de l'onglet (aucun club) :
   * - CREATE (activeTab = CREATE) : crée le 1er club, user = owner
   * - JOIN (activeTab = JOIN) : rejoint un club via son code
   * La création d'un club supplémentaire et l'édition passent par ClubFormScreen.
   */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
    if (activeTab === CLUB_TAB.CREATE) {
      // CREATE MODE - Validation
      if (!formData.name || !formData.acronym) {
        Alert.alert(t("common.error"), t("clubScreen.alerts.nameAndAcronymRequired"));
        return;
      }
      if (!user) return;

      try {
        const clubService = ServiceFactory.getClubService(supabase);

        // Create club first (without logo) so we have a real clubId for storage RLS
        const result = await clubService.createClub(
          {
            name: formData.name,
            acronym: formData.acronym,
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
            courtBackgroundColor: formData.courtColor,
            courtLineColor: formData.courtLinesColor,
          },
          user!.id,
        );

        console.log('🏀 Club creation result:', result);

        if (!result.success || !result.club) {
          showErrorAlert({
            messageKey: "clubScreen.errors.createClubFailed",
            error: new Error(result.error || t("clubScreen.errors.createClubFailed")),
            context: "ClubScreen",
          });
          return;
        }

        // Upload logo now that the club exists in DB (RLS will pass)
        if (formData.logoUri && formData.logoUri.startsWith('file://')) {
          const clubStorageService = new ClubStorageService(supabase);
          const { path, error } = await clubStorageService.uploadClubLogo(
            formData.logoUri,
            result.club.id,
          );

          if (error) {
            showErrorAlert({
              messageKey: "clubScreen.errors.uploadClubLogoFailed",
              error: new Error(t("clubScreen.errors.uploadClubLogoFailed")),
              context: "ClubScreen",
            });
          } else if (path) {
            console.log('📸 Logo uploaded (path):', path);
            await clubService.updateClub(result.club.id, { logoUrl: path });
          }
        }

        // Refresh clubs to get the newly created club
        await refreshClubs();

        // Reset states
        setFormData(INITIAL_CLUB_FORM_DATA);
        setActiveTab(CLUB_TAB.CREATE);

        posthog?.capture(ANALYTICS_EVENTS.CLUB_CREATED);
        Alert.alert(t("common.success"), t("clubScreen.alerts.clubCreatedSuccess"));
      } catch (error) {
        console.error("Error creating club:", error);
        showErrorAlert({
          messageKey: "clubScreen.errors.createClubFailed",
          error,
          context: "ClubScreen",
        });
      }
    } else {
      // Join logic - Validation
      if (!formData.code) {
        Alert.alert(t("common.error"), t("clubScreen.alerts.codeRequired"));
        return;
      }
      if (!user) return;

      try {
        // Find club by code
        const clubService = ServiceFactory.getClubService(supabase);
        const clubToJoin = await clubService.getClubByCode(formData.code);

        if (!clubToJoin) {
          Alert.alert(t("common.error"), t("clubScreen.alerts.clubNotFoundByCode"));
          return;
        }

        // Join the club as a member
        const clubMemberService = ServiceFactory.getClubMemberService(supabase);
        const result = await clubMemberService.joinClub(
          clubToJoin.id,
          user.id,
          user.email!,
          user.user_metadata?.full_name,
        );

        if (!result.success) {
          Alert.alert(
            t("common.error"),
            result.error || t("clubScreen.alerts.joinFailed"),
          );
          return;
        }

        // Refresh clubs to get the joined club
        await refreshClubs();

        // Reset form
        setFormData(INITIAL_CLUB_FORM_DATA);
        setActiveTab(CLUB_TAB.CREATE);

        posthog?.capture(ANALYTICS_EVENTS.CLUB_JOINED);
        Alert.alert(
          t("common.success"),
          t("clubScreen.alerts.joinedSuccess", { name: clubToJoin.name }),
        );
      } catch (error) {
        console.error("Error joining club:", error);
        Alert.alert(
          t("common.error"),
          t("clubScreen.alerts.joinUnexpectedError"),
        );
      }
    }
    } finally {
      setSubmitting(false);
    }
  };

  const bgColor = colors.background;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

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

  // --- INSIDE A CLUB ---
  if (currentClub) {
    // Édition du club : écran dédié plein écran
    const handleEditClub = () => {
      navigation.navigate(ROUTES.CLUB_FORM, { mode: "edit" });
    };

    /**
     * Toggles between subscription view and info view
     * - Switches from SUBSCRIPTION tab to INFO tab and vice versa
     * - Allows users to view either subscription details or club information
     */
    const handleToggleSubTab = () => {
      setSubTab(
        subTab === CLUB_SUB_TAB.SUBSCRIPTION
          ? CLUB_SUB_TAB.INFO
          : CLUB_SUB_TAB.SUBSCRIPTION
      );
    };

    return (
      <>
        {/* SUBSCRIPTION VIEW */}
        {subTab === CLUB_SUB_TAB.SUBSCRIPTION ? (
          <SubscriptionView
            club={currentClub}
            onClose={() => setSubTab(CLUB_SUB_TAB.INFO)}
            onSubscriptionUpdated={async (updatedClub) => {
              // Refresh clubs to get updated subscription tier
              await refreshClubs();
              // Reload teams and club data
              await loadClubData();
            }}
          />
        ) : (
          <ClubInfoView
            club={currentClub}
            teams={teams}
            isOwner={isOwner}
            currentUserId={user?.id}
            onEditClub={handleEditClub}
            onToggleSubTab={handleToggleSubTab}
            subTab={subTab}
            navigation={navigation}
            onApproveTeam={handleApproveTeam}
            onRejectTeam={handleRejectTeam}
            onDeleteTeam={handleDeleteTeam}
            onAddTeam={handleAddTeam}
            visibleTeams={visibleTeams}
            currentTeamCount={currentTeamCount}
            maxTeams={maxTeams}
            isLimitReached={isLimitReached}
            currentTier={currentTier}
            subscriptionName={subscriptionName}
          />
        )}
      </>
    );
  }

  // --- JOIN OR CREATE FIRST CLUB (état vide de l'onglet) ---
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        style={[styles.content, { padding: sp.lg, paddingTop: sp.md }]}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: textPrimary, fontSize: font.xxl, marginBottom: sp.lg }]}>
          {t("clubScreen.spaceTitle")}
        </Text>

        {/* Tabs */}
        <View
            style={[
              styles.tabs,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor,
                marginBottom: sp.xl,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setActiveTab(CLUB_TAB.CREATE)}
              style={[
                styles.tab,
                { paddingVertical: sp.sm },
                activeTab === CLUB_TAB.CREATE && {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === CLUB_TAB.CREATE
                        ? colors.text.primary
                        : textSecondary,
                    fontSize: font.md,
                  },
                ]}
              >
                {t("clubScreen.createTab")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab(CLUB_TAB.JOIN)}
              style={[
                styles.tab,
                { paddingVertical: sp.sm },
                activeTab === CLUB_TAB.JOIN && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === CLUB_TAB.JOIN
                        ? colors.text.primary
                        : textSecondary,
                    fontSize: font.md,
                  },
                ]}
              >
                {t("clubScreen.joinTab")}
              </Text>
            </TouchableOpacity>
        </View>

        {activeTab === CLUB_TAB.CREATE ? (
          <CreateClubForm
            formData={formData}
            setFormData={setFormData}
            onPickImage={handlePickImage}
            onSubmit={handleSubmit}
            isEditMode={false}
          />
        ) : (
          <JoinClubForm
            clubCode={formData.code}
            setClubCode={(code) => setFormData({ ...formData, code })}
            onSubmit={handleSubmit}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { padding: sp.lg }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[
            styles.submitButton,
            {
              backgroundColor: submitting ? colors.text.secondary : colors.primary,
              opacity: submitting ? 0.7 : 1,
              padding: isCompact ? sp.md : sp.md,
            }
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={colors.text.primary}
              />
              <Text style={[styles.submitButtonText, { color: colors.text.primary, fontSize: font.lg }]}>
                {activeTab === CLUB_TAB.CREATE
                  ? t("clubScreen.createMyClubButton")
                  : t("clubScreen.joinTab")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
