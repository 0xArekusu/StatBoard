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
import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { CommonStyles } from "../../src/theme";
import { useResponsive } from "../../src/hooks/useResponsive";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import type { TeamGender } from "../../models/Team";
import { RootStackParamList, RootNavigationProp } from "../../types/navigation";
import { ROUTES } from "../../constants/routes";
import PlayerAvatar from "../../components/PlayerAvatar";
import { showErrorAlert } from "../../utils/errorAlert";

/**
 * Local player interface for this screen
 */
interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
}

type TeamStartersRouteProp = RouteProp<RootStackParamList, "TeamStarters">;

/**
 * TeamStartersScreen - Starting lineup selection screen
 * Final step in team creation/editing flow
 * Allows selection of exactly 5 starters from the roster
 * Note: Starters are tracked locally in this screen only for UI purposes
 */
export default function TeamStartersScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<TeamStartersRouteProp>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();
  const { clubId, teamId, teamData, coachData, roster } = route.params;

  // Local state for tracking selected starters (player IDs)
  const [starters, setStarters] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Theme colors
  const bgColor = colors.background;
  const surfaceColor = colors.surface;

  /**
   * Toggle a player's starter status
   * Max 5 starters allowed
   * @param playerId - The player ID to toggle
   */
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

  /**
   * Save the complete team to the database
   * For new teams: Creates team and all players
   * For existing teams: Updates team and manages players (create/update/delete)
   * Requires exactly 5 starters to be selected
   */
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

      if (teamId) {
        // UPDATE EXISTING TEAM
        // Update team metadata
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

        // Save players - intelligent update
        const playerService = ServiceFactory.getPlayerService(supabase);
        const existingPlayers = await playerService.getTeamPlayers(teamId);
        const currentIds = new Set(
          roster.filter((p) => !p.id.startsWith("temp-")).map((p) => p.id)
        );

        // 1. Create new players or update existing ones
        for (const player of roster) {
          if (player.id.startsWith("temp-")) {
            // New player - CREATE
            await playerService.createPlayer({
              teamId,
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: player.photoUrl,
            });
          } else {
            // Existing player - UPDATE
            await playerService.updatePlayer(player.id, {
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              photoUrl: player.photoUrl,
            });
          }
        }

        // 2. Delete players that were removed from the roster
        for (const existingPlayer of existingPlayers) {
          if (!currentIds.has(existingPlayer.id)) {
            await playerService.deletePlayer(existingPlayer.id, teamId);
          }
        }

        Alert.alert("Succès", "L'équipe a été modifiée avec succès", [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate(ROUTES.CLUB);
            },
          },
        ]);
      } else {
        // CREATE NEW TEAM
        // First, create the team
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
          showErrorAlert({
            action: "créer l'équipe",
            error: new Error(result.error || "Impossible de créer l'équipe"),
            context: "TeamStartersScreen",
          });
          setSaving(false);
          return;
        }

        const newTeamId = result.team?.id;
        if (!newTeamId) {
          showErrorAlert({
            action: "créer l'équipe",
            error: new Error("Impossible de récupérer l'ID de l'équipe"),
            context: "TeamStartersScreen",
          });
          setSaving(false);
          return;
        }

        // Then, create all players for the new team
        const playerService = ServiceFactory.getPlayerService(supabase);
        for (const player of roster) {
          await playerService.createPlayer({
            teamId: newTeamId,
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            photoUrl: player.photoUrl,
          });
        }

        Alert.alert(
          "Succès",
          "Votre équipe a été créée et est en attente de validation par le responsable du club.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate(ROUTES.CLUB);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error saving team:", error);
      showErrorAlert({
        action: "sauvegarder l'équipe",
        error,
        context: "TeamStartersScreen",
      });
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
      <View style={[styles.progressContainer, { gap: sp.sm, paddingHorizontal: sp.lg, paddingVertical: sp.md }]}>
        <View
          style={[styles.progressBar, { backgroundColor: colors.primary }]}
        />
        <View
          style={[styles.progressBar, { backgroundColor: colors.primary }]}
        />
        <View
          style={[styles.progressBar, { backgroundColor: colors.primary }]}
        />
      </View>

      <ScrollView style={[styles.content, { padding: sp.lg }]}>
        <Text style={[styles.title, { color: colors.text.primary, fontSize: font.xxl, marginBottom: sp.lg }]}>
          Sélectionnez le 5 Majeur
        </Text>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: `${colors.primary}15`,
              borderColor: `${colors.primary}30`,
              padding: sp.md,
              marginBottom: sp.md,
            },
          ]}
        >
          <View style={[styles.infoLeft, { gap: sp.sm }]}>
            <Ionicons name="shirt" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary, fontSize: font.md }]}>
              Sélectionnez 5 titulaires
            </Text>
          </View>
          <View
            style={[
              styles.starterBadge,
              {
                backgroundColor:
                  starters.length === 5 ? colors.primary : colors.surface,
                paddingHorizontal: sp.sm,
                paddingVertical: sp.xs,
              },
            ]}
          >
            <Text
              style={[
                styles.starterBadgeText,
                {
                  color: starters.length === 5 ? "#fff" : colors.text.secondary,
                  fontSize: font.sm,
                },
              ]}
            >
              {starters.length} / 5
            </Text>
          </View>
        </View>

        {/* Error if not 5 starters */}
        {starters.length !== 5 && (
          <View style={[styles.errorBox, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary, gap: sp.sm, padding: sp.sm, marginBottom: sp.md }]}>
            <Ionicons name="alert-circle" size={16} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.primary, fontSize: font.sm }]}>
              Le 5 majeur doit être complet pour valider.
            </Text>
          </View>
        )}

        {/* Player Grid */}
        <View style={[styles.playerGrid, { gap: sp.sm }]}>
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
                    borderColor: isStarter ? colors.primary : "transparent",
                    borderWidth: 2,
                    opacity: isStarter ? 1 : 0.6,
                    padding: sp.sm,
                  },
                ]}
              >
                {isStarter && (
                  <View style={[styles.starBadge, { top: sp.sm, right: sp.sm }]}>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                  </View>
                )}

                <PlayerAvatar
                  playerName={player.name}
                  playerNumber={player.jerseyNumber}
                  photoUrl={player.photoUrl}
                  size={sizes.avatarMd}
                  borderColor={isStarter ? colors.primary : colors.border}
                  backgroundColor={colors.surface}
                  textColor={colors.text.secondary}
                  borderWidth={2}
                />

                <View style={[styles.playerNameContainer, { gap: sp.xs }]}>
                  <Text
                    style={[
                      styles.playerNumberText,
                      {
                        color: isStarter
                          ? colors.text.secondary
                          : colors.text.tertiary,
                        fontSize: font.xs,
                      },
                    ]}
                  >
                    #{player.jerseyNumber}
                  </Text>
                  <Text
                    style={[
                      styles.playerName,
                      {
                        color: isStarter
                          ? colors.text.primary
                          : colors.text.secondary,
                        fontSize: font.sm,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                </View>
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
            padding: sp.lg,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.finishButton,
            {
              backgroundColor:
                starters.length === 5 && !saving
                  ? colors.primary
                  : colors.text.disabled,
              padding: isCompact ? sp.md : sp.lg,
            },
          ]}
          onPress={handleFinish}
          disabled={starters.length !== 5 || saving}
        >
          {saving ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.finishButtonText, { fontSize: font.lg }]}>
                {teamId ? "Sauvegarde..." : "Création..."}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.finishButtonText, { fontSize: font.lg }]}>Valider l'équipe</Text>
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
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "bold",
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
  playerNameContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  playerNumberText: {
    fontSize: 10,
    fontWeight: "600",
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
