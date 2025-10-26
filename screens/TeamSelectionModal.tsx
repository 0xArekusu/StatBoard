import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { useAuth } from "../src/contexts/AuthContext";
import type { Team } from "../models/Team";
import type { Player } from "../models/Player";

interface TeamSelectionModalProps {
  visible: boolean;
  onTeamSelected: (team: Team | null, players?: Player[]) => void;
  onSkip: () => void;
}

export default function TeamSelectionModal({
  visible,
  onTeamSelected,
  onSkip,
}: TeamSelectionModalProps) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      if (!user) {
        // If not logged in, skip directly
        onSkip();
        return;
      }
      loadUserTeams();
    }
  }, [visible, user]);

  const loadUserTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const teamService = ServiceFactory.getTeamService(supabase);
      const userTeams = await teamService.getUserTeams(user.id);

      // Filter only approved and active teams
      const activeTeams = userTeams.filter(t => t.status === 'approved' && t.isActive);
      setTeams(activeTeams);

      // Auto-select if only one team
      if (activeTeams.length === 1) {
        await loadTeamPlayers(activeTeams[0]);
      }
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamPlayers = async (team: Team) => {
    try {
      const playerService = ServiceFactory.getPlayerService(supabase);
      const players = await playerService.getTeamPlayers(team.id);
      onTeamSelected(team, players);
    } catch (error) {
      console.error("Error loading team players:", error);
      onTeamSelected(team, []);
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
            {item.gender === "male" ? "Masculin" : item.gender === "female" ? "Féminin" : "Mixte"}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#9C27B0" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Sélectionner une équipe</Text>
            <TouchableOpacity onPress={onSkip}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
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
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipButtonText}>Continuer sans équipe</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={teams}
                renderItem={renderTeam}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
              />
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipButtonText}>Continuer sans équipe</Text>
              </TouchableOpacity>
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
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
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
  list: {
    padding: 20,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  teamGender: {
    fontSize: 14,
    color: "#666",
  },
  skipButton: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
});
