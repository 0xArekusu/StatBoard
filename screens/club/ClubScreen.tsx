import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import { PhotoUploadService } from "../../services/PhotoUploadService";
import { Club } from "../../models/Club";
import { Team, TeamStatus } from "../../models/Team";
import { SubscriptionTier, SUBSCRIPTION_LIMITS, SUBSCRIPTION_TIER } from "../../models/Subscription";
import {
  JoinClubForm,
  SubscriptionView,
  ClubInfoView,
  CreateClubForm,
} from "../../components/Club";
import { ROUTES } from "../../constants/routes";
import {
  CLUB_SUB_TAB,
  ClubSubTab,
  CLUB_TAB,
  ClubTab,
  CLUB_COLOR_PALETTE,
  COURT_COLOR_PALETTE,
  ClubFormData,
  INITIAL_CLUB_FORM_DATA,
} from "../../constants";

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
  const { isDark, colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<ClubTab>(CLUB_TAB.CREATE);
  const [subTab, setSubTab] = useState<ClubSubTab>(CLUB_SUB_TAB.INFO);
  const [isEditingClub, setIsEditingClub] = useState(false);

  // Create Club Form
  const [formData, setFormData] = useState<ClubFormData>(INITIAL_CLUB_FORM_DATA);

  // Add Team Logic

  useEffect(() => {
    loadClubData();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (club) {
        loadClubData();
      }
    }, [club?.id]),
  );

  /**
   * Loads club data and associated teams for the current user
   * - Fetches all clubs where the user is a member
   * - Loads teams for the first club found
   * - Sets loading states appropriately
   */
  const loadClubData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const clubService = ServiceFactory.getClubService(supabase);
      const clubs = await clubService.getUserMemberClubs(user.id);
      const firstClub = clubs.length > 0 ? clubs[0] : null;
      setClub(firstClub);

      if (firstClub) {
        const teamService = ServiceFactory.getTeamService(supabase);
        const clubTeams = await teamService.getClubTeams(firstClub.id);
        setTeams(clubTeams);
      }
    } catch (error) {
      console.error("Error loading club data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter teams: owners see all, members see only their own
  const visibleTeams = teams.filter((team) => {
    if (!club || !user) return false;
    if (club.ownerId === user.id) return true; // Owner sees all
    return team.ownerId === user.id; // Members see only their teams
  });

  // Count only approved teams for subscription limits
  const approvedTeams = teams.filter(
    (team) => team.status === TeamStatus.APPROVED,
  );
  const currentTeamCount = approvedTeams.length;
  const currentTier: SubscriptionTier = club?.subscriptionTier || SUBSCRIPTION_TIER.FREE;
  const maxTeams = SUBSCRIPTION_LIMITS[currentTier].maxTeams;
  const isLimitReached = currentTeamCount >= maxTeams;
  const isOwner = club?.ownerId === user?.id;

  /**
   * Handles adding a new team to the club
   * - Checks subscription limits before allowing team creation
   * - Shows alert if limit is reached
   * - Navigates to team creation screen if allowed
   */
  const handleAddTeam = () => {
    if (!club) return;
    if (isLimitReached) {
      Alert.alert(
        "Limite atteinte",
        `Votre abonnement ${currentTier} est limité à ${maxTeams} équipes. Veuillez mettre à jour votre offre.`,
      );
      return;
    }

    navigation.navigate(ROUTES.TEAM_INFO, { clubId: club.id });
  };

  /**
   * Approves a pending team (owner only)
   * - Shows confirmation dialog
   * - Updates team status to APPROVED
   * - Reloads club data to reflect changes
   * @param teamId - ID of the team to approve
   */
  const handleApproveTeam = async (teamId: string) => {
    if (!club || !isOwner || !user) return;
    Alert.alert(
      "Valider l'équipe",
      "Confirmer la validation de cette équipe ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Valider",
          onPress: async () => {
            try {
              const teamService = ServiceFactory.getTeamService(supabase);
              await teamService.updateTeamStatus(
                teamId,
                TeamStatus.APPROVED,
                user.id,
              );
              await loadClubData();
              Alert.alert("Succès", "Équipe validée");
            } catch (error) {
              console.error("Error approving team:", error);
              Alert.alert("Erreur", "Impossible de valider l'équipe");
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
    if (!club || !isOwner || !user) return;
    Alert.alert(
      "Refuser l'équipe",
      "Confirmer le refus de cette équipe ? Elle apparaîtra comme refusée au créateur.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Refuser",
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
              Alert.alert("Équipe refusée");
            } catch (error) {
              console.error("Error rejecting team:", error);
              Alert.alert("Erreur", "Impossible de refuser l'équipe");
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
    if (!club || !isOwner || !user) return;
    Alert.alert(
      "Supprimer l'équipe",
      "Êtes-vous sûr de vouloir supprimer définitivement cette équipe ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const teamService = ServiceFactory.getTeamService(supabase);
              await teamService.deleteTeam(teamId, user.id);
              await loadClubData();
              Alert.alert("Équipe supprimée");
            } catch (error) {
              console.error("Error deleting team:", error);
              Alert.alert("Erreur", "Impossible de supprimer l'équipe");
            }
          },
        },
      ],
    );
  };

  /**
   * Handles club logo image selection and upload
   * - Requests media library permissions
   * - Opens image picker with 1:1 aspect ratio
   * - Uploads selected image to Supabase storage
   * - Updates form data with uploaded image URL
   */
  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à vos photos pour importer un logo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;

      // Upload to Supabase Storage
      const photoService = new PhotoUploadService(supabase);
      const clubLogoId = `club-${Date.now()}`;
      const { url, error } = await photoService.uploadPlayerPhoto(
        localUri,
        clubLogoId,
      );

      if (error) {
        Alert.alert("Erreur", "Impossible d'uploader le logo");
        return;
      }

      if (url) {
        setFormData({ ...formData, logoUri: url });
      }
    }
  };

  /**
   * Handles form submission for club operations
   * Three modes based on context:
   *
   * 1. EDIT MODE (isEditingClub = true):
   *    - Updates existing club's logo and color customization
   *    - Only available to club owners
   *
   * 2. CREATE MODE (activeTab = CREATE):
   *    - Validates required fields (name, acronym)
   *    - Generates a unique club code (first 3 letters + random number)
   *    - Creates new club with user as owner
   *    - Sets custom colors and branding
   *
   * 3. JOIN MODE (activeTab = JOIN):
   *    - Validates club code input
   *    - Searches for club by code
   *    - Adds user as a member of the found club
   *
   * @returns {Promise<void>} Reloads club data on success, shows alerts on errors
   */
  const handleSubmit = async () => {
    if (isEditingClub) {
      // EDIT MODE
      if (!club || !user) return;
      try {
        const clubService = ServiceFactory.getClubService(supabase);
        await clubService.updateClub(club.id, {
          logoUrl: formData.logoUri || undefined,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          courtBackgroundColor: formData.courtColor,
          courtLineColor: formData.courtLinesColor,
        });
        await loadClubData();
        setIsEditingClub(false);
        Alert.alert("Succès", "Club modifié avec succès !");
      } catch (error) {
        console.error("Error updating club:", error);
        Alert.alert("Erreur", "Impossible de modifier le club");
      }
    } else if (activeTab === CLUB_TAB.CREATE) {
      // CREATE MODE - Validation
      if (!formData.name || !formData.acronym) {
        Alert.alert("Erreur", "Veuillez renseigner le nom du club et le sigle");
        return;
      }
      if (!user) return;

      try {
        const clubService = ServiceFactory.getClubService(supabase);
        const code = (
          formData.name.substring(0, 3) + Math.floor(Math.random() * 1000)
        ).toUpperCase();

        await clubService.createClub(
          {
            name: formData.name,
            acronym: formData.acronym,
            logoUrl: formData.logoUri || undefined,
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
            courtBackgroundColor: formData.courtColor,
            courtLineColor: formData.courtLinesColor,
          },
          user!.id,
        );

        await loadClubData();
        Alert.alert("Succès", "Club créé avec succès !");
      } catch (error) {
        console.error("Error creating club:", error);
        Alert.alert("Erreur", "Impossible de créer le club");
      }
    } else {
      // Join logic - Validation
      if (!formData.code) {
        Alert.alert("Erreur", "Veuillez renseigner le code du club");
        return;
      }
      if (!user) return;

      try {
        // Find club by code
        const clubService = ServiceFactory.getClubService(supabase);
        const clubToJoin = await clubService.getClubByCode(formData.code);

        if (!clubToJoin) {
          Alert.alert("Erreur", "Aucun club trouvé avec ce code");
          return;
        }

        // Join the club as a member
        const clubMemberService = ServiceFactory.getClubMemberService(supabase);
        const result = await clubMemberService.joinClub(
          clubToJoin.id,
          user.id,
          user.email!,
        );

        if (!result.success) {
          Alert.alert(
            "Erreur",
            result.error || "Impossible de rejoindre le club",
          );
          return;
        }

        await loadClubData();
        Alert.alert(
          "Succès",
          `Vous avez rejoint le club "${clubToJoin.name}" !`,
        );
      } catch (error) {
        console.error("Error joining club:", error);
        Alert.alert(
          "Erreur",
          "Une erreur est survenue lors de la tentative de rejoindre le club",
        );
      }
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
  if (club && !isEditingClub) {
    /**
     * Enters edit mode for the club
     * - Populates the form with current club data (name, acronym, colors, logo)
     * - Switches to edit mode view
     * - Only accessible to club owners
     */
    const handleEditClub = () => {
      setFormData({
        name: club.name,
        acronym: club.acronym || "",
        code: club.code,
        logoUri: club.logoUrl || null,
        primaryColor: club.primaryColor || "#FF0000",
        secondaryColor: club.secondaryColor || "#0000FF",
        courtColor: club.courtBackgroundColor || "#c2410c",
        courtLinesColor: club.courtLineColor || "#ffffff",
      });
      setIsEditingClub(true);
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
            club={club}
            onClose={() => setSubTab(CLUB_SUB_TAB.INFO)}
          />
        ) : (
          <ClubInfoView
            club={club}
            teams={teams}
            isOwner={isOwner}
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
          />
        )}
      </>
    );
  }

  // --- JOIN OR CREATE SCREEN (or EDIT) ---
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {isEditingClub ? (
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setIsEditingClub(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: textPrimary }]}>
              Modifier mon club
            </Text>
            <View style={{ width: 24 }} />
          </View>
        ) : (
          <Text style={[styles.title, { color: textPrimary }]}>
            Espace Club
          </Text>
        )}

        {/* Tabs - Only show if not editing */}
        {!isEditingClub && (
          <View
            style={[
              styles.tabs,
              {
                backgroundColor: isDark ? colors.surfaceVariant : colors.surfaceVariant,
                borderColor,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setActiveTab(CLUB_TAB.CREATE)}
              style={[
                styles.tab,
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
                  },
                ]}
              >
                Créer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab(CLUB_TAB.JOIN)}
              style={[
                styles.tab,
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
                  },
                ]}
              >
                Rejoindre
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === CLUB_TAB.CREATE || isEditingClub ? (
          <CreateClubForm
            formData={formData}
            setFormData={setFormData}
            onPickImage={handlePickImage}
            onSubmit={handleSubmit}
            isEditMode={isEditingClub}
          />
        ) : (
          <JoinClubForm
            clubCode={formData.code}
            setClubCode={(code) => setFormData({ ...formData, code })}
            onSubmit={handleSubmit}
          />
        )}
      </ScrollView>

      <View style={[styles.footer]}>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
        >
          <MaterialCommunityIcons
            name="check"
            size={20}
            color={colors.text.primary}
          />
          <Text style={[styles.submitButtonText, { color: colors.text.primary }]}>
            {isEditingClub
              ? "Modifier"
              : activeTab === CLUB_TAB.CREATE
                ? "Créer mon club"
                : "Rejoindre"}
          </Text>
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
