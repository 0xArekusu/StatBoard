/**
 * ClubFormScreen
 *
 * Screen for creating or editing a club.
 * Features:
 * - Create new club with customization (name, colors, logo)
 * - Edit existing club (owner only)
 * - Manage club teams (separate tab)
 * - Share club code for member invitations
 * All Supabase operations are logged for debugging.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import BasketballCourtSVG from "../components/BasketballCourtSVG";
import ClubTeamsTab from "../components/ClubTeamsTab";
import JerseyIcon from "../components/icons/JerseyIcon";
import ColorPicker, {
  Panel1,
  HueSlider,
  type ColorFormatsObject,
} from "reanimated-color-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { PhotoUploadService } from "../services/PhotoUploadService";
import type { Club } from "../models/Club";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import {
  CommonStyles,
  CLUB_PRESET_COLORS,
  DEFAULT_CLUB_COLORS,
  COURT_PRESET_COLORS,
  DEFAULT_COURT_COLORS,
  COMMON_COLORS,
} from "../src/theme";
import ThemeToggleButton from "../components/ThemeToggleButton";
import { logInfo, logError, logWarn } from "../utils/logger";

type RootStackParamList = {
  ClubForm: { clubId?: string };
};

type ClubFormRouteProp = RouteProp<RootStackParamList, "ClubForm">;

export default function ClubFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClubFormRouteProp>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const clubId = route.params?.clubId;
  const isEditMode = !!clubId;

  const [club, setClub] = useState<Club | null>(null);
  const isOwner = club && user && club.ownerId === user.id;
  const [activeTab, setActiveTab] = useState<"info" | "teams">("info");
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  const [clubName, setClubName] = useState("");
  const [sigle, setSigle] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_CLUB_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_CLUB_COLORS.secondary);
  const [courtBackgroundColor, setCourtBackgroundColor] = useState(DEFAULT_COURT_COLORS.background);
  const [courtLineColor, setCourtLineColor] = useState(DEFAULT_COURT_COLORS.line);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [showCourtBgPicker, setShowCourtBgPicker] = useState(false);
  const [showCourtLinePicker, setShowCourtLinePicker] = useState(false);
  const [isCustomPrimary, setIsCustomPrimary] = useState(false);
  const [isCustomSecondary, setIsCustomSecondary] = useState(false);

  /**
   * Log screen mount and load club data if in edit mode
   * Fetches club details from Supabase and populates form fields
   */
  useEffect(() => {
    if (isEditMode) {
      logInfo("ClubFormScreen", "📱 Screen mounted - Edit mode", {
        clubId,
        userId: user?.id,
        userEmail: user?.email,
      });
      loadClub();
    } else {
      logInfo("ClubFormScreen", "📱 Screen mounted - Create mode (new club)", {
        userId: user?.id,
        userEmail: user?.email,
      });
    }
  }, [clubId]);

  /**
   * Load club data from Supabase
   * Populates form with existing club information
   */
  const loadClub = async () => {
    try {
      setLoading(true);
      logInfo("ClubFormScreen", "📡 Fetching club data from Supabase", {
        clubId,
      });

      const clubService = ServiceFactory.getClubService(supabase);
      const clubData = await clubService.getClubById(clubId!);

      if (clubData) {
        logInfo("ClubFormScreen", "✅ Club data loaded successfully", {
          clubId: clubData.id,
          clubName: clubData.name,
          ownerId: clubData.ownerId,
          isOwner: user?.id === clubData.ownerId,
          hasLogo: !!clubData.logoUrl,
        });

        setClub(clubData);
        setClubName(clubData.name);
        setSigle(clubData.acronym);
        setPrimaryColor(clubData.primaryColor);
        setSecondaryColor(clubData.secondaryColor);
        setCourtBackgroundColor(clubData.courtBackgroundColor);
        setCourtLineColor(clubData.courtLineColor);
        setLogoUri(clubData.logoUrl || null);

        // If user is not owner, force teams tab
        if (user && clubData.ownerId !== user.id) {
          logInfo(
            "ClubFormScreen",
            "👥 User is not owner, switching to teams tab"
          );
          setActiveTab("teams");
        }
      } else {
        logError("ClubFormScreen", "❌ Club not found", { clubId });
        Alert.alert("Erreur", "Club introuvable");
        navigation.goBack();
      }
    } catch (error) {
      logError("ClubFormScreen", "❌ Error loading club data", {
        clubId,
        error: error instanceof Error ? error.message : error,
      });
      Alert.alert("Erreur", "Impossible de charger le club");
    } finally {
      setLoading(false);
    }
  };

  const onPrimaryColorChange = useCallback((colors: ColorFormatsObject) => {
    setPrimaryColor(colors.hex);
    setIsCustomPrimary(true);
  }, []);

  const onSecondaryColorChange = useCallback((colors: ColorFormatsObject) => {
    setSecondaryColor(colors.hex);
    setIsCustomSecondary(true);
  }, []);

  const onCourtBgColorChange = useCallback((colors: ColorFormatsObject) => {
    setCourtBackgroundColor(colors.hex);
  }, []);

  const onCourtLineColorChange = useCallback((colors: ColorFormatsObject) => {
    setCourtLineColor(colors.hex);
  }, []);

  /**
   * Handle logo image selection and upload to Supabase Storage
   * Requests media library permissions, launches image picker, and uploads to cloud
   */
  const handlePickImage = async () => {
    logInfo("ClubFormScreen", "📸 Requesting media library permissions");

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      logWarn("ClubFormScreen", "⚠️ Media library permission denied");
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à vos photos pour importer un logo."
      );
      return;
    }

    logInfo(
      "ClubFormScreen",
      "✅ Media library permission granted, launching picker"
    );

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      logInfo("ClubFormScreen", "✅ Image selected", {
        uri: localUri,
        width: result.assets[0].width,
        height: result.assets[0].height,
      });

      // Upload to Supabase Storage using PhotoUploadService
      logInfo("ClubFormScreen", "⬆️ Uploading logo to Supabase Storage");
      const photoService = new PhotoUploadService(supabase);
      const clubLogoId = clubId || `club-${Date.now()}`;
      const { url, error } = await photoService.uploadPlayerPhoto(
        localUri,
        clubLogoId
      );

      if (error) {
        logError("ClubFormScreen", "❌ Failed to upload logo", { error });
        Alert.alert("Erreur", "Impossible d'uploader le logo");
        return;
      }

      if (url) {
        logInfo("ClubFormScreen", "✅ Logo uploaded successfully", { url });
        setLogoUri(url);
      }
    } else {
      logInfo("ClubFormScreen", "ℹ️ Image selection cancelled");
    }
  };

  /**
   * Save club data to Supabase
   * Creates new club or updates existing one based on mode
   */
  const handleSave = async () => {
    if (saving) {
      logWarn(
        "ClubFormScreen",
        "⚠️ Save already in progress, ignoring duplicate request"
      );
      return;
    }

    try {
      setSaving(true);
      const clubService = ServiceFactory.getClubService(supabase);

      if (isEditMode) {
        // Update existing club
        logInfo("ClubFormScreen", "💾 Updating existing club in Supabase", {
          clubId,
          clubName,
          acronym: sigle,
          hasLogo: !!logoUri,
        });

        const result = await clubService.updateClub(clubId!, {
          name: clubName,
          acronym: sigle,
          logoUrl: logoUri || undefined,
          primaryColor,
          secondaryColor,
          courtBackgroundColor,
          courtLineColor,
        });

        if (!result.success) {
          logError("ClubFormScreen", "❌ Failed to update club", {
            clubId,
            error: result.error,
          });
          Alert.alert(
            "Erreur",
            result.error || "Impossible de sauvegarder le club"
          );
          return;
        }

        logInfo("ClubFormScreen", "✅ Club updated successfully", { clubId });
        Alert.alert("Succès", "Le club a été mis à jour", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create new club
        logInfo("ClubFormScreen", "📡 Fetching current user for club creation");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          logError("ClubFormScreen", "❌ No authenticated user found");
          Alert.alert("Erreur", "Vous devez être connecté pour créer un club");
          return;
        }

        logInfo("ClubFormScreen", "➕ Creating new club in Supabase", {
          clubName,
          acronym: sigle,
          ownerId: user.id,
          hasLogo: !!logoUri,
        });

        const result = await clubService.createClub(
          {
            name: clubName,
            acronym: sigle,
            logoUrl: logoUri || undefined,
            primaryColor,
            secondaryColor,
            courtBackgroundColor,
            courtLineColor,
          },
          user.id
        );

        if (!result.success) {
          logError("ClubFormScreen", "❌ Failed to create club", {
            error: result.error,
            clubName,
          });
          Alert.alert("Erreur", result.error || "Impossible de créer le club");
          return;
        }

        logInfo("ClubFormScreen", "✅ Club created successfully", {
          clubId: result.club?.id,
          clubName: result.club?.name,
        });

        const clubCode = result.club!.code;

        // Copy code to clipboard immediately
        Clipboard.setString(clubCode);

        // Success
        Alert.alert(
          "Club créé !",
          `Votre code de club : ${clubCode}\n\n✓ Code copié dans le presse-papier\n\nPartagez-le avec vos membres.`,
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate(ROUTES.MAIN_MENU as never);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error saving club:", error);
      Alert.alert("Erreur", "Une erreur inattendue s'est produite");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.button.club} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Chargement...</Text>
      </View>
    );
  }

  const handleCreateTeam = () => {
    if (!clubId) return;
    (navigation as any).navigate(ROUTES.TEAM_FORM, { clubId });
  };

  const handleEditTeam = (teamId: string) => {
    (navigation as any).navigate(ROUTES.TEAM_FORM, { teamId });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back button and title */}
      <View style={[CommonStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[CommonStyles.headerTitle, { color: colors.text.primary }]}>
          {isEditMode ? "Mon club" : "Créer un club"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Theme toggle button */}
      <ThemeToggleButton position="left" />

      {/* Navigation tabs: Info (owner only) and Teams (edit mode only) */}
      {isEditMode && (
        <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {/* Info tab - only visible for club owner */}
          {isOwner && (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "info" && { borderBottomColor: colors.button.club }
              ]}
              onPress={() => setActiveTab("info")}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={activeTab === "info" ? colors.button.club : colors.text.tertiary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "info" ? colors.button.club : colors.text.secondary }
                ]}
              >
                Infos
              </Text>
            </TouchableOpacity>
          )}
          {/* Teams tab - visible for all members */}
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "teams" && { borderBottomColor: colors.button.club },
              !isOwner && styles.tabFullWidth,
            ]}
            onPress={() => setActiveTab("teams")}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={activeTab === "teams" ? colors.button.club : colors.text.tertiary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "teams" ? colors.button.club : colors.text.secondary }
              ]}
            >
              Équipes
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Teams tab content - shows teams management component */}
      {activeTab === "teams" && isEditMode ? (
        <ClubTeamsTab
          clubId={clubId!}
          isOwner={!!isOwner}
          onCreateTeam={handleCreateTeam}
          onEditTeam={handleEditTeam}
        />
      ) : (
        /* Info tab content - club information form */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Club code section - displays shareable 6-digit code (edit mode only) */}
          {isEditMode && club && (
            <View style={[styles.codeSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.codeLabel, { color: colors.text.secondary }]}>Code du club</Text>
              <View style={styles.codeRow}>
                <Text style={[styles.codeText, { color: colors.button.club }]}>{club.code}</Text>
                <TouchableOpacity
                  style={[styles.copyButton, {
                    backgroundColor: colors.background,
                    borderColor: colors.button.club
                  }]}
                  onPress={() => {
                    Clipboard.setString(club.code);
                  }}
                >
                  <Ionicons name="copy-outline" size={24} color={colors.button.club} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.codeHint, { color: colors.text.tertiary }]}>
                Partagez ce code pour inviter des membres
              </Text>
            </View>
          )}

          {/* Basic information section - club name and acronym */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations</Text>

            <Text style={[styles.label, { color: colors.text.secondary }]}>Nom du club *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text.primary
              }]}
              placeholder="Mon super club"
              placeholderTextColor={colors.text.tertiary}
              value={clubName}
              onChangeText={setClubName}
              maxLength={30}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Sigle *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text.primary
              }]}
              placeholder="Ex: LAL, GSW, CHI"
              placeholderTextColor={colors.text.tertiary}
              value={sigle}
              onChangeText={setSigle}
              maxLength={5}
              autoCapitalize="characters"
            />
          </View>

          {/* Customization section - colors, logo, court appearance */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Personnalisation</Text>

            {/* Team colors selection */}
            <View style={styles.colorsRow}>
              <View style={styles.colorsColumn}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Couleur principale</Text>
                <View style={styles.colorPicker}>
                  {CLUB_PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        primaryColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        setPrimaryColor(color);
                        setIsCustomPrimary(false);
                      }}
                    >
                      {primaryColor === color && (
                        <Ionicons name="checkmark" size={20} color={COMMON_COLORS.white} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.gradientContainer}
                    onPress={() => setShowPrimaryPicker(true)}
                  >
                    <View
                      style={[
                        styles.gradientBorder,
                        isCustomPrimary && styles.gradientBorderSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={COURT_PRESET_COLORS}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientButton}
                      >
                        {isCustomPrimary ? (
                          <Ionicons name="checkmark" size={20} color={COMMON_COLORS.white} />
                        ) : (
                          <Ionicons
                            name="color-palette"
                            size={24}
                            color={COMMON_COLORS.white}
                          />
                        )}
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.text.secondary }]}>Couleur secondaire</Text>
                <View style={styles.colorPicker}>
                  {CLUB_PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        secondaryColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        setSecondaryColor(color);
                        setIsCustomSecondary(false);
                      }}
                    >
                      {secondaryColor === color && (
                        <Ionicons name="checkmark" size={20} color={COMMON_COLORS.white} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.gradientContainer}
                    onPress={() => setShowSecondaryPicker(true)}
                  >
                    <View
                      style={[
                        styles.gradientBorder,
                        isCustomSecondary && styles.gradientBorderSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={COURT_PRESET_COLORS}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientButton}
                      >
                        {isCustomSecondary ? (
                          <Ionicons name="checkmark" size={20} color={COMMON_COLORS.white} />
                        ) : (
                          <Ionicons
                            name="color-palette"
                            size={24}
                            color={COMMON_COLORS.white}
                          />
                        )}
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Jersey preview - visual representation of team colors */}
              <View style={styles.jerseyPreview}>
                <JerseyIcon
                  width={180}
                  primaryColor={secondaryColor}
                  secondaryColor={primaryColor}
                  number="23"
                />
              </View>
            </View>

            {/* Logo upload section */}
            <Text style={[styles.label, { color: colors.text.secondary }]}>Logo du club</Text>
            <View style={styles.logoSection}>
              <TouchableOpacity
                style={[styles.logoButton, { borderColor: colors.border }]}
                onPress={handlePickImage}
              >
                <Ionicons name="camera" size={24} color={colors.text.secondary} />
                <Text style={[styles.logoButtonText, { color: colors.text.secondary }]}>Importer un logo</Text>
              </TouchableOpacity>
              {logoUri && (
                <View style={[styles.logoPreview, { borderColor: colors.border }]}>
                  <Image source={{ uri: logoUri }} style={styles.logoImage} />
                </View>
              )}
            </View>
          </View>

          {/* Court preview section - shows how club will appear on basketball court */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Aperçu du terrain</Text>

            <View style={[styles.courtPreview, { backgroundColor: colors.surface }]}>
              {/* Court color customization buttons */}
              <View style={styles.courtColorPickers}>
                <TouchableOpacity
                  style={[
                    styles.courtColorButton,
                    { backgroundColor: courtBackgroundColor },
                  ]}
                  onPress={() => setShowCourtBgPicker(true)}
                >
                  <Ionicons name="color-palette" size={20} color={COMMON_COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.courtColorButton,
                    { backgroundColor: courtLineColor },
                  ]}
                  onPress={() => setShowCourtLinePicker(true)}
                >
                  <Ionicons
                    name="brush"
                    size={20}
                    color={courtLineColor === COMMON_COLORS.white ? COMMON_COLORS.black : COMMON_COLORS.white}
                  />
                </TouchableOpacity>
              </View>

              {/* Court visualization with logo */}
              <View style={styles.courtContainer}>
                <BasketballCourtSVG
                  width={320}
                  height={180}
                  backgroundColor={courtBackgroundColor}
                  lineColor={courtLineColor}
                  logoUri={logoUri}
                />
              </View>
              {/* Club name display */}
              {clubName && (
                <Text style={[styles.clubNamePreview, { color: colors.text.primary }]}>
                  {clubName} {sigle && `(${sigle})`}
                </Text>
              )}
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.button.club },
              saving && [styles.saveButtonDisabled, { backgroundColor: colors.text.disabled }]
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COMMON_COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? "Sauvegarder" : "Créer mon club"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Color Picker Modals - Full-screen modals for custom color selection */}

      {/* Primary color picker modal */}
      <Modal visible={showPrimaryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Couleur principale</Text>
              <TouchableOpacity onPress={() => setShowPrimaryPicker(false)}>
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={primaryColor}
              onCompleteJS={onPrimaryColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[styles.modalConfirmButton, { backgroundColor: colors.button.club }]}
              onPress={() => setShowPrimaryPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Secondary color picker modal */}
      <Modal visible={showSecondaryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Couleur secondaire</Text>
              <TouchableOpacity onPress={() => setShowSecondaryPicker(false)}>
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={secondaryColor}
              onCompleteJS={onSecondaryColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[styles.modalConfirmButton, { backgroundColor: colors.button.club }]}
              onPress={() => setShowSecondaryPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCourtBgPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Couleur du fond du terrain</Text>
              <TouchableOpacity onPress={() => setShowCourtBgPicker(false)}>
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={courtBackgroundColor}
              onCompleteJS={onCourtBgColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[styles.modalConfirmButton, { backgroundColor: colors.button.club }]}
              onPress={() => setShowCourtBgPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCourtLinePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Couleur des lignes du terrain
              </Text>
              <TouchableOpacity onPress={() => setShowCourtLinePicker(false)}>
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={courtLineColor}
              onCompleteJS={onCourtLineColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={[styles.modalConfirmButton, { backgroundColor: colors.button.club }]}
              onPress={() => setShowCourtLinePicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
  },
  tabFullWidth: {
    flex: 1,
  },
  scrollView: {
    padding: 20,
    paddingTop: 15,
  },
  codeSection: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  codeText: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  codeHint: {
    fontSize: 12,
    marginTop: 5,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  colorsRow: {
    flexDirection: "row",
    gap: 20,
  },
  colorsColumn: {
    flex: 1,
  },
  jerseyPreview: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 5,
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
  gradientContainer: {
    width: 50,
    height: 50,
  },
  gradientBorder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientBorderSelected: {
    borderColor: "#333",
  },
  gradientButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  logoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 10,
    borderStyle: "dashed",
  },
  logoButtonText: {
    fontSize: 14,
  },
  logoPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 2,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  courtColorPickers: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 40,
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    zIndex: 10,
  },
  courtColorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  courtPreview: {
    position: "relative",
    alignItems: "center",
    padding: 20,
    borderRadius: 15,
  },
  courtContainer: {
    width: 427,
    height: 240,
  },
  clubNamePreview: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
  },
  saveButton: {
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  saveButtonDisabled: {
  },
  saveButtonText: {
    color: COMMON_COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
