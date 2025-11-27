import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "../src/contexts/AuthContext";
import { useTheme } from "../src/contexts/ThemeContext";
import { CommonStyles, BRAND_COLORS, SLATE_COLORS } from "../src/theme";
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";
import type { TeamGender } from "../models/Team";

interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
  isStarter?: boolean;
}

type RootStackParamList = {
  TeamStarters: {
    clubId: string;
    teamId?: string;
    teamData: {
      name: string;
      category: string;
      gender: TeamGender;
    };
    coachData: {
      name: string;
      photoUrl: string;
    };
    roster: Player[];
  };
};

type TeamStartersRouteProp = RouteProp<RootStackParamList, "TeamStarters">;

export default function TeamStartersScreen() {
  const navigation = useNavigation();
  const route = useRoute<TeamStartersRouteProp>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { clubId, teamId, teamData, coachData, roster } = route.params;

  const [starters, setStarters] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : "#FFFFFF";

  const toggleStarter = (playerId: string) => {
    if (starters.includes(playerId)) {
      setStarters(starters.filter((id) => id !== playerId));
    } else {
      if (starters.length >= 5) {
        Alert.alert(
          "5 Majeur complet",
          "Le 5 majeur est complet ! Retirez un joueur avant d'en ajouter un autre."
        );
        return;
      }
      setStarters([...starters, playerId]);
    }
  };

  const handleFinish = async () => {
    if (starters.length !== 5) {
      Alert.alert(
        "Erreur",
        `Vous devez sélectionner exactement 5 titulaires (actuellement: ${starters.length}).`
      );
      return;
    }

    if (!user) {
      Alert.alert("Erreur", "Vous devez être connecté");
      return;
    }

    setSaving(true);

    try {
      const teamService = ServiceFactory.getTeamService(supabase);

      // Update roster with starter status
      const finalRoster = roster.map((p) => ({
        ...p,
        isStarter: starters.includes(p.id),
      }));

      if (teamId) {
        // UPDATE EXISTING TEAM
        const result = await teamService.updateTeam(
          teamId,
          {
            name: teamData.name,
            gender: teamData.gender,
            coachName: coachData.name,
            coachPhotoUrl: coachData.photoUrl || undefined,
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

        // Save players
        const playerService = ServiceFactory.getPlayerService(supabase);
        const existingPlayers = await playerService.getTeamPlayers(teamId);
        const existingIds = new Set(existingPlayers.map((p) => p.id));
        const currentIds = new Set(
          finalRoster.filter((p) => !p.id.startsWith("temp-")).map((p) => p.id)
        );

        // Update or create players
        for (const player of finalRoster) {
          if (player.id.startsWith("temp-")) {
            // New player - CREATE
            await playerService.createPlayer({
              teamId,
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: player.photoUrl,
              isStarter: player.isStarter,
            });
          } else {
            // Existing player - UPDATE
            await playerService.updatePlayer(player.id, {
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: player.photoUrl,
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

        Alert.alert("Succès", "L'équipe a été modifiée avec succès", [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("Club" as never);
            },
          },
        ]);
      } else {
        // CREATE NEW TEAM
        const result = await teamService.createTeam(
          {
            name: teamData.name,
            clubId: clubId,
            gender: teamData.gender,
            coachName: coachData.name,
            coachPhotoUrl: coachData.photoUrl || undefined,
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

        // Create players
        const playerService = ServiceFactory.getPlayerService(supabase);
        for (const player of finalRoster) {
          await playerService.createPlayer({
            teamId: newTeamId,
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            photoUrl: player.photoUrl,
            isStarter: player.isStarter,
          });
        }

        Alert.alert(
          "Succès",
          "Votre équipe a été créée et est en attente de validation par le responsable du club.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("Club" as never);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error saving team:", error);
      Alert.alert("Erreur", "Une erreur est survenue");
    } finally {
      setSaving(false);
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
          Le 5 Majeur
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressBar, { backgroundColor: BRAND_COLORS[500] }]}
        />
        <View
          style={[styles.progressBar, { backgroundColor: BRAND_COLORS[500] }]}
        />
        <View
          style={[styles.progressBar, { backgroundColor: BRAND_COLORS[500] }]}
        />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.stepTitle, { color: colors.text.secondary }]}>
          ÉTAPE 3/3
        </Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Sélectionnez le 5 Majeur
        </Text>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: `${BRAND_COLORS[500]}15`,
              borderColor: `${BRAND_COLORS[500]}30`,
            },
          ]}
        >
          <View style={styles.infoLeft}>
            <Ionicons name="shirt" size={18} color={BRAND_COLORS[700]} />
            <Text style={[styles.infoText, { color: BRAND_COLORS[700] }]}>
              Sélectionnez 5 titulaires
            </Text>
          </View>
          <View
            style={[
              styles.starterBadge,
              {
                backgroundColor:
                  starters.length === 5 ? "#10b981" : SLATE_COLORS[200],
              },
            ]}
          >
            <Text
              style={[
                styles.starterBadgeText,
                {
                  color: starters.length === 5 ? "#fff" : SLATE_COLORS[600],
                },
              ]}
            >
              {starters.length} / 5
            </Text>
          </View>
        </View>

        {/* Error if not 5 starters */}
        {starters.length !== 5 && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.errorText}>
              Le 5 majeur doit être complet pour valider.
            </Text>
          </View>
        )}

        {/* Player Grid */}
        <View style={styles.playerGrid}>
          {roster.map((player) => {
            const isStarter = starters.includes(player.id);
            return (
              <TouchableOpacity
                key={player.id}
                onPress={() => toggleStarter(player.id)}
                style={[
                  styles.playerCard,
                  {
                    backgroundColor: isStarter
                      ? colors.surface
                      : `${colors.surface}80`,
                    borderColor: isStarter ? BRAND_COLORS[500] : "transparent",
                    borderWidth: 2,
                    opacity: isStarter ? 1 : 0.6,
                  },
                ]}
              >
                {isStarter && (
                  <View style={styles.starBadge}>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                  </View>
                )}

                <View
                  style={[
                    styles.playerPhoto,
                    {
                      borderColor: isStarter
                        ? BRAND_COLORS[500]
                        : SLATE_COLORS[300],
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
                        styles.playerNumberBig,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {player.jerseyNumber}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.playerName,
                    {
                      color: isStarter
                        ? colors.text.primary
                        : colors.text.secondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {player.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: surfaceColor,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.finishButton,
            {
              backgroundColor:
                starters.length === 5 && !saving
                  ? BRAND_COLORS[600]
                  : colors.text.disabled,
            },
          ]}
          onPress={handleFinish}
          disabled={starters.length !== 5 || saving}
        >
          {saving ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.finishButtonText}>
                {teamId ? "Sauvegarde..." : "Création..."}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.finishButtonText}>Valider l'équipe</Text>
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  starterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  starterBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#dc2626",
  },
  playerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  playerCard: {
    width: "31%",
    aspectRatio: 0.8,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  starBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  playerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  playerNumberBig: {
    fontSize: 18,
    fontWeight: "bold",
  },
  playerName: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  finishButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
