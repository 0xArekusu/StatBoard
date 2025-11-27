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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { CommonStyles, BRAND_COLORS, SLATE_COLORS } from "../src/theme";
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";
import { ROUTES } from "../constants/routes";
import type { TeamGender } from "../models/Team";

interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
  isStarter?: boolean;
}

type RootStackParamList = {
  TeamRoster: {
    clubId: string;
    teamId?: string;
    teamData: {
      name: string;
      category: string;
      gender: TeamGender;
    };
  };
};

type TeamRosterRouteProp = RouteProp<RootStackParamList, "TeamRoster">;

export default function TeamRosterScreen() {
  const navigation = useNavigation();
  const route = useRoute<TeamRosterRouteProp>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { clubId, teamId, teamData } = route.params;

  const [coachName, setCoachName] = useState(user?.name || "");
  const [coachPhotoUrl, setCoachPhotoUrl] = useState("");
  const [isEditingCoach, setIsEditingCoach] = useState(false);

  const [roster, setRoster] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPhoto, setNewPlayerPhoto] = useState("");
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : "#FFFFFF";

  // Load existing team data if editing
  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      const teamService = ServiceFactory.getTeamService(supabase);
      const team = await teamService.getTeamById(teamId!);

      if (team) {
        setCoachName(team.coachName || user?.name || "");
        setCoachPhotoUrl(team.coachPhotoUrl || "");

        const playerService = ServiceFactory.getPlayerService(supabase);
        const players = await playerService.getTeamPlayers(teamId!);
        setRoster(players);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
    }
  };

  const handleAddPlayer = () => {
    setAddPlayerError(null);
    const trimmedName = newPlayerName.trim();
    const trimmedNumber = newPlayerNumber.trim();

    if (!trimmedName || !trimmedNumber) return;

    // Validation: Check duplicate name
    const isDuplicate = roster.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddPlayerError("Un joueur avec ce nom existe déjà.");
      return;
    }

    // Validation: Check negative number
    const numValue = parseInt(trimmedNumber, 10);
    if (numValue < 0) {
      setAddPlayerError("Le numéro ne peut pas être négatif.");
      return;
    }

    const newPlayer: Player = {
      id: `temp-${Date.now()}`,
      name: trimmedName,
      jerseyNumber: numValue,
      photoUrl: newPlayerPhoto || undefined,
    };

    setRoster([...roster, newPlayer]);
    setNewPlayerName("");
    setNewPlayerNumber("");
    setNewPlayerPhoto("");
  };

  const handleRemovePlayer = (id: string) => {
    setRoster(roster.filter((p) => p.id !== id));
  };

  const handleNext = () => {
    if (!coachName.trim()) {
      Alert.alert("Erreur", "Le nom du coach est obligatoire");
      setIsEditingCoach(true);
      return;
    }

    if (roster.length < 5) {
      Alert.alert(
        "Erreur",
        `L'équipe doit comporter au moins 5 joueurs (Actuellement : ${roster.length})`
      );
      return;
    }

    navigation.navigate(ROUTES.TEAM_STARTERS, {
      clubId,
      teamId,
      teamData,
      coachData: {
        name: coachName.trim(),
        photoUrl: coachPhotoUrl,
      },
      roster,
    });
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
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: BRAND_COLORS[500] }]} />
        <View style={[styles.progressBar, { backgroundColor: BRAND_COLORS[500] }]} />
        <View style={[styles.progressBar, { backgroundColor: colors.border }]} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.stepTitle, { color: colors.text.secondary }]}>
          ÉTAPE 2/3
        </Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Staff & Effectif
        </Text>

        {/* Coach Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
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
                  <View
                    style={[
                      styles.coachPhoto,
                      { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100] },
                    ]}
                  >
                    {coachPhotoUrl ? (
                      <Image
                        source={{ uri: coachPhotoUrl }}
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

                  <View style={styles.coachEditInputs}>
                    <TextInput
                      style={[
                        styles.coachInput,
                        {
                          backgroundColor: isDark
                            ? SLATE_COLORS[800]
                            : SLATE_COLORS[50],
                          borderColor: colors.border,
                          color: colors.text.primary,
                        },
                      ]}
                      placeholder="Nom du coach"
                      placeholderTextColor={colors.text.tertiary}
                      value={coachName}
                      onChangeText={setCoachName}
                    />
                    <TextInput
                      style={[
                        styles.coachInputSmall,
                        {
                          backgroundColor: isDark
                            ? SLATE_COLORS[800]
                            : SLATE_COLORS[50],
                          borderColor: colors.border,
                          color: colors.text.secondary,
                        },
                      ]}
                      placeholder="URL Photo (Optionnel)"
                      placeholderTextColor={colors.text.tertiary}
                      value={coachPhotoUrl}
                      onChangeText={setCoachPhotoUrl}
                    />
                    <TouchableOpacity
                      style={[
                        styles.saveCoachButton,
                        {
                          backgroundColor: isDark
                            ? SLATE_COLORS[700]
                            : SLATE_COLORS[900],
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
                    style={[
                      styles.coachPhoto,
                      { borderColor: `${BRAND_COLORS[500]}30` },
                    ]}
                  >
                    {coachPhotoUrl ? (
                      <Image
                        source={{ uri: coachPhotoUrl }}
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
                      {!coachName && (
                        <Text style={styles.required}> *</Text>
                      )}
                    </View>
                    <View style={styles.coachRole}>
                      <Ionicons
                        name="briefcase"
                        size={12}
                        color={BRAND_COLORS[600]}
                      />
                      <Text
                        style={[
                          styles.coachRoleText,
                          { color: BRAND_COLORS[600] },
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
                      backgroundColor: isDark
                        ? SLATE_COLORS[800]
                        : SLATE_COLORS[50],
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
            JOUEURS ({roster.length})
          </Text>

          {/* Warning if less than 5 players */}
          {roster.length < 5 && (
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: "#fef3c7",
                  borderColor: "#fbbf24",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color="#d97706" />
              <Text style={styles.warningText}>
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
              },
            ]}
          >
            <View style={styles.addPlayerHeader}>
              <Ionicons name="add-circle" size={16} color={BRAND_COLORS[500]} />
              <Text
                style={[styles.addPlayerTitle, { color: colors.text.primary }]}
              >
                Ajouter un joueur
              </Text>
            </View>

            <View style={styles.addPlayerForm}>
              <View
                style={[
                  styles.playerPhotoPreview,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[100],
                    borderColor: colors.border,
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
              </View>

              <View style={styles.addPlayerInputs}>
                <TextInput
                  style={[
                    styles.playerInput,
                    {
                      backgroundColor: isDark
                        ? SLATE_COLORS[800]
                        : SLATE_COLORS[50],
                      borderColor: colors.border,
                      color: colors.text.primary,
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
                <View style={styles.numberRow}>
                  <TextInput
                    style={[
                      styles.numberInput,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[50],
                        borderColor: colors.border,
                        color: colors.text.primary,
                      },
                    ]}
                    placeholder="#"
                    placeholderTextColor={colors.text.tertiary}
                    value={newPlayerNumber}
                    onChangeText={(text) => {
                      setNewPlayerNumber(text);
                      setAddPlayerError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      {
                        backgroundColor:
                          newPlayerName && newPlayerNumber
                            ? BRAND_COLORS[600]
                            : colors.text.disabled,
                      },
                    ]}
                    onPress={handleAddPlayer}
                    disabled={!newPlayerName || !newPlayerNumber}
                  >
                    <Text style={styles.addButtonText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
                {addPlayerError && (
                  <Text style={styles.errorText}>{addPlayerError}</Text>
                )}
              </View>
            </View>

            {/* Photo URL input (optional) */}
            <TextInput
              style={[
                styles.photoUrlInput,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : SLATE_COLORS[50],
                  borderColor: colors.border,
                  color: colors.text.secondary,
                },
              ]}
              placeholder="URL Photo (optionnel)"
              placeholderTextColor={colors.text.tertiary}
              value={newPlayerPhoto}
              onChangeText={setNewPlayerPhoto}
            />
          </View>

          {/* Player List */}
          {roster.length === 0 ? (
            <View
              style={[
                styles.emptyRoster,
                {
                  backgroundColor: isDark
                    ? `${SLATE_COLORS[900]}80`
                    : SLATE_COLORS[50],
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="people"
                size={24}
                color={colors.text.tertiary}
                style={{ opacity: 0.5 }}
              />
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                Effectif vide
              </Text>
            </View>
          ) : (
            <View style={styles.playerList}>
              {roster.map((player) => (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.playerInfo}>
                    <View
                      style={[
                        styles.playerNumber,
                        {
                          backgroundColor: isDark
                            ? SLATE_COLORS[800]
                            : SLATE_COLORS[200],
                        },
                      ]}
                    >
                      {player.photoUrl ? (
                        <Image
                          source={{ uri: player.photoUrl }}
                          style={styles.photoImage}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.playerNumberText,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {player.jerseyNumber}
                        </Text>
                      )}
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.playerName,
                          { color: colors.text.primary },
                        ]}
                      >
                        {player.name}
                      </Text>
                      <Text
                        style={[
                          styles.playerMeta,
                          { color: colors.text.secondary },
                        ]}
                      >
                        Numéro {player.jerseyNumber}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemovePlayer(player.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor:
                coachName.trim() && roster.length >= 5
                  ? BRAND_COLORS[600]
                  : colors.text.disabled,
            },
          ]}
          onPress={handleNext}
          disabled={!coachName.trim() || roster.length < 5}
        >
          <Text style={styles.nextButtonText}>Suivant</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
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
  coachInputSmall: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
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
    color: "#d97706",
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
  photoUrlInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
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
  deleteButton: {
    padding: 8,
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
