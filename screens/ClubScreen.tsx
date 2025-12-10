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
  Modal,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import ColorPicker, {
  Panel1,
  HueSlider,
  type ColorFormatsObject,
} from "reanimated-color-picker";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
} from "../src/theme";
import { Colors } from "../src/theme/colors";
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";
import { PhotoUploadService } from "../services/PhotoUploadService";
import { Club } from "../models/Club";
import { Team, TeamStatus } from "../models/Team";
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from "../models/Subscription";
import BasketballCourtSVG from "../components/BasketballCourtSVG";
import JerseyIconSimple from "../components/icons/JerseySimpleIcon";
import { ROUTES } from "../constants/routes";

interface ClubScreenProps {
  navigation: any;
}

type TabType = "create" | "join";
type SubTabType = "info" | "subscription";

const CLUB_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#1e293b",
  "#000000",
  "#ffffff",
];

const COURT_COLORS = [
  "#c2410c",
  "#eab308",
  "#1e1b4b",
  "#15803d",
  "#334155",
  "#7f1d1d",
  "#d4d4d4",
  "#f59e0b",
];

export default function ClubScreen({ navigation }: ClubScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("create");
  const [subTab, setSubTab] = useState<SubTabType>("info");
  const [isEditingClub, setIsEditingClub] = useState(false);

  // Create Club Form
  const [formData, setFormData] = useState({
    name: "",
    acronym: "",
    code: "",
    logoUri: null as string | null,
    primaryColor: "#FF0000",
    secondaryColor: "#0000FF",
    courtColor: "#c2410c",
    courtLinesColor: "#ffffff",
  });

  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [showCourtLinesPicker, setShowCourtLinesPicker] = useState(false);
  const [isCustomPrimary, setIsCustomPrimary] = useState(false);
  const [isCustomSecondary, setIsCustomSecondary] = useState(false);
  const [isCustomCourt, setIsCustomCourt] = useState(false);
  const [isCustomCourtLines, setIsCustomCourtLines] = useState(false);

  // Add Team Logic

  const isGuest = !user;

  const onPrimaryColorChange = useCallback((colors: ColorFormatsObject) => {
    setFormData((prev) => ({ ...prev, primaryColor: colors.hex }));
    setIsCustomPrimary(true);
  }, []);

  const onSecondaryColorChange = useCallback((colors: ColorFormatsObject) => {
    setFormData((prev) => ({ ...prev, secondaryColor: colors.hex }));
    setIsCustomSecondary(true);
  }, []);

  const onCourtColorChange = useCallback((colors: ColorFormatsObject) => {
    setFormData((prev) => ({ ...prev, courtColor: colors.hex }));
    setIsCustomCourt(true);
  }, []);

  const onCourtLinesColorChange = useCallback((colors: ColorFormatsObject) => {
    setFormData((prev) => ({ ...prev, courtLinesColor: colors.hex }));
    setIsCustomCourtLines(true);
  }, []);

  useEffect(() => {
    loadClubData();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (club) {
        loadClubData();
      }
    }, [club?.id])
  );

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
    (team) => team.status === TeamStatus.APPROVED
  );
  const currentTeamCount = approvedTeams.length;
  const currentTier: SubscriptionTier = club?.subscriptionTier || "free";
  const maxTeams = SUBSCRIPTION_LIMITS[currentTier].maxTeams;
  const isLimitReached = currentTeamCount >= maxTeams;
  const isOwner = club?.ownerId === user?.id;

  const handleAddTeam = () => {
    if (!club) return;
    if (isLimitReached) {
      Alert.alert(
        "Limite atteinte",
        `Votre abonnement ${currentTier} est limité à ${maxTeams} équipes. Veuillez mettre à jour votre offre.`
      );
      return;
    }

    navigation.navigate(ROUTES.TEAM_INFO, { clubId: club.id });
  };

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
                user.id
              );
              await loadClubData();
              Alert.alert("Succès", "Équipe validée");
            } catch (error) {
              console.error("Error approving team:", error);
              Alert.alert("Erreur", "Impossible de valider l'équipe");
            }
          },
        },
      ]
    );
  };

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
                user.id
              );
              await loadClubData();
              Alert.alert("Équipe refusée");
            } catch (error) {
              console.error("Error rejecting team:", error);
              Alert.alert("Erreur", "Impossible de refuser l'équipe");
            }
          },
        },
      ]
    );
  };

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
      ]
    );
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (!club) return;
    Alert.alert("Upgrade", `Confirmer le passage à l'offre ${tier} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        onPress: () => {
          // TODO: Implement payment process
          Alert.alert("Succès", "Abonnement mis à jour avec succès !");
          setSubTab("info");
        },
      },
    ]);
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à vos photos pour importer un logo."
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
        clubLogoId
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
    } else if (activeTab === "create") {
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
          user!.id
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
          user.email!
        );

        if (!result.success) {
          Alert.alert(
            "Erreur",
            result.error || "Impossible de rejoindre le club"
          );
          return;
        }

        await loadClubData();
        Alert.alert(
          "Succès",
          `Vous avez rejoint le club "${clubToJoin.name}" !`
        );
      } catch (error) {
        console.error("Error joining club:", error);
        Alert.alert(
          "Erreur",
          "Une erreur est survenue lors de la tentative de rejoindre le club"
        );
      }
    }
  };

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];
  const requiredColor = isDark ? Colors.dark.required : Colors.light.required;

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
        <ActivityIndicator size="large" color={BRAND_COLORS[500]} />
      </View>
    );
  }

  // --- INSIDE A CLUB ---
  if (club && !isEditingClub) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>Mon Club</Text>
            {isOwner && (
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  onPress={() => {
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
                  }}
                  style={[
                    styles.editButton,
                    {
                      backgroundColor: surfaceColor,
                      borderColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="palette"
                    size={16}
                    color={BRAND_COLORS[500]}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setSubTab(
                      subTab === "subscription" ? "info" : "subscription"
                    )
                  }
                  style={[
                    styles.headerButton,
                    {
                      backgroundColor:
                        subTab === "subscription"
                          ? BRAND_COLORS[600]
                          : surfaceColor,
                      borderColor:
                        subTab === "subscription"
                          ? BRAND_COLORS[500]
                          : borderColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={currentTier === "ultimate" ? "crown" : "star"}
                    size={12}
                    color={
                      subTab === "subscription"
                        ? COMMON_COLORS.white
                        : BRAND_COLORS[500]
                    }
                  />
                  <Text
                    style={[
                      styles.headerButtonText,
                      {
                        color:
                          subTab === "subscription"
                            ? COMMON_COLORS.white
                            : textSecondary,
                      },
                    ]}
                  >
                    {subTab === "subscription" ? "Fermer" : "Offre"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* SUBSCRIPTION VIEW */}
          {subTab === "subscription" ? (
            <View style={styles.subscriptionView}>
              <Text style={[styles.subscriptionTitle, { color: textPrimary }]}>
                Gérez votre offre
              </Text>
              <Text
                style={[styles.subscriptionSubtitle, { color: textSecondary }]}
              >
                Passez au niveau supérieur pour ajouter plus d'équipes.
              </Text>

              <View style={styles.pricingCards}>
                <PricingCard
                  tier="basic"
                  currentTier={currentTier}
                  price="9.99€"
                  limit={SUBSCRIPTION_LIMITS.basic.maxTeams}
                  isDark={isDark}
                  onSelect={handleUpgrade}
                />
                <PricingCard
                  tier="premium"
                  currentTier={currentTier}
                  price="24.99€"
                  limit={SUBSCRIPTION_LIMITS.premium.maxTeams}
                  isDark={isDark}
                  onSelect={handleUpgrade}
                />
                <PricingCard
                  tier="ultimate"
                  currentTier={currentTier}
                  price="49.99€"
                  limit={SUBSCRIPTION_LIMITS.ultimate.maxTeams}
                  isDark={isDark}
                  onSelect={handleUpgrade}
                />
              </View>
            </View>
          ) : (
            <>
              {/* Club Info Card */}
              <View
                style={[
                  styles.clubCard,
                  { backgroundColor: surfaceColor, borderColor },
                ]}
              >
                <View
                  style={[
                    styles.clubLogo,
                    {
                      backgroundColor: isDark
                        ? SLATE_COLORS[700]
                        : SLATE_COLORS[100],
                    },
                  ]}
                >
                  {club.logoUrl ? (
                    <Image
                      source={{ uri: club.logoUrl }}
                      style={styles.clubLogoImage}
                    />
                  ) : (
                    <Image
                      source={require("../components/icons/coachassistant-logo-margin.png")}
                      style={styles.clubLogoImage}
                    />
                  )}
                </View>

                <Text style={[styles.clubName, { color: textPrimary }]}>
                  {club.name}
                </Text>

                {isOwner && (
                  <View
                    style={[
                      styles.clubCodeCard,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[900]
                          : SLATE_COLORS[50],
                        borderColor: isDark
                          ? SLATE_COLORS[700]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[styles.clubCodeLabel, { color: textSecondary }]}
                    >
                      CODE CLUB
                    </Text>
                    <View style={styles.clubCodeRow}>
                      <Text
                        style={[styles.clubCodeValue, { color: textPrimary }]}
                      >
                        {club.code}
                      </Text>
                      <TouchableOpacity
                        onPress={() => Alert.alert("Copié", club.code)}
                      >
                        <MaterialCommunityIcons
                          name="content-copy"
                          size={14}
                          color={BRAND_COLORS[500]}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Team Usage Bar */}
                <View style={styles.usageBar}>
                  <View style={styles.usageBarHeader}>
                    <Text
                      style={[styles.usageBarLabel, { color: textSecondary }]}
                    >
                      Abonnement {currentTier}
                    </Text>
                    <Text
                      style={[
                        styles.usageBarValue,
                        {
                          color: isLimitReached ? "#ef4444" : BRAND_COLORS[600],
                        },
                      ]}
                    >
                      {currentTeamCount} / {maxTeams > 100 ? "∞" : maxTeams}{" "}
                      Équipes
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.usageBarTrack,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[700]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.usageBarFill,
                        {
                          backgroundColor: isLimitReached
                            ? "#ef4444"
                            : BRAND_COLORS[500],
                          width: `${Math.min(
                            100,
                            (currentTeamCount /
                              (maxTeams > 100 ? 20 : maxTeams)) *
                              100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  {isLimitReached && isOwner && (
                    <TouchableOpacity onPress={() => setSubTab("subscription")}>
                      <Text
                        style={[
                          styles.upgradeLink,
                          { color: BRAND_COLORS[600] },
                        ]}
                      >
                        Augmenter la limite
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Teams Section */}
              <View style={styles.teamsSection}>
                <View style={styles.teamsSectionHeader}>
                  <Text
                    style={[styles.teamsSectionTitle, { color: textPrimary }]}
                  >
                    Nos Équipes
                  </Text>
                  <TouchableOpacity
                    onPress={handleAddTeam}
                    style={[
                      styles.addTeamButton,
                      {
                        backgroundColor: isLimitReached
                          ? SLATE_COLORS[400]
                          : BRAND_COLORS[600],
                      },
                    ]}
                    disabled={!isOwner && isLimitReached}
                  >
                    <MaterialCommunityIcons
                      name={isLimitReached ? "lock" : "plus"}
                      size={20}
                      color={COMMON_COLORS.white}
                    />
                  </TouchableOpacity>
                </View>

                {visibleTeams.length > 0 ? (
                  visibleTeams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      isDark={isDark}
                      surfaceColor={surfaceColor}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      borderColor={borderColor}
                      navigation={navigation}
                      clubId={club?.id}
                      isOwner={isOwner}
                      onApprove={() => handleApproveTeam(team.id)}
                      onReject={() => handleRejectTeam(team.id)}
                      onDelete={() => handleDeleteTeam(team.id)}
                    />
                  ))
                ) : (
                  <View
                    style={[
                      styles.emptyTeams,
                      {
                        backgroundColor: isDark
                          ? `${SLATE_COLORS[900]}80`
                          : SLATE_COLORS[100],
                        borderColor,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account-group"
                      size={24}
                      color={textSecondary}
                      style={{ opacity: 0.5 }}
                    />
                    <Text
                      style={[styles.emptyTeamsText, { color: textSecondary }]}
                    >
                      {isOwner
                        ? "Aucune équipe créée."
                        : "Aucune équipe assignée."}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
                backgroundColor: isDark ? SLATE_COLORS[900] : SLATE_COLORS[100],
                borderColor,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setActiveTab("create")}
              style={[
                styles.tab,
                activeTab === "create" && {
                  backgroundColor: BRAND_COLORS[600],
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "create"
                        ? COMMON_COLORS.white
                        : textSecondary,
                  },
                ]}
              >
                Créer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("join")}
              style={[
                styles.tab,
                activeTab === "join" && { backgroundColor: BRAND_COLORS[600] },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "join"
                        ? COMMON_COLORS.white
                        : textSecondary,
                  },
                ]}
              >
                Rejoindre
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "create" || isEditingClub ? (
          <View style={styles.formContainer}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <TouchableOpacity
                style={[
                  styles.logoPlaceholder,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[100],
                    borderColor,
                  },
                ]}
                onPress={handlePickImage}
              >
                {formData.logoUri ? (
                  <Image
                    source={{ uri: formData.logoUri }}
                    style={styles.logoImage}
                  />
                ) : (
                  <Image
                    source={require("../components/icons/coachassistant-logo-margin.png")}
                    style={styles.logoImage}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Club Name - Only show in create mode */}
            {!isEditingClub && (
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: textSecondary }]}>
                  NOM DU CLUB <Text style={{ color: requiredColor }}>*</Text>
                </Text>
                <TextInput
                  placeholder="Ex: Los Angeles Lakers"
                  placeholderTextColor={textSecondary}
                  value={formData.name}
                  onChangeText={(value) =>
                    setFormData({ ...formData, name: value })
                  }
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: surfaceColor,
                      borderColor,
                      color: textPrimary,
                    },
                  ]}
                />
              </View>
            )}

            {/* Acronym - Only show in create mode */}
            {!isEditingClub && (
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: textSecondary }]}>
                  SIGLE <Text style={{ color: requiredColor }}>*</Text>
                </Text>
                <TextInput
                  placeholder="LAL"
                  placeholderTextColor={textSecondary}
                  value={formData.acronym}
                  onChangeText={(value) =>
                    setFormData({ ...formData, acronym: value.toUpperCase() })
                  }
                  maxLength={6}
                  style={[
                    styles.formInput,
                    styles.acronymInput,
                    {
                      backgroundColor: surfaceColor,
                      borderColor,
                      color: textPrimary,
                    },
                  ]}
                />
              </View>
            )}

            {/* Colors Section */}
            <View
              style={[
                styles.formSection,
                styles.borderTop,
                { borderTopColor: borderColor },
              ]}
            >
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="palette-outline"
                  size={16}
                  color={BRAND_COLORS[500]}
                />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Couleurs du Club
                </Text>
              </View>

              {/* Primary Color */}
              <Text style={[styles.colorLabel, { color: textSecondary }]}>
                Couleur principale
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.colorPickerScrollView}
                contentContainerStyle={styles.colorPickerRow}
              >
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    styles.pickerButton,
                    { borderColor: borderColor },
                    isCustomPrimary && styles.colorOptionSelected,
                  ]}
                  onPress={() => setShowPrimaryPicker(true)}
                >
                  {isCustomPrimary ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COMMON_COLORS.white}
                    />
                  ) : (
                    <Ionicons name="add" size={28} color={textSecondary} />
                  )}
                </TouchableOpacity>
                {CLUB_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.primaryColor === color &&
                        styles.colorOptionSelected,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, primaryColor: color });
                      setIsCustomPrimary(false);
                    }}
                  >
                    {formData.primaryColor === color && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COMMON_COLORS.white}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Secondary Color */}
              <Text style={[styles.colorLabel, { color: textSecondary }]}>
                Couleur secondaire
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.colorPickerScrollView}
                contentContainerStyle={styles.colorPickerRow}
              >
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    styles.pickerButton,
                    { borderColor: borderColor },
                    isCustomSecondary && styles.colorOptionSelected,
                  ]}
                  onPress={() => setShowSecondaryPicker(true)}
                >
                  {isCustomSecondary ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COMMON_COLORS.white}
                    />
                  ) : (
                    <Ionicons name="add" size={28} color={textSecondary} />
                  )}
                </TouchableOpacity>
                {CLUB_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.secondaryColor === color &&
                        styles.colorOptionSelected,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, secondaryColor: color });
                      setIsCustomSecondary(false);
                    }}
                  >
                    {formData.secondaryColor === color && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COMMON_COLORS.white}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Court Customization */}
            <View
              style={[
                styles.formSection,
                styles.borderTop,
                { borderTopColor: borderColor },
              ]}
            >
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="basketball-hoop-outline"
                  size={16}
                  color={BRAND_COLORS[500]}
                />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Personnalisation du terrain
                </Text>
              </View>

              <Text style={[styles.colorLabel, { color: textSecondary }]}>
                Couleur du parquet
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.colorPickerScrollView}
                contentContainerStyle={styles.colorPickerRow}
              >
                <TouchableOpacity
                  style={[
                    styles.courtColorButton,
                    styles.pickerButton,
                    { borderColor: borderColor },
                    isCustomCourt && styles.colorOptionSelected,
                  ]}
                  onPress={() => setShowCourtPicker(true)}
                >
                  {isCustomCourt ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COMMON_COLORS.white}
                    />
                  ) : (
                    <Ionicons name="add" size={28} color={textSecondary} />
                  )}
                </TouchableOpacity>
                {COURT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={`c-${c}`}
                    onPress={() => {
                      setFormData({ ...formData, courtColor: c });
                      setIsCustomCourt(false);
                    }}
                    style={[
                      styles.courtColorButton,
                      { backgroundColor: c },
                      formData.courtColor === c && styles.colorOptionSelected,
                    ]}
                  >
                    {formData.courtColor === c && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COMMON_COLORS.white}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.colorLabel, { color: textSecondary }]}>
                Couleur des lignes
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.colorPickerScrollView}
                contentContainerStyle={styles.colorPickerRow}
              >
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    styles.pickerButton,
                    { borderColor: borderColor },
                    isCustomCourtLines && styles.colorOptionSelected,
                  ]}
                  onPress={() => setShowCourtLinesPicker(true)}
                >
                  {isCustomCourtLines ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COMMON_COLORS.white}
                    />
                  ) : (
                    <Ionicons name="add" size={28} color={textSecondary} />
                  )}
                </TouchableOpacity>
                {CLUB_COLORS.map((c) => (
                  <TouchableOpacity
                    key={`l-${c}`}
                    onPress={() => {
                      setFormData({ ...formData, courtLinesColor: c });
                      setIsCustomCourtLines(false);
                    }}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      formData.courtLinesColor === c &&
                        styles.colorOptionSelected,
                    ]}
                  >
                    {formData.courtLinesColor === c && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COMMON_COLORS.white}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Court Preview */}
            <View style={[styles.courtPreview, { borderColor }]}>
              <BasketballCourtSVG
                width={320}
                height={180}
                backgroundColor={formData.courtColor}
                lineColor={formData.courtLinesColor}
                logoUri={
                  formData.logoUri ||
                  Image.resolveAssetSource(
                    require("../components/icons/coachassistant-logo-margin.png")
                  ).uri
                }
              />
            </View>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: textSecondary }]}>
                CODE CLUB <Text style={{ color: requiredColor }}>*</Text>
              </Text>
              <TextInput
                placeholder="Ex: LION69"
                placeholderTextColor={textSecondary}
                value={formData.code}
                onChangeText={(value) =>
                  setFormData({ ...formData, code: value.toUpperCase() })
                }
                style={[
                  styles.formInput,
                  styles.codeInput,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                    color: textPrimary,
                  },
                ]}
              />
            </View>
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: isDark
                    ? `${SLATE_COLORS[800]}80`
                    : SLATE_COLORS[100],
                  borderColor,
                },
              ]}
            >
              <Text style={[styles.infoText, { color: textSecondary }]}>
                En rejoignant un club existant, vous n'avez pas besoin de payer
                d'abonnement. C'est le propriétaire du club qui gère les quotas
                d'équipes.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Color Picker Modals */}
      <Modal visible={showPrimaryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Couleur principale
              </Text>
              <TouchableOpacity onPress={() => setShowPrimaryPicker(false)}>
                <Ionicons name="close" size={28} color={textPrimary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={formData.primaryColor}
              onCompleteJS={onPrimaryColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                { backgroundColor: BRAND_COLORS[600] },
              ]}
              onPress={() => setShowPrimaryPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSecondaryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Couleur secondaire
              </Text>
              <TouchableOpacity onPress={() => setShowSecondaryPicker(false)}>
                <Ionicons name="close" size={28} color={textPrimary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={formData.secondaryColor}
              onCompleteJS={onSecondaryColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                { backgroundColor: BRAND_COLORS[600] },
              ]}
              onPress={() => setShowSecondaryPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCourtPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Couleur du parquet
              </Text>
              <TouchableOpacity onPress={() => setShowCourtPicker(false)}>
                <Ionicons name="close" size={28} color={textPrimary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={formData.courtColor}
              onCompleteJS={onCourtColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                { backgroundColor: BRAND_COLORS[600] },
              ]}
              onPress={() => setShowCourtPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCourtLinesPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Couleur des lignes
              </Text>
              <TouchableOpacity onPress={() => setShowCourtLinesPicker(false)}>
                <Ionicons name="close" size={28} color={textPrimary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={formData.courtLinesColor}
              onCompleteJS={onCourtLinesColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                { backgroundColor: BRAND_COLORS[600] },
              ]}
              onPress={() => setShowCourtLinesPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.footer]}>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: BRAND_COLORS[600] }]}
        >
          <MaterialCommunityIcons
            name="check"
            size={20}
            color={COMMON_COLORS.white}
          />
          <Text style={styles.submitButtonText}>
            {isEditingClub
              ? "Modifier"
              : activeTab === "create"
              ? "Créer mon club"
              : "Rejoindre"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- COMPONENTS ---

interface TeamCardProps {
  team: Team;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  navigation: any;
  clubId?: string;
  isOwner: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
}

function TeamCard({
  team,
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
  navigation,
  clubId,
  isOwner,
  onApprove,
  onReject,
  onDelete,
}: TeamCardProps) {
  const isClickable = team.status === TeamStatus.APPROVED;

  return (
    <TouchableOpacity
      style={[
        styles.teamCard,
        {
          backgroundColor: surfaceColor,
          borderColor,
          opacity: team.status === TeamStatus.APPROVED ? 1 : 0.9,
        },
      ]}
      onPress={() => {
        if (isClickable) {
          navigation.navigate(ROUTES.TEAM_INFO, { teamId: team.id, clubId });
        }
      }}
      disabled={!isClickable}
    >
      {/* Status Badge */}
      {team.status === TeamStatus.PENDING && (
        <View style={[styles.statusBadge, styles.statusPending]}>
          <Ionicons name="time-outline" size={10} color={COMMON_COLORS.white} />
          <Text style={styles.statusBadgeText}>EN ATTENTE</Text>
        </View>
      )}
      {team.status === TeamStatus.REJECTED && (
        <View style={[styles.statusBadge, styles.statusRejected]}>
          <Ionicons name="close-circle" size={10} color={COMMON_COLORS.white} />
          <Text style={styles.statusBadgeText}>REFUSÉ</Text>
        </View>
      )}

      <View style={styles.teamCardLeft}>
        <View
          style={[
            styles.teamIcon,
            { backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[100] },
          ]}
        >
          <JerseyIconSimple />
        </View>
        <View style={styles.teamInfo}>
          <Text
            style={[
              styles.teamName,
              {
                color:
                  team.status === TeamStatus.REJECTED
                    ? textSecondary
                    : textPrimary,
                textDecorationLine:
                  team.status === TeamStatus.REJECTED ? "line-through" : "none",
              },
            ]}
          >
            {team.name}
          </Text>
          <Text style={[styles.teamCategory, { color: textSecondary }]}>
            {team.gender === "male"
              ? "Hommes"
              : team.gender === "female"
              ? "Femmes"
              : "Mixte"}{" "}
            • {team.playerCount ?? 0} Joueur
            {(team.playerCount ?? 0) > 1 ? "s" : ""}
          </Text>
          {team.coachName && (
            <Text style={[styles.teamCoach, { color: textSecondary }]}>
              {team.coachName}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.teamCardRight}>
        {team.status === TeamStatus.PENDING && isOwner ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onReject?.();
              }}
              style={[styles.actionButton, styles.rejectButton]}
            >
              <Ionicons name="close-circle" size={20} color="#dc2626" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onApprove?.();
              }}
              style={[styles.actionButton, styles.approveButton]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            </TouchableOpacity>
          </View>
        ) : (
          team.status === TeamStatus.APPROVED && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={textSecondary}
            />
          )
        )}
      </View>
    </TouchableOpacity>
  );
}

interface PricingCardProps {
  tier: SubscriptionTier;
  currentTier: SubscriptionTier;
  price: string;
  limit: number;
  isDark: boolean;
  onSelect: (tier: SubscriptionTier) => void;
}

function PricingCard({
  tier,
  currentTier,
  price,
  limit,
  isDark,
  onSelect,
}: PricingCardProps) {
  const isCurrent = tier === currentTier;
  const colors: Record<SubscriptionTier, string> = {
    free: SLATE_COLORS[600],
    basic: BRAND_COLORS[500],
    premium: BRAND_COLORS[600],
    ultimate: BRAND_COLORS[900],
  };

  return (
    <TouchableOpacity
      onPress={() => onSelect(tier)}
      disabled={isCurrent}
      style={[
        styles.pricingCard,
        {
          backgroundColor: isDark ? SLATE_COLORS[900] : COMMON_COLORS.white,
          borderColor: isCurrent
            ? BRAND_COLORS[500]
            : isDark
            ? SLATE_COLORS[800]
            : SLATE_COLORS[200],
          borderWidth: isCurrent ? 2 : 1,
          opacity: isCurrent ? 1 : 0.8,
        },
      ]}
    >
      {isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>ACTUEL</Text>
        </View>
      )}
      <View style={styles.pricingCardContent}>
        <View style={styles.pricingCardLeft}>
          <View style={[styles.pricingIcon, { backgroundColor: colors[tier] }]}>
            <MaterialCommunityIcons
              name={tier === "ultimate" ? "crown" : "star"}
              size={20}
              color={COMMON_COLORS.white}
            />
          </View>
          <View>
            <View style={styles.tierNameRow}>
              <Text
                style={[
                  styles.tierName,
                  { color: isDark ? COMMON_COLORS.white : SLATE_COLORS[900] },
                ]}
              >
                {tier}
              </Text>
            </View>
            <Text
              style={[
                styles.tierLimit,
                { color: isDark ? SLATE_COLORS[400] : SLATE_COLORS[500] },
              ]}
            >
              {limit > 100 ? "Équipes illimitées" : `Jusqu'à ${limit} équipes`}
            </Text>
          </View>
        </View>
        <View style={styles.pricingCardRight}>
          <Text
            style={[
              styles.priceValue,
              { color: isDark ? COMMON_COLORS.white : SLATE_COLORS[900] },
            ]}
          >
            {price}
          </Text>
          <Text style={[styles.priceLabel, { color: SLATE_COLORS[400] }]}>
            / mois
          </Text>
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    padding: 4,
    marginBottom: 20,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  subscriptionView: {
    gap: 24,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  subscriptionSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: -16,
  },
  pricingCards: {
    gap: 16,
  },
  clubCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 24,
  },
  clubLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  clubLogoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  clubName: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  clubCodeCard: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  clubCodeLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  clubCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clubCodeValue: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  usageBar: {
    width: "100%",
  },
  usageBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  usageBarLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  usageBarValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  usageBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  usageBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  upgradeLink: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },
  teamsSection: {
    gap: 16,
  },
  teamsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamsSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addTeamButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTeams: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyTeamsText: {
    fontSize: 14,
    marginTop: 8,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  statusBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  statusPending: {
    backgroundColor: "#fbbf24",
  },
  statusRejected: {
    backgroundColor: "#ef4444",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  teamCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  teamCategory: {
    fontSize: 12,
    marginTop: 4,
  },
  teamCoach: {
    fontSize: 10,
    marginTop: 2,
  },
  teamCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 999,
  },
  approveButton: {
    backgroundColor: "#dcfce7",
  },
  rejectButton: {
    backgroundColor: "#fee2e2",
  },
  oldTeamCategory: {
    fontSize: 12,
    marginTop: 2,
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
  formContainer: {
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  formSection: {
    gap: 8,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  formInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "bold",
  },
  formRow: {
    flexDirection: "row",
    gap: 16,
  },
  formCol1: {
    flex: 1,
    gap: 8,
  },
  formCol2: {
    flex: 2,
    gap: 8,
  },
  acronymInput: {
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 58,
  },
  borderTop: {
    paddingTop: 24,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },
  colorPickerScrollView: {
    marginTop: 5,
  },
  colorPickerRow: {
    flexDirection: "row",
    gap: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: "#333",
  },
  pickerButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  courtColorButton: {
    width: 64,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  courtPreview: {
    width: "100%",
    aspectRatio: 2,
    overflow: "hidden",
  },
  codeInput: {
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 4,
    fontSize: 18,
    fontFamily: "monospace",
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
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
    color: COMMON_COLORS.white,
  },
  pricingCard: {
    padding: 16,
    borderRadius: 16,
    position: "relative",
  },
  currentBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: [{ translateX: -50 }],
    backgroundColor: BRAND_COLORS[500],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentBadgeText: {
    color: COMMON_COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  pricingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pricingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  pricingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tierNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tierLimit: {
    fontSize: 12,
    marginTop: 2,
  },
  pricingCardRight: {
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  priceLabel: {
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  colorPanel: {
    width: "100%",
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
  },
  hueSlider: {
    width: "100%",
    height: 40,
    borderRadius: 20,
    marginBottom: 20,
  },
  modalConfirmButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmText: {
    color: COMMON_COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
