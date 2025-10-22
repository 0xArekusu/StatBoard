import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { useAuth } from "../src/contexts/AuthContext";
import type { Team } from "../models/Team";

interface ClubTeamsTabProps {
  clubId: string;
  isOwner: boolean;
  onCreateTeam: () => void;
  onEditTeam: (teamId: string) => void;
}

export default function ClubTeamsTab({ clubId, isOwner, onCreateTeam, onEditTeam }: ClubTeamsTabProps) {
  const { user } = useAuth();
  const [pendingTeams, setPendingTeams] = useState<Team[]>([]);
  const [approvedTeams, setApprovedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const teamService = ServiceFactory.getTeamService(supabase);

      const [pending, approved] = await Promise.all([
        teamService.getClubTeamsByStatus(clubId, "pending"),
        teamService.getClubTeamsByStatus(clubId, "approved"),
      ]);

      setPendingTeams(pending);
      setApprovedTeams(approved);
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams])
  );

  const handleApprove = async (teamId: string) => {
    Alert.alert(
      "Approuver l'équipe",
      "Voulez-vous approuver cette équipe ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Approuver",
          onPress: async () => {
            const teamService = ServiceFactory.getTeamService(supabase);
            const result = await teamService.updateTeamStatus(teamId, "approved", "");

            if (result.success) {
              Alert.alert("Succès", "L'équipe a été approuvée");
              loadTeams();
            } else {
              Alert.alert("Erreur", result.error || "Impossible d'approuver l'équipe");
            }
          },
        },
      ]
    );
  };

  const handleReject = async (teamId: string) => {
    Alert.alert(
      "Rejeter l'équipe",
      "Voulez-vous rejeter cette équipe ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Rejeter",
          style: "destructive",
          onPress: async () => {
            const teamService = ServiceFactory.getTeamService(supabase);
            const result = await teamService.updateTeamStatus(teamId, "rejected", "");

            if (result.success) {
              Alert.alert("Succès", "L'équipe a été rejetée");
              loadTeams();
            } else {
              Alert.alert("Erreur", result.error || "Impossible de rejeter l'équipe");
            }
          },
        },
      ]
    );
  };

  const renderTeam = (team: Team, isPending: boolean) => {
    const categoryLabel = team.category ? ` - ${team.category.toUpperCase()}` : "";
    const genderLabel = team.gender ? ` - ${team.gender === "male" ? "M" : team.gender === "female" ? "F" : "Mixte"}` : "";
    const isTeamOwner = user && team.ownerId === user.id;

    return (
      <View key={team.id} style={styles.teamCard}>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          {(team.category || team.gender) && (
            <Text style={styles.teamDetails}>
              {categoryLabel}{genderLabel}
            </Text>
          )}
          {isPending && isOwner && team.ownerEmail && (
            <Text style={styles.teamEmail}>
              <Ionicons name="person-outline" size={12} color="#666" /> {team.ownerEmail}
            </Text>
          )}
        </View>

        {isPending && isOwner && (
          <View style={styles.teamActions}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(team.id)}
            >
              <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(team.id)}
            >
              <Ionicons name="close-circle" size={28} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}

        {!isPending && (
          <View style={styles.approvedActions}>
            {isTeamOwner && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEditTeam(team.id)}
              >
                <Ionicons name="create-outline" size={22} color="#9C27B0" />
              </TouchableOpacity>
            )}
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createButton} onPress={onCreateTeam}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Créer une équipe</Text>
      </TouchableOpacity>

      {/* Toggle to show pending teams */}
      {!isOwner && pendingTeams.length > 0 && (
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={() => setShowPending(!showPending)}
        >
          <Ionicons
            name={showPending ? "checkbox" : "square-outline"}
            size={24}
            color="#9C27B0"
          />
          <Text style={styles.toggleText}>
            Afficher les équipes en attente ({pendingTeams.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Pending teams section */}
      {((isOwner && pendingTeams.length > 0) || (showPending && pendingTeams.length > 0)) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>En attente de validation</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingTeams.length}</Text>
            </View>
          </View>
          {pendingTeams.map((team) => renderTeam(team, true))}
        </View>
      )}

      {/* Approved teams section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Équipes actives</Text>
        {approvedTeams.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>Aucune équipe active</Text>
            <Text style={styles.emptyStateSubtext}>
              Créez votre première équipe pour commencer
            </Text>
          </View>
        ) : (
          approvedTeams.map((team) => renderTeam(team, false))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9C27B0",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    gap: 10,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 20,
  },
  toggleText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  badge: {
    backgroundColor: "#F44336",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    padding: 15,
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
    marginBottom: 4,
  },
  teamDetails: {
    fontSize: 14,
    color: "#666",
  },
  teamEmail: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  teamActions: {
    flexDirection: "row",
    gap: 10,
  },
  approveButton: {
    padding: 5,
  },
  rejectButton: {
    padding: 5,
  },
  approvedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editButton: {
    padding: 5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#bbb",
    marginTop: 5,
  },
});
