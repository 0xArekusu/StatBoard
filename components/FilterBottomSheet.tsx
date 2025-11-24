/**
 * FilterBottomSheet
 *
 * Bottom sheet modal for filtering displayed actions on the court.
 * Uses the reusable MatchFilters component for the filter UI.
 *
 * Features:
 * - Multi-select filters (teams, players, action types, periods)
 * - Reset filters button
 * - Close button
 * - Immediate filter application
 * - Adapts to portrait/landscape orientation
 */
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
import MatchFilters from "./MatchFilters";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";

interface Player {
  id: number;
  num: number;
  name: string;
  team: "A" | "B";
  isSubstitute: boolean;
}

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  players: Player[];
  teamA: string;
  teamB: string;
  teamMode: "A" | "B" | "BOTH";
  matchFormat: "2_halves" | "4_quarters";
  completedActions: ActionData[];
  onApplyFilters: (filters: FilterOptions) => void;
  appliedFilters: FilterOptions;
  isPortrait: boolean;
}

interface FilterOptions {
  teams: ("A" | "B")[];
  players: string[]; // Format: "team-number" (e.g., "A-5", "B-7")
  actionTypes: string[];
  periods: number[];
}

export default function FilterBottomSheet({
  visible,
  onClose,
  players,
  teamA,
  teamB,
  teamMode,
  matchFormat,
  onApplyFilters,
  appliedFilters,
  isPortrait,
}: FilterBottomSheetProps) {
  const { colors } = useTheme();
  const [selectedTeams, setSelectedTeams] = useState<("A" | "B")[]>(["A", "B"]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);

  // Synchronize local state with applied filters when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setSelectedTeams(appliedFilters.teams);
      setSelectedPlayers(appliedFilters.players);
      setSelectedActionTypes(appliedFilters.actionTypes);
      setSelectedPeriods(appliedFilters.periods);
    }
  }, [visible, appliedFilters]);

  const resetFilters = () => {
    setSelectedTeams(["A", "B"]);
    setSelectedPlayers([]);
    setSelectedActionTypes([]);
    setSelectedPeriods([]);
    // Apply filter immediately
    onApplyFilters({
      teams: ["A", "B"],
      players: [],
      actionTypes: [],
      periods: [],
    });
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
          style={[
            isPortrait
              ? styles.filterSheetContainer
              : styles.filterSheetContainerLandscape,
            { backgroundColor: colors.surface }
          ]}
        >
          <View style={[styles.filterSheetHandle, { backgroundColor: colors.text.disabled }]} />
          <Text style={[styles.filterSheetTitle, { color: colors.text.primary }]}>Filtrer les actions</Text>

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <MatchFilters
              teamA={teamA}
              teamB={teamB}
              teamMode={teamMode}
              matchFormat={matchFormat}
              players={players}
              selectedTeams={selectedTeams}
              selectedPlayers={selectedPlayers}
              selectedActionTypes={selectedActionTypes}
              selectedPeriods={selectedPeriods}
              onTeamsChange={(teams) => {
                setSelectedTeams(teams);
                onApplyFilters({
                  teams,
                  players: selectedPlayers,
                  actionTypes: selectedActionTypes,
                  periods: selectedPeriods,
                });
              }}
              onPlayersChange={(players) => {
                setSelectedPlayers(players);
                onApplyFilters({
                  teams: selectedTeams,
                  players,
                  actionTypes: selectedActionTypes,
                  periods: selectedPeriods,
                });
              }}
              onActionTypesChange={(actionTypes) => {
                setSelectedActionTypes(actionTypes);
                onApplyFilters({
                  teams: selectedTeams,
                  players: selectedPlayers,
                  actionTypes,
                  periods: selectedPeriods,
                });
              }}
              onPeriodsChange={(periods) => {
                setSelectedPeriods(periods);
                onApplyFilters({
                  teams: selectedTeams,
                  players: selectedPlayers,
                  actionTypes: selectedActionTypes,
                  periods,
                });
              }}
            />
          </ScrollView>

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.resetButton, { backgroundColor: STATUS_COLORS.error + "20", borderColor: STATUS_COLORS.error }]} onPress={resetFilters}>
              <Text style={[styles.resetButtonText, { color: STATUS_COLORS.error }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: colors.text.secondary }]}>Fermer</Text>
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
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  filterSheetOverlayLandscape: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  filterSheetBackdrop: {
    flex: 1,
  },
  filterSheetContainer: {
    backgroundColor: "rgba(255,255,255,0.9)",
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
    backgroundColor: "rgba(255,255,255,0.9)",
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
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#007bff",
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
