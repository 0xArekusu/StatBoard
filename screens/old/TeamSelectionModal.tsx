/**
 * TeamSelectionModal
 *
 * Pre-game modal that allows users to select which team they want to manage.
 * Features:
 * - Load teams from Supabase based on user and club
 * - Auto-select if only one team available
 * - Skip option to create teams on the fly without database
 * - Load team players when team is selected
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/config/supabase";
import { ServiceFactory } from "../../services/ServiceFactory";
import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../../src/theme";
import type { Team } from "../../models/Team";
import type { Player } from "../../models/Player";
import { logInfo, logError, logWarn } from "../../utils/logger";

interface TeamSelectionModalProps {
  visible: boolean;
  clubId?: string | null;
  onTeamSelected: (
    team: Team | null,
    players?: Player[],
    wasAutoSelected?: boolean
  ) => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function TeamSelectionModal({
  visible,
  clubId,
  onTeamSelected,
  onSkip,
  onBack,
}: TeamSelectionModalProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load teams when modal becomes visible
   * Auto-selects if user is not logged in (anonymous mode)
   */
  useEffect(() => {
    if (visible) {
      logInfo("TeamSelectionModal", "👁️ Modal opened", {
        hasUser: !!user,
        userId: user?.id,
        clubId,
      });

      if (!user) {
        // If not logged in, skip directly (auto-selected, so back goes to menu)
        logInfo(
          "TeamSelectionModal",
          "🚫 No user logged in, skipping team selection (anonymous mode)"
        );
        onTeamSelected(null, [], true);
        return;
      }
      loadUserTeams();
    }
  }, [visible, user]);

  // Handle hardware back button
  useEffect(() => {
    if (!visible) return;

    let backHandlerSubscription: any = null;

    // Add a small delay to ensure the modal is fully mounted
    const timeoutId = setTimeout(() => {
      backHandlerSubscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          logInfo(
            "TeamSelectionModal",
            "🔙 User pressed hardware back button, returning to menu"
          );
          onBack(); // Return to menu
          return true; // Prevent default behavior
        }
      );
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (backHandlerSubscription) {
        backHandlerSubscription.remove();
      }
    };
  }, [visible, onBack]);

  /**
   * Load user's teams from Supabase
   * Filters by approved/active status and optionally by club
   * Auto-selects team if only one is available
   */
  const loadUserTeams = async () => {
    if (!user) return;

    logInfo("TeamSelectionModal", "📡 Loading user teams from Supabase", {
      userId: user.id,
      clubId,
    });

    try {
      setLoading(true);
      const teamService = ServiceFactory.getTeamService(supabase);
      const userTeams = await teamService.getUserTeams(user.id);

      logInfo("TeamSelectionModal", "✅ User teams fetched from Supabase", {
        totalTeams: userTeams.length,
        teamIds: userTeams.map((t) => t.id),
        teamNames: userTeams.map((t) => t.name),
      });

      // Filter only approved and active teams
      let activeTeams = userTeams.filter(
        (t) => t.status === "approved" && t.isActive
      );

      logInfo(
        "TeamSelectionModal",
        "🔍 Filtered to approved and active teams",
        {
          activeTeamsCount: activeTeams.length,
        }
      );

      // Filter by club if clubId is provided
      if (clubId) {
        activeTeams = activeTeams.filter((t) => t.clubId === clubId);
        logInfo("TeamSelectionModal", "🔍 Filtered by club", {
          clubId,
          teamsInClub: activeTeams.length,
        });
      }

      setTeams(activeTeams);

      // Auto-select if only one team
      if (activeTeams.length === 1) {
        logInfo(
          "TeamSelectionModal",
          "🎯 Only one team available, auto-selecting",
          {
            teamId: activeTeams[0].id,
            teamName: activeTeams[0].name,
          }
        );
        await loadTeamPlayers(activeTeams[0], true); // true = wasAutoSelected
      } else if (activeTeams.length === 0) {
        logWarn("TeamSelectionModal", "⚠️ No active teams found for user", {
          userId: user.id,
          clubId,
        });
      } else {
        logInfo(
          "TeamSelectionModal",
          "📋 Multiple teams available for selection",
          {
            teamsCount: activeTeams.length,
          }
        );
      }
    } catch (error) {
      logError("TeamSelectionModal", "❌ Error loading teams from Supabase", {
        userId: user.id,
        clubId,
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load players for selected team from Supabase
   * Then calls onTeamSelected callback to proceed to next step
   */
  const loadTeamPlayers = async (
    team: Team,
    wasAutoSelected: boolean = false
  ) => {
    logInfo(
      "TeamSelectionModal",
      "👥 User selected team, loading players from Supabase",
      {
        teamId: team.id,
        teamName: team.name,
        wasAutoSelected,
      }
    );

    try {
      const playerService = ServiceFactory.getPlayerService(supabase);
      const players = await playerService.getTeamPlayers(team.id);

      logInfo("TeamSelectionModal", "✅ Team players loaded from Supabase", {
        teamId: team.id,
        teamName: team.name,
        playersCount: players.length,
        playerNames: players.map((p) => p.name),
      });

      onTeamSelected(team, players, wasAutoSelected);
    } catch (error) {
      logError(
        "TeamSelectionModal",
        "❌ Error loading team players from Supabase",
        {
          teamId: team.id,
          teamName: team.name,
          error: error instanceof Error ? error.message : error,
        }
      );
      // Proceed with empty players array on error
      onTeamSelected(team, [], wasAutoSelected);
    }
  };

  /**
   * Handle skip button click
   * User chooses to continue without selecting a pre-configured team
   */
  const handleSkip = () => {
    logInfo(
      "TeamSelectionModal",
      "⏭️ User clicked skip, continuing without team (manual setup)"
    );
    onSkip();
  };

  /**
   * Handle back button click
   * User returns to main menu
   */
  const handleBack = () => {
    logInfo(
      "TeamSelectionModal",
      "◀️ User clicked back button, returning to menu"
    );
    onBack();
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={[
        styles.teamCard,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
      ]}
      onPress={() => loadTeamPlayers(item)}
    >
      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, { color: colors.text.primary }]}>
          {item.name}
        </Text>
        {item.gender && (
          <Text style={[styles.teamGender, { color: colors.text.secondary }]}>
            {item.gender === "male"
              ? "Masculin"
              : item.gender === "female"
              ? "Féminin"
              : "Mixte"}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color={STATUS_COLORS.info} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        logInfo(
          "TeamSelectionModal",
          "🔙 Modal onRequestClose triggered (hardware back or gesture)"
        );
        onBack();
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Sélectionner une équipe
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={STATUS_COLORS.info} />
              <Text
                style={[styles.loadingText, { color: colors.text.secondary }]}
              >
                Chargement des équipes...
              </Text>
            </View>
          ) : teams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="basketball-outline"
                size={80}
                color={colors.text.disabled}
              />
              <Text
                style={[styles.emptyTitle, { color: colors.text.secondary }]}
              >
                Aucune équipe disponible
              </Text>
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                Créez une équipe dans votre club pour l'utiliser ici
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.backButtonSmall,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleBack}
                >
                  <Text
                    style={[
                      styles.backButtonText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Retour
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.skipButton,
                    { backgroundColor: STATUS_COLORS.info },
                  ]}
                  onPress={handleSkip}
                >
                  <Text
                    style={[
                      styles.skipButtonText,
                      { color: COMMON_COLORS.white },
                    ]}
                    numberOfLines={1}
                  >
                    Continuer sans équipe
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.flatListContainer}>
                <FlatList
                  data={teams}
                  renderItem={renderTeam}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={true}
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.backButton,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleBack}
                >
                  <Text
                    style={[
                      styles.backButtonText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Retour
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.skipButton,
                    { backgroundColor: STATUS_COLORS.info },
                  ]}
                  onPress={handleSkip}
                >
                  <Text
                    style={[
                      styles.skipButtonText,
                      { color: COMMON_COLORS.white },
                    ]}
                  >
                    Continuer sans équipe
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "80%",
    maxWidth: "90%",
    width: 400,
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 10,
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  backButtonSmall: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    minWidth: 80,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  flatListContainer: {
    height: 300,
  },
  list: {
    padding: 20,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  teamGender: {
    fontSize: 13,
    color: "#666",
  },
  skipButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: "#2196F3",
    borderRadius: 10,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
