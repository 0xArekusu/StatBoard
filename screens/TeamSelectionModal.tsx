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
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { useAuth } from "../src/contexts/AuthContext";
import type { Team } from "../models/Team";
import type { Player } from "../models/Player";

interface TeamSelectionModalProps {
  visible: boolean;
  clubId?: string | null;
  onTeamSelected: (team: Team | null, players?: Player[], wasAutoSelected?: boolean) => void;
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      if (!user) {
        // If not logged in, skip directly (auto-selected, so back goes to menu)
        onTeamSelected(null, [], true);
        return;
      }
      loadUserTeams();
    }
  }, [visible, user]);

  // Handle hardware back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack(); // Return to menu
        return true; // Prevent default behavior
      }
    );

    return () => backHandler.remove();
  }, [visible, onBack]);

  const loadUserTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const teamService = ServiceFactory.getTeamService(supabase);
      const userTeams = await teamService.getUserTeams(user.id);

      // Filter only approved and active teams
      let activeTeams = userTeams.filter(
        (t) => t.status === "approved" && t.isActive
      );

      // Filter by club if clubId is provided
      if (clubId) {
        activeTeams = activeTeams.filter((t) => t.clubId === clubId);
      }

      setTeams(activeTeams);

      // Auto-select if only one team
      if (activeTeams.length === 1) {
        await loadTeamPlayers(activeTeams[0], true); // true = wasAutoSelected
      }
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamPlayers = async (team: Team, wasAutoSelected: boolean = false) => {
    try {
      const playerService = ServiceFactory.getPlayerService(supabase);
      const players = await playerService.getTeamPlayers(team.id);
      onTeamSelected(team, players, wasAutoSelected);
    } catch (error) {
      console.error("Error loading team players:", error);
      onTeamSelected(team, [], wasAutoSelected);
    }
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => loadTeamPlayers(item)}
    >
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{item.name}</Text>
        {item.gender && (
          <Text style={styles.teamGender}>
            {item.gender === "male"
              ? "Masculin"
              : item.gender === "female"
              ? "Féminin"
              : "Mixte"}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Sélectionner une équipe</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9C27B0" />
              <Text style={styles.loadingText}>Chargement des équipes...</Text>
            </View>
          ) : teams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="basketball-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>Aucune équipe disponible</Text>
              <Text style={styles.emptyText}>
                Créez une équipe dans votre club pour l'utiliser ici
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButtonSmall} onPress={onBack}>
                  <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                  <Text style={styles.skipButtonText} numberOfLines={1}>
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
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                  <Text style={styles.skipButtonText}>Continuer sans équipe</Text>
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
