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
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { useAuth } from "../src/contexts/AuthContext";
import type { TeamGender, Team } from "../models/Team";
import TeamPlayersManager from "../components/TeamPlayersManager";

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
  const teamId = route.params?.teamId;
  const clubId = route.params?.clubId;
  const isEditMode = !!teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [teamName, setTeamName] = useState("");
  const [selectedGender, setSelectedGender] = useState<TeamGender | undefined>(undefined);
  const [coachName, setCoachName] = useState("Coach");
  const [coachPhotoUrl, setCoachPhotoUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<any[]>([
    { id: "temp-1", name: "Player 1", jerseyNumber: 1, position: 1, isStarter: true },
    { id: "temp-2", name: "Player 2", jerseyNumber: 2, position: 2, isStarter: true },
    { id: "temp-3", name: "Player 3", jerseyNumber: 3, position: 3, isStarter: true },
    { id: "temp-4", name: "Player 4", jerseyNumber: 4, position: 4, isStarter: true },
    { id: "temp-5", name: "Player 5", jerseyNumber: 5, position: 5, isStarter: true },
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
                Alert.alert("Erreur", result.error || "Impossible de supprimer l'équipe");
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
    const startersCount = players.filter(p => p.isStarter).length;
    if (startersCount !== 5) {
      Alert.alert("Erreur", "Votre équipe doit avoir exactement 5 joueurs titulaires");
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
          Alert.alert("Erreur", result.error || "Impossible de modifier l'équipe");
          setSaving(false);
          return;
        }

        // Save players in edit mode
        const playerService = ServiceFactory.getPlayerService(supabase);

        // Get existing players from DB
        const existingPlayers = await playerService.getTeamPlayers(teamId);
        const existingIds = new Set(existingPlayers.map(p => p.id));
        const currentIds = new Set(players.filter(p => !p.id.startsWith('temp-')).map(p => p.id));

        // Update or create players
        for (const player of players) {
          if (player.id.startsWith('temp-')) {
            // New player - CREATE
            await playerService.createPlayer({
              teamId,
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: player.photoUrl,
              position: player.position,
              isStarter: player.isStarter,
            });
          } else {
            // Existing player - UPDATE
            await playerService.updatePlayer(player.id, {
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: player.photoUrl,
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
          await playerService.createPlayer({
            teamId: newTeamId,
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            position: player.position,
            isStarter: player.isStarter,
            photoUrl: player.photoUrl,
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
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  const isOwner = team && user && team.ownerId === user.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? team?.name || "Mon équipe" : "Créer une équipe"}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Inactive team banner */}
      {isEditMode && team && !team.isActive && (
        <View style={styles.inactiveBanner}>
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
          <Text style={styles.label}>Nom de l'équipe *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Les Lions U15"
            value={teamName}
            onChangeText={setTeamName}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Genre (optionnel)</Text>
          <View style={styles.optionGrid}>
            {GENDERS.map((gender) => (
              <TouchableOpacity
                key={gender.value}
                style={[
                  styles.optionButton,
                  selectedGender === gender.value && styles.optionButtonSelected,
                ]}
                onPress={() =>
                  setSelectedGender(selectedGender === gender.value ? undefined : gender.value)
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedGender === gender.value && styles.optionTextSelected,
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
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
            <Text style={styles.infoText}>
              Votre équipe sera créée et en attente de validation par le responsable du club.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? (isEditMode ? "Sauvegarde..." : "Création...") : (isEditMode ? "Sauvegarder" : "Créer l'équipe")}
          </Text>
        </TouchableOpacity>

        {/* Delete button - only for team owner in edit mode */}
        {isEditMode && isOwner && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
            <Text style={styles.deleteButtonText}>Supprimer l'équipe</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
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
    color: "#333",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
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
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  optionButtonSelected: {
    borderColor: "#9C27B0",
    backgroundColor: "#9C27B0",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  optionTextSelected: {
    color: "#fff",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
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
    backgroundColor: "#9C27B0",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
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
    backgroundColor: "#FFF3E0",
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0B2",
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
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#F44336",
    marginBottom: 30,
    gap: 8,
  },
  deleteButtonText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "bold",
  },
});
