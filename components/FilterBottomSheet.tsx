import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { ActionData } from "./ActionSystemModal";

interface Player {
  id: number;
  num: number;
  name: string;
}

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  players: Player[];
  teamA: string;
  teamB: string;
  completedActions: ActionData[];
  onApplyFilters: (filters: FilterOptions) => void;
  appliedFilters: FilterOptions;
  isPortrait: boolean; // Add orientation prop
}

interface FilterOptions {
  teams: ("A" | "B")[];
  players: number[];
  actionTypes: string[];
}

const ACTION_TYPES = [
  { key: "tir", label: "Tirs", icon: "🏀" },
  { key: "rebond", label: "Rebonds", icon: "📥" },
  { key: "faute", label: "Fautes", icon: "🚨" },
  { key: "turnover", label: "Pertes de balle", icon: "💥" },
  { key: "assist", label: "Passes décisives", icon: "🎯" },
  { key: "steal", label: "Interceptions", icon: "🕵️" },
  { key: "block", label: "Contres", icon: "🚫" },
];

export default function FilterBottomSheet({
  visible,
  onClose,
  players,
  teamA,
  teamB,
  completedActions,
  onApplyFilters,
  appliedFilters,
  isPortrait,
}: FilterBottomSheetProps) {
  const [selectedTeams, setSelectedTeams] = useState<("A" | "B")[]>(["A", "B"]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);

  // Synchronize local state with applied filters when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setSelectedTeams(appliedFilters.teams);
      setSelectedPlayers(appliedFilters.players);
      setSelectedActionTypes(appliedFilters.actionTypes);
    }
  }, [visible, appliedFilters]);

  const toggleTeam = (team: "A" | "B") => {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };

  const togglePlayer = (playerId: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const toggleActionType = (actionType: string) => {
    setSelectedActionTypes((prev) =>
      prev.includes(actionType)
        ? prev.filter((type) => type !== actionType)
        : [...prev, actionType]
    );
  };

  const applyFilters = () => {
    onApplyFilters({
      teams: selectedTeams,
      players: selectedPlayers,
      actionTypes: selectedActionTypes,
    });
    onClose();
  };

  const resetFilters = () => {
    setSelectedTeams(["A", "B"]);
    setSelectedPlayers([]);
    setSelectedActionTypes([]);
  };

  const selectAllPlayers = () => {
    setSelectedPlayers(players.map((p) => p.num));
  };

  const selectAllActionTypes = () => {
    setSelectedActionTypes(ACTION_TYPES.map((type) => type.key));
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType={isPortrait ? "slide" : "fade"}
      onRequestClose={onClose}
    >
      <View
        style={
          isPortrait
            ? styles.filterSheetOverlay
            : styles.filterSheetOverlayLandscape
        }
      >
        <TouchableOpacity
          style={styles.filterSheetBackdrop}
          onPress={onClose}
        />
        <View
          style={
            isPortrait
              ? styles.filterSheetContainer
              : styles.filterSheetContainerLandscape
          }
        >
          <View style={styles.filterSheetHandle} />
          <Text style={styles.filterSheetTitle}>Filtrer les actions</Text>

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Équipes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Équipes</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    selectedTeams.includes("A") && styles.optionButtonSelected,
                  ]}
                  onPress={() => toggleTeam("A")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedTeams.includes("A") && styles.optionTextSelected,
                    ]}
                  >
                    {teamA}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    selectedTeams.includes("B") && styles.optionButtonSelected,
                  ]}
                  onPress={() => toggleTeam("B")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedTeams.includes("B") && styles.optionTextSelected,
                    ]}
                  >
                    {teamB}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Joueurs */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Joueurs</Text>
                <TouchableOpacity
                  onPress={selectAllPlayers}
                  style={styles.selectAllButton}
                >
                  <Text style={styles.selectAllText}>Tous</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.optionsGrid}>
                {players.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerButton,
                      selectedPlayers.includes(player.num) &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => togglePlayer(player.num)}
                  >
                    <Text style={styles.playerNumber}>{player.num}</Text>
                    <Text
                      style={[
                        styles.playerName,
                        selectedPlayers.includes(player.num) &&
                          styles.optionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Types d'actions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Types d'actions</Text>
                <TouchableOpacity
                  onPress={selectAllActionTypes}
                  style={styles.selectAllButton}
                >
                  <Text style={styles.selectAllText}>Tous</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.optionsGrid}>
                {ACTION_TYPES.map((actionType) => (
                  <TouchableOpacity
                    key={actionType.key}
                    style={[
                      styles.actionTypeButton,
                      selectedActionTypes.includes(actionType.key) &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => toggleActionType(actionType.key)}
                  >
                    <Text style={styles.actionTypeIcon}>{actionType.icon}</Text>
                    <Text
                      style={[
                        styles.actionTypeText,
                        selectedActionTypes.includes(actionType.key) &&
                          styles.optionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {actionType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  filterSheetOverlay: {
    flex: 1,
    backgroundColor: "transparent", // Remove dark overlay
    justifyContent: "flex-end",
  },
  filterSheetOverlayLandscape: {
    flex: 1,
    backgroundColor: "transparent", // Remove dark overlay
    justifyContent: "center",
  },
  filterSheetBackdrop: {
    flex: 1,
  },
  filterSheetContainer: {
    backgroundColor: "rgba(255,255,255,0.9)", // Increase opacity since no dark overlay
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "50%",
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  filterSheetContainerLandscape: {
    backgroundColor: "rgba(255,255,255,0.9)", // Increase opacity since no dark overlay
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    padding: 20,
    minWidth: "40%",
    maxWidth: "60%",
    height: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    position: "absolute",
    right: 0,
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  filterSheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  selectAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,123,255,0.1)",
    borderRadius: 4,
  },
  selectAllText: {
    fontSize: 12,
    color: "#007bff",
    fontWeight: "500",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#fff",
  },
  playerButton: {
    width: "48%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  playerNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
  },
  playerName: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  actionTypeButton: {
    width: "48%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  actionTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionTypeText: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 15,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "rgba(220,53,69,0.1)",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc3545",
  },
  resetButtonText: {
    color: "#dc3545",
    fontSize: 16,
    fontWeight: "bold",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#28a745",
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
