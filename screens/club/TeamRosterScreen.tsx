import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CommonStyles } from "../../src/theme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useSignedUrl } from "../../hooks/useSignedUrl";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import { ClubStorageService } from "../../services/ClubStorageService";
import { RootStackParamList, RootNavigationProp } from "../../types/navigation";
import PlayerAvatar from "../../components/PlayerAvatar";
import { showErrorAlert } from "../../utils/errorAlert";

/**
 * Local player interface for this screen
 * Temporary players have an ID starting with "temp-"
 */
interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string | undefined;
  licenseNumber?: string | undefined;
}

type TeamRosterRouteProp = RouteProp<RootStackParamList, "TeamRoster">;

/**
 * PlayerPhotoPreview - Component for displaying player photo in edit mode
 * Handles signed URL generation for private bucket access
 */
interface PlayerPhotoPreviewProps {
  photoUrl?: string;
  editingPlayerPhoto: string;
  onPress: () => void;
  size: number;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
}

function PlayerPhotoPreview({
  photoUrl,
  editingPlayerPhoto,
  onPress,
  size,
  borderColor,
  backgroundColor,
  textColor,
}: PlayerPhotoPreviewProps) {
  const [imageError, setImageError] = React.useState(false);
  const signedPhotoUrl = useSignedUrl(photoUrl);

  // Reset error state when photo changes
  React.useEffect(() => {
    setImageError(false);
  }, [photoUrl, editingPlayerPhoto]);

  // Determine which URL to use
  const imageUrl = editingPlayerPhoto || signedPhotoUrl;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          backgroundColor,
          borderColor,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
      ]}
    >
      {imageUrl && !imageError ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: "100%", height: "100%", resizeMode: "cover" }}
          onError={() => setImageError(true)}
        />
      ) : (
        <Ionicons name="person" size={20} color={textColor} />
      )}
    </TouchableOpacity>
  );
}

/**
 * TeamRosterScreen - Staff and roster management screen
 * Features:
 * - Add/edit head coach information
 * - Manage team roster (5-15 players)
 * - Add/edit/delete players
 * - Upload photos for coach and players
 */
export default function TeamRosterScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<TeamRosterRouteProp>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();
  const { clubId, teamId, teamData } = route.params;

  // Coach state
  const [coachName, setCoachName] = useState("");
  const [coachPhotoUrl, setCoachPhotoUrl] = useState("");
  const [isEditingCoach, setIsEditingCoach] = useState(false);

  // Players state
  const [roster, setRoster] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPhoto, setNewPlayerPhoto] = useState("");
  const [newPlayerLicense, setNewPlayerLicense] = useState("");
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Player editing state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [editingPlayerNumber, setEditingPlayerNumber] = useState("");
  const [editingPlayerPhoto, setEditingPlayerPhoto] = useState("");
  const [editingPlayerLicense, setEditingPlayerLicense] = useState("");
  const [editPlayerError, setEditPlayerError] = useState<string | null>(null);

  // Theme colors
  const bgColor = colors.background;
  const surfaceColor = colors.surface;

  // Generate signed URL for coach photo
  const signedCoachPhotoUrl = useSignedUrl(coachPhotoUrl);

  // Load existing team data if editing
  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId]);

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  /**
   * Load existing team data in edit mode
   * Fetches coach info and player list
   * Checks if user is team owner
   */
  const loadTeamData = async () => {
    try {
      const teamService = ServiceFactory.getTeamService(supabase);
      const team = await teamService.getTeamById(teamId!);

      if (team) {
        setCoachName(team.coachName || "");
        setCoachPhotoUrl(team.coachPhotoUrl || "");

        const playerService = ServiceFactory.getPlayerService(supabase);
        const players = await playerService.getTeamPlayers(teamId!);
        setRoster(players);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
      showErrorAlert({
        action: "charger les données de l'équipe",
        error,
        context: "TeamRosterScreen",
        onCancel: () => navigation.goBack(),
      });
    }
  };

  /**
   * Add a new player to the roster
   * Validations:
   * - Name and number required
   * - Max 15 players
   * - No duplicate names
   * - Jersey number between 0-99
   */
  const handleAddPlayer = () => {
    setAddPlayerError(null);
    const trimmedName = newPlayerName.trim();
    const trimmedNumber = newPlayerNumber.trim();

    if (!trimmedName || !trimmedNumber) return;

    // Validation: Check max roster size
    if (roster.length >= 15) {
      setAddPlayerError("Limite maximale de 15 joueurs atteinte.");
      return;
    }

    // Validation: Check duplicate name
    const isDuplicateName = roster.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicateName) {
      setAddPlayerError("Un joueur avec ce nom existe déjà.");
      return;
    }

    // Validation: Check if number is valid integer
    const numValue = parseInt(trimmedNumber, 10);
    if (
      isNaN(numValue) ||
      numValue < 0 ||
      numValue > 99 ||
      !Number.isInteger(Number(trimmedNumber))
    ) {
      setAddPlayerError("Le numéro doit être entre 0 et 99.");
      return;
    }

    // Validation: Check duplicate jersey number
    const isDuplicateNumber = roster.some((p) => p.jerseyNumber === numValue);
    if (isDuplicateNumber) {
      setAddPlayerError("Ce numéro de maillot est déjà utilisé.");
      return;
    }

    const newPlayer: Player = {
      id: `temp-${Date.now()}`,
      name: trimmedName,
      jerseyNumber: numValue,
      photoUrl: newPlayerPhoto || undefined,
      licenseNumber: newPlayerLicense.trim() || undefined,
    };

    setRoster([...roster, newPlayer]);
    setNewPlayerName("");
    setNewPlayerNumber("");
    setNewPlayerPhoto("");
    setNewPlayerLicense("");
  };

  /**
   * Remove a player from the roster
   * Shows a warning for existing players (with stats)
   * No warning for new temporary players
   */
  const handleRemovePlayer = (id: string, playerName: string) => {
    // Check if player is new (temp ID) or existing
    const isNewPlayer = id.startsWith("temp-");

    if (isNewPlayer) {
      // For new players, no warning needed - just remove
      setRoster(roster.filter((p) => p.id !== id));
    } else {
      // For existing players in edit mode, show warning about stats
      Alert.alert(
        "Supprimer le joueur",
        `Êtes-vous sûr de vouloir supprimer ${playerName} ?\n\n⚠️ Attention : Toutes les statistiques associées à ce joueur seront définitivement perdues.`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => {
              setRoster(roster.filter((p) => p.id !== id));
            },
          },
        ],
      );
    }
  };

  const handleEditPlayer = (playerId: string) => {
    const player = roster.find((p) => p.id === playerId);
    if (player) {
      setEditingPlayerId(playerId);
      setEditingPlayerName(player.name);
      setEditingPlayerNumber(player.jerseyNumber.toString());
      setEditingPlayerPhoto(""); // Don't set existing photo - let component show it via signedUrl
      setEditingPlayerLicense(player.licenseNumber || "");
      setEditPlayerError(null);
    }
  };

  const handleSavePlayerEdit = (playerId: string) => {
    setEditPlayerError(null);

    const trimmedName = editingPlayerName.trim();
    const trimmedNumber = editingPlayerNumber.trim();

    if (!trimmedName || !trimmedNumber) return;

    const numValue = parseInt(trimmedNumber, 10);
    if (
      isNaN(numValue) ||
      numValue < 0 ||
      numValue > 99 ||
      !Number.isInteger(Number(trimmedNumber))
    ) {
      setEditPlayerError("Le numéro doit être entre 0 et 99.");
      return;
    }

    // Check if name already exists (excluding current player)
    const isDuplicateName = roster.some(
      (p) =>
        p.id !== playerId && p.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (isDuplicateName) {
      setEditPlayerError("Un joueur avec ce nom existe déjà.");
      return;
    }

    // Check if jersey number already exists (excluding current player)
    const isDuplicateNumber = roster.some(
      (p) => p.id !== playerId && p.jerseyNumber === numValue,
    );

    if (isDuplicateNumber) {
      setEditPlayerError("Ce numéro de maillot est déjà utilisé.");
      return;
    }

    setRoster(
      roster.map((p) =>
        p.id === playerId
          ? {
              ...p,
              name: trimmedName,
              jerseyNumber: numValue,
              photoUrl: editingPlayerPhoto || p.photoUrl,
              licenseNumber: editingPlayerLicense.trim() || undefined,
            }
          : p,
      ),
    );
    setEditingPlayerId(null);
    setEditingPlayerPhoto("");
    setEditingPlayerLicense("");
    setEditPlayerError(null);
  };

  /**
   * Open image picker for coach photo
   * Stores local URI (upload happens on submit)
   */
  const handlePickCoachPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      setCoachPhotoUrl(localUri);
    }
  };

  /**
   * Open image picker for player photo
   * Stores local URI (upload happens on submit)
   * @param isEditing - true if editing existing player, false if adding new
   */
  const handlePickPlayerPhoto = async (isEditing: boolean = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      if (isEditing) {
        setEditingPlayerPhoto(localUri);
      } else {
        setNewPlayerPhoto(localUri);
      }
    }
  };

  /**
   * Save the team (create or update)
   * Creates/updates team with coach info
   * Then creates/updates/deletes players intelligently
   */
  const handleNext = async () => {
    if (!coachName.trim()) {
      Alert.alert("Erreur", "Le nom du coach est obligatoire");
      setIsEditingCoach(true);
      return;
    }

    if (roster.length < 5) {
      Alert.alert(
        "Erreur",
        `L'équipe doit comporter au moins 5 joueurs (Actuellement : ${roster.length})`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const clubStorageService = new ClubStorageService(supabase);
      const teamService = ServiceFactory.getTeamService(supabase);

      let uploadedCoachPhotoUrl: string | undefined = coachPhotoUrl;

      if (teamId) {
        // Upload coach photo for existing team (teamId is known, RLS passes)
        if (coachPhotoUrl && coachPhotoUrl.startsWith("file://")) {
          const { path, error } = await clubStorageService.uploadCoachPhoto(
            coachPhotoUrl,
            teamId,
            clubId,
          );

          if (error) {
            setIsSubmitting(false);
            showErrorAlert({
              action: "uploader la photo du coach",
              error: new Error("Impossible d'uploader la photo du coach"),
              context: "TeamRosterScreen",
            });
            return;
          }

          uploadedCoachPhotoUrl = path ?? undefined;
        }

        // Update existing team
        const updateResult = await teamService.updateTeam(
          teamId,
          {
            name: teamData.name,
            category: teamData.category,
            gender: teamData.gender,
            coachName: coachName.trim(),
            coachPhotoUrl: uploadedCoachPhotoUrl || undefined,
          },
          user!.id,
        );

        if (!updateResult.success) {
          setIsSubmitting(false);
          Alert.alert(
            "Erreur de modification",
            updateResult.error || "Impossible de modifier l'équipe. Vous n'avez peut-être pas les permissions nécessaires."
          );
          return;
        }

        // Update players intelligently
        const playerService = ServiceFactory.getPlayerService(supabase);
        const existingPlayers = await playerService.getTeamPlayers(teamId);

        // 1. Update or create players from roster
        for (const player of roster) {
          if (player.id.startsWith("temp-")) {
            // New player - CREATE first to get real ID
            const createResult = await playerService.createPlayer({
              teamId,
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: null, // Will be updated after upload
              licenseNumber: player.licenseNumber,
            });

            if (!createResult.success || !createResult.player) {
              console.error(`Error creating player ${player.name}:`, createResult.error);
              continue;
            }

            const newPlayer = createResult.player;

            // Upload player photo if it's a local file (now with real ID)
            if (player.photoUrl && player.photoUrl.startsWith("file://")) {
              const { path, error } = await clubStorageService.uploadPlayerPhoto(
                player.photoUrl,
                newPlayer.id, // ← Use real player ID
                teamId,
                clubId,
              );

              if (error) {
                console.error(
                  `Error uploading photo for player ${player.name}:`,
                  error,
                );
                // Continue without photo if upload fails
              } else if (path) {
                // Update player with photo path
                await playerService.updatePlayer(newPlayer.id, {
                  photoUrl: path,
                });
              }
            }
          } else {
            // Existing player - update it
            let uploadedPlayerPhotoUrl = player.photoUrl;

            // Upload new photo if it's a local file
            if (player.photoUrl && player.photoUrl.startsWith("file://")) {
              const { path, error } = await clubStorageService.uploadPlayerPhoto(
                player.photoUrl,
                player.id, // ← Use existing player ID
                teamId,
                clubId,
              );

              if (error) {
                console.error(
                  `Error uploading photo for player ${player.name}:`,
                  error,
                );
                // Continue without photo if upload fails
                uploadedPlayerPhotoUrl = undefined;
              } else {
                uploadedPlayerPhotoUrl = path || undefined;
              }
            }

            await playerService.updatePlayer(player.id, {
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: uploadedPlayerPhotoUrl,
              licenseNumber: player.licenseNumber,
            });
          }
        }

        // 2. Delete players that are no longer in roster
        const rosterIds = roster
          .filter((p) => !p.id.startsWith("temp-"))
          .map((p) => p.id);
        const playersToDelete = existingPlayers.filter(
          (p) => !rosterIds.includes(p.id),
        );
        for (const player of playersToDelete) {
          await playerService.deletePlayer(player.id, teamId);
        }

        setIsSubmitting(false);
        Alert.alert("Succès", "Équipe modifiée avec succès !", [
          {
            text: "OK",
            onPress: () => {
              // Go back to previous screen (Club)
              navigation.goBack();
              navigation.goBack();
            },
          },
        ]);
      } else {
        // Create new team first (without coach photo) so teamId exists for RLS
        const result = await teamService.createTeam(
          {
            clubId,
            name: teamData.name,
            category: teamData.category,
            gender: teamData.gender,
            coachName: coachName.trim(),
          },
          user!.id,
        );

        if (!result.success || !result.team) {
          setIsSubmitting(false);
          showErrorAlert({
            action: "créer l'équipe",
            error: new Error(result.error || "Impossible de créer l'équipe"),
            context: "TeamRosterScreen",
          });
          return;
        }

        // Upload coach photo now that the team exists in DB (RLS will pass)
        if (coachPhotoUrl && coachPhotoUrl.startsWith("file://")) {
          const { path, error } = await clubStorageService.uploadCoachPhoto(
            coachPhotoUrl,
            result.team.id,
            clubId,
          );

          if (error) {
            console.error("Error uploading coach photo:", error);
            // Continue without photo if upload fails
          } else if (path) {
            await teamService.updateTeam(result.team.id, { coachPhotoUrl: path }, user!.id);
          }
        }

        // Create players with uploaded photos
        const playerService = ServiceFactory.getPlayerService(supabase);
        for (const player of roster) {
          // Step 1: CREATE player first to get real ID
          const createResult = await playerService.createPlayer({
            teamId: result.team.id,
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            photoUrl: null, // Will be updated after upload
            licenseNumber: player.licenseNumber,
          });

          if (!createResult.success || !createResult.player) {
            console.error(`Error creating player ${player.name}:`, createResult.error);
            continue;
          }

          const newPlayer = createResult.player;

          // Step 2: UPLOAD photo if it's a local file (now with real player ID)
          if (player.photoUrl && player.photoUrl.startsWith("file://")) {
            const { path, error } = await clubStorageService.uploadPlayerPhoto(
              player.photoUrl,
              newPlayer.id, // ← Use real player ID
              result.team.id,
              clubId,
            );

            if (error) {
              console.error(
                `Error uploading photo for player ${player.name}:`,
                error,
              );
              // Continue without photo if upload fails
            } else if (path) {
              // Step 3: UPDATE player with photo path
              await playerService.updatePlayer(newPlayer.id, {
                photoUrl: path,
              });
            }
          }
        }

        setIsSubmitting(false);
        Alert.alert("Succès", "Équipe créée avec succès !", [
          {
            text: "OK",
            onPress: () => {
              // Go back to previous screen (Club)
              navigation.goBack();
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Error saving team:", error);
      setIsSubmitting(false);
      showErrorAlert({
        action: "sauvegarder l'équipe",
        error,
        context: "TeamRosterScreen",
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View
        style={[
          CommonStyles.header,
          {
            backgroundColor: surfaceColor,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={[CommonStyles.headerTitle, { color: colors.text.primary }]}
        >
          Staff & Effectif
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View
        style={[
          styles.progressContainer,
          { gap: sp.sm, paddingHorizontal: sp.lg, paddingVertical: sp.md },
        ]}
      >
        <View
          style={[styles.progressBar, { backgroundColor: colors.primary }]}
        />
        <View
          style={[styles.progressBar, { backgroundColor: colors.primary }]}
        />
      </View>

      <ScrollView style={[styles.content, { padding: sp.lg }]}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text.primary,
              fontSize: font.xxl,
              marginBottom: sp.lg,
            },
          ]}
        >
          Staff & Effectif
        </Text>

        {/* Coach Section */}
        <View style={[styles.section, { marginBottom: sp.xl }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text.tertiary,
                fontSize: font.xs,
                marginBottom: sp.sm,
              },
            ]}
          >
            STAFF TECHNIQUE
          </Text>

          <View
            style={[
              styles.coachCard,
              {
                backgroundColor: surfaceColor,
                borderColor: colors.border,
              },
            ]}
          >
            {isEditingCoach ? (
              <View style={styles.coachEditForm}>
                <View style={styles.coachEditHeader}>
                  <Text
                    style={[
                      styles.coachEditTitle,
                      { color: colors.text.primary },
                    ]}
                  >
                    Modifier le coach
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsEditingCoach(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.coachEditContent}>
                  <TouchableOpacity
                    onPress={handlePickCoachPhoto}
                    style={[
                      styles.coachPhoto,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    {signedCoachPhotoUrl ? (
                      <Image
                        source={{ uri: signedCoachPhotoUrl }}
                        style={styles.photoImage}
                      />
                    ) : (
                      <Ionicons
                        name="person"
                        size={24}
                        color={colors.text.tertiary}
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.coachEditInputs}>
                    <TextInput
                      style={[
                        styles.coachInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text.primary,
                        },
                      ]}
                      placeholder="Nom du coach"
                      placeholderTextColor={colors.text.tertiary}
                      value={coachName}
                      onChangeText={setCoachName}
                    />
                    <TouchableOpacity
                      style={[
                        styles.saveCoachButton,
                        {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => setIsEditingCoach(false)}
                    >
                      <Text style={styles.saveCoachText}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.coachDisplay}>
                <View style={styles.coachInfo}>
                  <View
                    style={[styles.coachPhoto, { borderColor: colors.border }]}
                  >
                    {signedCoachPhotoUrl ? (
                      <Image
                        source={{ uri: signedCoachPhotoUrl }}
                        style={styles.photoImage}
                      />
                    ) : (
                      <Ionicons
                        name="person"
                        size={24}
                        color={colors.text.tertiary}
                      />
                    )}
                  </View>
                  <View>
                    <View style={styles.coachNameRow}>
                      <Text
                        style={[
                          styles.coachName,
                          { color: colors.text.primary },
                        ]}
                      >
                        {coachName || "Nom du Coach"}
                      </Text>
                      {!coachName && <Text style={styles.required}> *</Text>}
                    </View>
                    <View style={styles.coachRole}>
                      <Ionicons
                        name="briefcase"
                        size={12}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.coachRoleText,
                          { color: colors.primary },
                        ]}
                      >
                        Coach Principal
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsEditingCoach(true)}
                  style={[
                    styles.editButton,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name="pencil"
                    size={16}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Roster Section */}
        <View style={[styles.section, { marginBottom: sp.xl }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text.tertiary,
                fontSize: font.xs,
                marginBottom: sp.sm,
              },
            ]}
          >
            JOUEURS ({roster.length}/15)
          </Text>

          {/* Warning if less than 5 players */}
          {roster.length < 5 && (
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                  gap: sp.sm,
                  padding: sp.sm,
                  marginBottom: sp.sm,
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.primary} />
              <Text
                style={{
                  flex: 1,
                  fontSize: font.sm,
                  fontWeight: "bold",
                  color: colors.primary,
                }}
              >
                Il manque encore {5 - roster.length} joueur(s) pour continuer.
              </Text>
            </View>
          )}

          {/* Add Player Form */}
          <View
            style={[
              styles.addPlayerCard,
              {
                backgroundColor: surfaceColor,
                borderColor: colors.border,
                padding: sp.md,
                marginBottom: sp.sm,
              },
            ]}
          >
            <View
              style={[
                styles.addPlayerHeader,
                { gap: sp.sm, marginBottom: sp.md },
              ]}
            >
              <Ionicons name="add-circle" size={16} color={colors.primary} />
              <Text
                style={[
                  styles.addPlayerTitle,
                  { color: colors.text.primary, fontSize: font.md },
                ]}
              >
                Ajouter un joueur
              </Text>
            </View>

            <View
              style={[
                styles.addPlayerForm,
                { gap: sp.sm, marginBottom: sp.sm },
              ]}
            >
              <TouchableOpacity
                onPress={() => handlePickPlayerPhoto(false)}
                style={[
                  styles.playerPhotoPreview,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    width: isCompact ? sizes.avatarSm : sizes.avatarMd,
                    height: isCompact ? sizes.avatarSm : sizes.avatarMd,
                    borderRadius: isCompact
                      ? sizes.avatarSm / 2
                      : sizes.avatarMd / 2,
                  },
                ]}
              >
                {newPlayerPhoto ? (
                  <Image
                    source={{ uri: newPlayerPhoto }}
                    style={styles.photoImage}
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={20}
                    color={colors.text.tertiary}
                  />
                )}
              </TouchableOpacity>

              <View style={[styles.addPlayerInputs, { gap: sp.sm }]}>
                <TextInput
                  style={[
                    styles.playerInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text.primary,
                      padding: sp.sm,
                      fontSize: font.md,
                    },
                  ]}
                  placeholder="Nom du joueur"
                  placeholderTextColor={colors.text.tertiary}
                  value={newPlayerName}
                  onChangeText={(text) => {
                    setNewPlayerName(text);
                    setAddPlayerError(null);
                  }}
                />
                <TextInput
                  style={[
                    styles.playerInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text.primary,
                      padding: sp.sm,
                      fontSize: font.md,
                    },
                  ]}
                  placeholder="VTXXXXXX"
                  placeholderTextColor={colors.text.tertiary}
                  value={newPlayerLicense}
                  onChangeText={setNewPlayerLicense}
                  autoCapitalize="characters"
                />
                <View style={[styles.numberRow, { gap: sp.sm }]}>
                  <TextInput
                    style={[
                      styles.numberInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text.primary,
                        padding: sp.sm,
                        fontSize: font.md,
                      },
                    ]}
                    placeholder="#"
                    placeholderTextColor={colors.text.tertiary}
                    value={newPlayerNumber}
                    onChangeText={(text) => {
                      // Only allow digits (no dots, minus, etc)
                      const filtered = text.replace(/[^0-9]/g, "");
                      setNewPlayerNumber(filtered);
                      setAddPlayerError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      {
                        backgroundColor:
                          newPlayerName && newPlayerNumber && roster.length < 15
                            ? colors.primary
                            : colors.text.disabled,
                      },
                    ]}
                    onPress={handleAddPlayer}
                    disabled={
                      !newPlayerName || !newPlayerNumber || roster.length >= 15
                    }
                  >
                    <Text style={styles.addButtonText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
                {addPlayerError && (
                  <Text style={[styles.errorText, { fontSize: font.sm }]}>
                    {addPlayerError}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Player List */}
          {roster.length === 0 ? (
            <View
              style={[
                styles.emptyRoster,
                {
                  backgroundColor: `${colors.surface}80`,
                  borderColor: colors.border,
                  padding: sp.xl,
                },
              ]}
            >
              <Ionicons
                name="people"
                size={24}
                color={colors.text.tertiary}
                style={{ opacity: 0.5 }}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.text.tertiary, fontSize: font.md },
                ]}
              >
                Effectif vide
              </Text>
            </View>
          ) : (
            <View style={[styles.playerList, { gap: sp.sm }]}>
              {roster.map((player) => {
                const isEditing = editingPlayerId === player.id;

                return (
                  <View
                    key={player.id}
                    style={[
                      styles.playerCard,
                      {
                        backgroundColor: surfaceColor,
                        borderColor: colors.border,
                        padding: sp.sm,
                      },
                    ]}
                  >
                    {isEditing ? (
                      // Edit mode
                      <View style={[styles.playerEditForm, { gap: sp.sm }]}>
                        <PlayerPhotoPreview
                          photoUrl={player.photoUrl}
                          editingPlayerPhoto={editingPlayerPhoto}
                          onPress={() => handlePickPlayerPhoto(true)}
                          size={isCompact ? sizes.avatarSm : sizes.avatarMd}
                          borderColor={colors.border}
                          backgroundColor={colors.surface}
                          textColor={colors.text.tertiary}
                        />
                        <View style={[styles.playerEditInputs, { gap: sp.sm }]}>
                          <TextInput
                            style={[
                              styles.playerInput,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.text.primary,
                                padding: sp.sm,
                                fontSize: font.md,
                              },
                            ]}
                            placeholder="Nom du joueur"
                            placeholderTextColor={colors.text.tertiary}
                            value={editingPlayerName}
                            onChangeText={(text) => {
                              setEditingPlayerName(text);
                              setEditPlayerError(null);
                            }}
                          />
                          <TextInput
                            style={[
                              styles.playerInput,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.text.primary,
                                padding: sp.sm,
                                fontSize: font.md,
                              },
                            ]}
                            placeholder="VTXXXXXX"
                            placeholderTextColor={colors.text.tertiary}
                            value={editingPlayerLicense}
                            onChangeText={setEditingPlayerLicense}
                            autoCapitalize="characters"
                          />
                          <View
                            style={[styles.playerEditActions, { gap: sp.sm }]}
                          >
                            <TextInput
                              style={[
                                styles.numberInput,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                  color: colors.text.primary,
                                  padding: sp.sm,
                                  fontSize: font.md,
                                },
                              ]}
                              placeholder="#"
                              placeholderTextColor={colors.text.tertiary}
                              value={editingPlayerNumber}
                              onChangeText={(text) => {
                                const filtered = text.replace(/[^0-9]/g, "");
                                setEditingPlayerNumber(filtered);
                                setEditPlayerError(null);
                              }}
                              keyboardType="number-pad"
                              maxLength={2}
                            />
                            <TouchableOpacity
                              onPress={() => handleSavePlayerEdit(player.id)}
                              style={[
                                styles.saveButton,
                                { backgroundColor: colors.primary },
                              ]}
                            >
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="#fff"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                setEditingPlayerId(null);
                                setEditingPlayerPhoto("");
                                setEditingPlayerLicense("");
                                setEditPlayerError(null);
                              }}
                              style={[
                                styles.cancelButton,
                                {
                                  backgroundColor: colors.surface,
                                },
                              ]}
                            >
                              <Ionicons
                                name="close"
                                size={16}
                                color={colors.text.secondary}
                              />
                            </TouchableOpacity>
                          </View>
                          {editPlayerError && (
                            <Text
                              style={[styles.errorText, { fontSize: font.sm }]}
                            >
                              {editPlayerError}
                            </Text>
                          )}
                        </View>
                      </View>
                    ) : (
                      // Display mode
                      <>
                        <View style={[styles.playerInfo, { gap: sp.sm }]}>
                          <PlayerAvatar
                            playerName={player.name}
                            playerNumber={player.jerseyNumber}
                            photoUrl={player.photoUrl}
                            size={isCompact ? sizes.avatarSm : sizes.avatarSm}
                            borderColor={colors.border}
                            backgroundColor={colors.surface}
                            textColor={colors.text.secondary}
                            borderWidth={2}
                          />
                          <View>
                            <Text
                              style={[
                                styles.playerName,
                                {
                                  color: colors.text.primary,
                                  fontSize: font.md,
                                },
                              ]}
                            >
                              {player.name}
                            </Text>
                            <Text
                              style={[
                                styles.playerMeta,
                                {
                                  color: colors.text.secondary,
                                  fontSize: font.sm,
                                },
                              ]}
                            >
                              #{player.jerseyNumber}
                              {player.licenseNumber ? ` · ${player.licenseNumber}` : ""}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.playerActions}>
                          <TouchableOpacity
                            onPress={() => handleEditPlayer(player.id)}
                            style={[
                              styles.editButton,
                              {
                                backgroundColor: colors.surface,
                              },
                            ]}
                          >
                            <Ionicons
                              name="pencil"
                              size={16}
                              color={colors.text.secondary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              handleRemovePlayer(player.id, player.name)
                            }
                            style={styles.deleteButton}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: surfaceColor,
            borderTopColor: colors.border,
            padding: sp.lg,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor:
                coachName.trim() && roster.length >= 5 && !isSubmitting
                  ? colors.primary
                  : colors.text.disabled,
              padding: isCompact ? sp.md : sp.lg,
            },
          ]}
          onPress={handleNext}
          disabled={!coachName.trim() || roster.length < 5 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text
                style={[
                  styles.nextButtonText,
                  { marginLeft: sp.sm, fontSize: font.lg },
                ]}
              >
                {teamId ? "Modification..." : "Création..."}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.nextButtonText, { fontSize: font.lg }]}>
                {teamId ? "Modifier l'équipe" : "Créer l'équipe"}
              </Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
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
  progressContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 12,
  },
  coachCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  coachDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coachInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  coachPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coachNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coachName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  required: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  coachRole: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  coachRoleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
  },
  coachEditForm: {
    gap: 12,
  },
  coachEditHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coachEditTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  coachEditContent: {
    flexDirection: "row",
    gap: 12,
  },
  coachEditInputs: {
    flex: 1,
    gap: 8,
  },
  coachInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    fontWeight: "bold",
  },
  saveCoachButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveCoachText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "bold",
  },
  addPlayerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  addPlayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  addPlayerTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  addPlayerForm: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  playerPhotoPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  addPlayerInputs: {
    flex: 1,
    gap: 8,
  },
  playerInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  numberRow: {
    flexDirection: "row",
    gap: 8,
  },
  numberInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  addButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "bold",
  },
  emptyRoster: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  playerList: {
    gap: 8,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  playerNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  playerNumberText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  playerName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  playerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  playerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  playerEditForm: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  playerEditInputs: {
    flex: 1,
    gap: 8,
  },
  playerEditActions: {
    flexDirection: "row",
    gap: 8,
  },
  saveButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
