import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import type { Player } from "../models/Player";
import PlayerCard from "./PlayerCard";

interface TeamPlayersManagerProps {
  teamId?: string;
  canEdit: boolean;
  initialPlayers?: any[];
  onPlayersChange?: (players: any[]) => void;
}

export default function TeamPlayersManager({
  teamId,
  canEdit,
  initialPlayers,
  onPlayersChange
}: TeamPlayersManagerProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers || []);
  const [loading, setLoading] = useState(!!teamId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [showTeamSection, setShowTeamSection] = useState(true);
  const [showStartersSection, setShowStartersSection] = useState(true);
  const [showBenchSection, setShowBenchSection] = useState(true);

  const loadPlayers = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const playerService = ServiceFactory.getPlayerService(supabase);
      const teamPlayers = await playerService.getTeamPlayers(teamId);
      setPlayers(teamPlayers);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      loadPlayers();
    }
  }, [loadPlayers]);

  const handleAddPlayer = async (data: any) => {
    // Check jersey number uniqueness
    if (players.some(p => p.jerseyNumber === data.jerseyNumber)) {
      Alert.alert("Erreur", "Ce numéro est déjà attribué à un autre joueur");
      return;
    }

    // Check max starters (5)
    if (data.isStarter) {
      const startersCount = players.filter(p => p.isStarter).length;
      if (startersCount >= 5) {
        Alert.alert("Erreur", "Vous ne pouvez avoir que 5 joueurs titulaires maximum");
        return;
      }
    }

    if (!teamId) {
      // Local mode (creation)
      const newPlayer = {
        id: `temp-${Date.now()}`,
        ...data,
      };
      const newPlayers = [...players, newPlayer];
      setPlayers(newPlayers);
      onPlayersChange?.(newPlayers);
      setShowAddForm(false);
      return;
    }

    // API mode (edit)
    const playerService = ServiceFactory.getPlayerService(supabase);
    const result = await playerService.createPlayer({
      teamId,
      ...data,
    });

    if (!result.success) {
      Alert.alert("Erreur", result.error);
      return;
    }

    Alert.alert("Succès", "Joueur ajouté");
    setShowAddForm(false);
    loadPlayers();
  };

  const handleUpdatePlayer = async (playerId: string, data: any): Promise<boolean> => {
    // Check jersey number uniqueness (exclude current player)
    if (data.jerseyNumber !== undefined && players.some(p => p.id !== playerId && p.jerseyNumber === data.jerseyNumber)) {
      Alert.alert("Erreur", "Ce numéro est déjà attribué à un autre joueur");
      return false;
    }

    // Check max starters (5)
    if (data.isStarter !== undefined) {
      const currentPlayer = players.find(p => p.id === playerId);
      const startersCount = players.filter(p => p.isStarter && p.id !== playerId).length;

      if (data.isStarter && !currentPlayer?.isStarter && startersCount >= 5) {
        Alert.alert("Erreur", "Vous ne pouvez avoir que 5 joueurs titulaires maximum");
        return false;
      }
    }

    if (!teamId) {
      // Local mode (creation)
      const newPlayers = players.map(p => p.id === playerId ? { ...p, ...data } : p);
      setPlayers(newPlayers);
      onPlayersChange?.(newPlayers);
      return true;
    }

    // API mode (edit)
    const playerService = ServiceFactory.getPlayerService(supabase);
    const result = await playerService.updatePlayer(playerId, data);

    if (!result.success) {
      Alert.alert("Erreur", result.error);
      return false;
    }

    Alert.alert("Succès", "Joueur modifié");
    loadPlayers();
    return true;
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!teamId) {
      // Local mode (creation)
      const newPlayers = players.filter(p => p.id !== playerId);
      setPlayers(newPlayers);
      onPlayersChange?.(newPlayers);
      return;
    }

    // API mode (edit)
    Alert.alert(
      "Supprimer le joueur",
      "Êtes-vous sûr de vouloir supprimer ce joueur ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const playerService = ServiceFactory.getPlayerService(supabase);
            const result = await playerService.deletePlayer(playerId, teamId!);

            if (!result.success) {
              Alert.alert("Erreur", result.error);
              return;
            }

            Alert.alert("Succès", "Joueur supprimé");
            loadPlayers();
          },
        },
      ]
    );
  };

  const handleToggleStarter = async (playerId: string, currentValue: boolean) => {
    // Check max starters (5) when setting to starter
    if (!currentValue) {
      const startersCount = players.filter(p => p.isStarter).length;
      if (startersCount >= 5) {
        Alert.alert("Erreur", "Vous ne pouvez avoir que 5 joueurs titulaires maximum");
        return;
      }
    }

    if (!teamId) {
      // Local mode (creation)
      const newPlayers = players.map(p =>
        p.id === playerId ? { ...p, isStarter: !currentValue } : p
      );
      setPlayers(newPlayers);
      onPlayersChange?.(newPlayers);
      return;
    }

    // API mode (edit)
    const playerService = ServiceFactory.getPlayerService(supabase);
    const result = await playerService.toggleStarter(playerId, currentValue);

    if (!result.success) {
      Alert.alert("Erreur", result.error);
      return;
    }

    loadPlayers();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  const canAddMore = players.length < 13;
  const needsMorePlayers = players.length < 5;
  const startersCount = players.filter(p => p.isStarter).length;
  const benchCount = players.filter(p => !p.isStarter).length;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setShowTeamSection(!showTeamSection)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Joueurs de l'équipe</Text>
          <Text style={styles.subtitle}>
            {players.length}/13 joueurs {needsMorePlayers && "(min. 5 requis)"}
          </Text>
        </View>
        <Ionicons
          name={showTeamSection ? "chevron-up" : "chevron-down"}
          size={24}
          color="#666"
        />
      </TouchableOpacity>

      {showTeamSection && (
        <>

      {/* Add Player Button */}
      {canEdit && canAddMore && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Ionicons
            name={showAddForm ? "remove-circle-outline" : "add-circle-outline"}
            size={24}
            color="#fff"
          />
          <Text style={styles.addButtonText}>
            {showAddForm ? "Annuler" : "Ajouter un joueur"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Add Player Form */}
      {showAddForm && canEdit && (
        <PlayerCard
          onSave={handleAddPlayer}
          canEdit={true}
        />
      )}

      {/* Players List */}
      {players.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="basketball-outline" size={60} color="#ccc" />
          <Text style={styles.emptyStateText}>Aucun joueur</Text>
          <Text style={styles.emptyStateSubtext}>
            Ajoutez au moins 5 joueurs pour créer votre équipe
          </Text>
        </View>
      ) : (
        <>
          {/* Starters */}
          {players.filter((p) => p.isStarter).length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowStartersSection(!showStartersSection)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>
                  Titulaires ({startersCount}/5)
                </Text>
                <Ionicons
                  name={showStartersSection ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              {showStartersSection && players
                .filter((p) => p.isStarter)
                .map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onSave={(data) => handleUpdatePlayer(player.id, data)}
                    onDelete={() => handleDeletePlayer(player.id)}
                    onToggleStarter={() => handleToggleStarter(player.id, player.isStarter)}
                    canEdit={canEdit}
                  />
                ))}
            </View>
          )}

          {/* Bench */}
          {players.filter((p) => !p.isStarter).length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowBenchSection(!showBenchSection)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>
                  Remplaçants ({benchCount}/{13 - startersCount})
                </Text>
                <Ionicons
                  name={showBenchSection ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              {showBenchSection && players
                .filter((p) => !p.isStarter)
                .map((player) => {
                  const canBecomeStarter = startersCount < 5;
                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onSave={(data) => handleUpdatePlayer(player.id, data)}
                      onDelete={() => handleDeletePlayer(player.id)}
                      onToggleStarter={canBecomeStarter ? () => handleToggleStarter(player.id, player.isStarter) : undefined}
                      canEdit={canEdit}
                      canBecomeStarter={canBecomeStarter}
                    />
                  );
                })}
            </View>
          )}
        </>
      )}

      {/* Info Box */}
      {needsMorePlayers && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#F44336" />
          <Text style={styles.infoText}>
            Vous devez ajouter au moins {5 - players.length} joueur(s) supplémentaire(s).
          </Text>
        </View>
      )}
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9C27B0",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
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
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FFEBEE",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#C62828",
    lineHeight: 20,
  },
});
