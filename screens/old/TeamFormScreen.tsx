import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../../src/config/supabase";
import { ServiceFactory } from "../../services/ServiceFactory";
import { useAuth } from "../../src/contexts/AuthContext";
import type { TeamGender, Team } from "../../models/Team";
import TeamPlayersManager from "../../components/TeamPlayersManager";
import { PhotoUploadService } from "../../services/PhotoUploadService";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CommonStyles } from "../../src/theme";

type RootStackParamList = {
  TeamForm: { clubId?: string; teamId?: string };
};

type TeamFormRouteProp = RouteProp<RootStackParamList, "TeamForm">;

const GENDERS: { value: TeamGender; label: string }[] = [
  { value: "male", label: "Masculin" },
  { value: "female", label: "Féminin" },
  { value: "mixed", label: "Mixte" },
];

export default function TeamFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<TeamFormRouteProp>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const teamId = route.params?.teamId;
  const clubId = route.params?.clubId;
  const isEditMode = !!teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [teamName, setTeamName] = useState("");
  const [selectedGender, setSelectedGender] = useState<TeamGender | undefined>(
    undefined
  );
  const [coachName, setCoachName] = useState("Coach");
  const [coachPhotoUrl, setCoachPhotoUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<any[]>([
    {
      id: "temp-1",
      name: "Player 1",
      jerseyNumber: 1,
      position: 1,
      isStarter: true,
    },
    {
      id: "temp-2",
      name: "Player 2",
      jerseyNumber: 2,
      position: 2,
      isStarter: true,
    },
    {
      id: "temp-3",
      name: "Player 3",
      jerseyNumber: 3,
      position: 3,
      isStarter: true,
    },
    {
      id: "temp-4",
      name: "Player 4",
      jerseyNumber: 4,
      position: 4,
      isStarter: true,
    },
    {
      id: "temp-5",
      name: "Player 5",
      jerseyNumber: 5,
      position: 5,
      isStarter: true,
    },
  ]);

  // Load team data if in edit mode
  React.useEffect(() => {
    if (isEditMode && teamId) {
      loadTeam();
    }
  }, [teamId]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const teamService = ServiceFactory.getTeamService(supabase);
      const teamData = await teamService.getTeamById(teamId!);

      if (teamData) {
        setTeam(teamData);
        setTeamName(teamData.name);
        setSelectedGender(teamData.gender);
        setCoachName(teamData.coachName || "Coach");
        setCoachPhotoUrl(teamData.coachPhotoUrl);

        // Load players
        const playerService = ServiceFactory.getPlayerService(supabase);
        const teamPlayers = await playerService.getTeamPlayers(teamId!);
        setPlayers(teamPlayers);
      } else {
        Alert.alert("Erreur", "Équipe introuvable");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading team:", error);
      Alert.alert("Erreur", "Impossible de charger l'équipe");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !teamId) return;

    Alert.alert(
      "Supprimer l'équipe",
      "Êtes-vous sûr de vouloir supprimer cette équipe ? Cette action est définitive.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const teamService = ServiceFactory.getTeamService(supabase);
              const result = await teamService.deleteTeam(teamId, user.id);

              if (result.success) {
                Alert.alert("Succès", "L'équipe a été supprimée", [
                  { text: "OK", onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert(
                  "Erreur",
                  result.error || "Impossible de supprimer l'équipe"
                );
              }
            } catch (error) {
              console.error("Error deleting team:", error);
              Alert.alert("Erreur", "Une erreur est survenue");
            }
          },
        },
      ]
    );
  };

  /**
   * Upload photo to Supabase if it's a local URI
   * Returns Supabase URL or original value if already uploaded
   */
  const uploadPhotoIfNeeded = async (
    photoUrl: string | undefined,
    playerId: string
  ): Promise<string | undefined> => {
    if (!photoUrl) return undefined;

    // If already a Supabase URL, return as is
    if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
      return photoUrl;
    }

    // Local URI - need to upload
    const photoService = new PhotoUploadService(supabase);
    const { url, error } = await photoService.uploadPlayerPhoto(
      photoUrl,
      playerId
    );

    if (error) {
      console.error("Error uploading player photo:", error);
      return undefined; // Continue without photo rather than failing
    }

    return url || undefined;
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Erreur", "Vous devez être connecté");
      return;
    }

    if (!teamName.trim()) {
      Alert.alert("Erreur", "Le nom de l'équipe est requis");
      return;
    }

    // Validate player count
    if (players.length < 5) {
      Alert.alert("Erreur", "Votre équipe doit avoir au moins 5 joueurs");
      return;
    }

    // Validate exactly 5 starters
    const startersCount = players.filter((p) => p.isStarter).length;
    if (startersCount !== 5) {
      Alert.alert(
        "Erreur",
        "Votre équipe doit avoir exactement 5 joueurs titulaires"
      );
      return;
    }

    setSaving(true);

    try {
      const teamService = ServiceFactory.getTeamService(supabase);

      if (isEditMode && teamId) {
        // Update existing team
        const result = await teamService.updateTeam(
          teamId,
          {
            name: teamName.trim(),
            gender: selectedGender,
            coachName: coachName.trim(),
            coachPhotoUrl: coachPhotoUrl,
          },
          user.id
        );

        if (!result.success) {
          Alert.alert(
            "Erreur",
            result.error || "Impossible de modifier l'équipe"
          );
          setSaving(false);
          return;
        }

        // Save players in edit mode
        const playerService = ServiceFactory.getPlayerService(supabase);

        // Get existing players from DB
        const existingPlayers = await playerService.getTeamPlayers(teamId);
        const existingIds = new Set(existingPlayers.map((p) => p.id));
        const currentIds = new Set(
          players.filter((p) => !p.id.startsWith("temp-")).map((p) => p.id)
        );

        // Update or create players
        for (const player of players) {
          // Upload photo if it's a local URI
          const uploadedPhotoUrl = await uploadPhotoIfNeeded(
            player.photoUrl,
            player.id
          );

          if (player.id.startsWith("temp-")) {
            // New player - CREATE
            await playerService.createPlayer({
              teamId,
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: uploadedPhotoUrl,
              position: player.position,
              isStarter: player.isStarter,
            });
          } else {
            // Existing player - UPDATE
            await playerService.updatePlayer(player.id, {
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: uploadedPhotoUrl,
              position: player.position,
              isStarter: player.isStarter,
            });
          }
        }

        // Delete players that are no longer in the list
        for (const existingPlayer of existingPlayers) {
          if (!currentIds.has(existingPlayer.id)) {
            await playerService.deletePlayer(existingPlayer.id, teamId);
          }
        }

        Alert.alert("Succès", "L'équipe a été modifiée");
        loadTeam();
      } else {
        // Create new team
        const result = await teamService.createTeam(
          {
            name: teamName.trim(),
            clubId: clubId!,
            gender: selectedGender,
            coachName: coachName.trim(),
            coachPhotoUrl: coachPhotoUrl,
          },
          user.id
        );

        if (!result.success) {
          Alert.alert("Erreur", result.error || "Impossible de créer l'équipe");
          setSaving(false);
          return;
        }

        const newTeamId = result.team?.id;
        if (!newTeamId) {
          Alert.alert("Erreur", "Impossible de récupérer l'ID de l'équipe");
          setSaving(false);
          return;
        }

        // Create players from state
        const playerService = ServiceFactory.getPlayerService(supabase);
        for (const player of players) {
          // Upload photo if it's a local URI
          const uploadedPhotoUrl = await uploadPhotoIfNeeded(
            player.photoUrl,
            player.id
          );

          await playerService.createPlayer({
            teamId: newTeamId,
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            position: player.position,
            isStarter: player.isStarter,
            photoUrl: uploadedPhotoUrl,
          });
        }

        Alert.alert(
          "Succès",
          "Votre équipe a été créée et est en attente de validation par le responsable du club.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error("Error saving team:", error);
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.button.club} />
      </View>
    );
  }

  const isOwner = team && user && team.ownerId === user.id;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          CommonStyles.header,
          {
            backgroundColor: colors.surface,
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
          {isEditMode ? team?.name || "Mon équipe" : "Créer une équipe"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Inactive team banner */}
      {isEditMode && team && !team.isActive && (
        <View
          style={[
            styles.inactiveBanner,
            {
              backgroundColor: colors.surfaceVariant,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Ionicons name="warning-outline" size={24} color="#F57C00" />
          <View style={styles.inactiveBannerText}>
            <Text style={styles.inactiveBannerTitle}>Équipe désactivée</Text>
            <Text style={styles.inactiveBannerSubtitle}>
              Cette équipe a été désactivée par le responsable du club
            </Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            Nom de l'équipe *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text.primary,
              },
            ]}
            placeholder="Ex: Les Lions U15"
            placeholderTextColor={colors.text.tertiary}
            value={teamName}
            onChangeText={setTeamName}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            Genre (optionnel)
          </Text>
          <View style={styles.optionGrid}>
            {GENDERS.map((gender) => (
              <TouchableOpacity
                key={gender.value}
                style={[
                  styles.optionButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  selectedGender === gender.value && [
                    styles.optionButtonSelected,
                    {
                      borderColor: colors.button.club,
                      backgroundColor: colors.button.club,
                    },
                  ],
                ]}
                onPress={() =>
                  setSelectedGender(
                    selectedGender === gender.value ? undefined : gender.value
                  )
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text.secondary },
                    selectedGender === gender.value &&
                      styles.optionTextSelected,
                  ]}
                >
                  {gender.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Players section */}
        <View style={styles.section}>
          <TeamPlayersManager
            teamId={teamId}
            canEdit={isEditMode ? !!isOwner : true}
            initialPlayers={players}
            onPlayersChange={(newPlayers) => setPlayers(newPlayers)}
            coachName={coachName}
            coachPhotoUrl={coachPhotoUrl}
            onCoachChange={(name, photoUrl) => {
              setCoachName(name);
              setCoachPhotoUrl(photoUrl);
            }}
          />
        </View>

        {!isEditMode && (
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.surfaceVariant,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#2196F3"
            />
            <Text style={styles.infoText}>
              Votre équipe sera créée et en attente de validation par le
              responsable du club.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.button.club },
            saving && [
              styles.saveButtonDisabled,
              { backgroundColor: colors.text.disabled },
            ],
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving
              ? isEditMode
                ? "Sauvegarde..."
                : "Création..."
              : isEditMode
              ? "Sauvegarder"
              : "Créer l'équipe"}
          </Text>
        </TouchableOpacity>

        {/* Delete button - only for team owner in edit mode */}
        {isEditMode && isOwner && (
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.error,
              },
            ]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>
              Supprimer l'équipe
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
  },
  optionButtonSelected: {},
  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#fff",
  },
  infoBox: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
  saveButton: {
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  saveButtonDisabled: {},
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inactiveBanner: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  inactiveBannerText: {
    flex: 1,
  },
  inactiveBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F57C00",
    marginBottom: 4,
  },
  inactiveBannerSubtitle: {
    fontSize: 13,
    color: "#E65100",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 30,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
