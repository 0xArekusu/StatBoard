/**
 * MatchFilters Component
 *
 * Reusable filter UI for match actions.
 * Used in both FilterBottomSheet and MatchDetailsScreen.
 *
 * Features:
 * - Filter by teams (with "Tous" button)
 * - Filter by players separated by team (with "Tous" button per team)
 * - Filter by action types with color coding (with "Tous" button)
 * - Filter by periods (with "Tous" button)
 * - Immediate filter application
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ACTION_DEFINITIONS } from "../src/config/actionConfig";

interface Player {
  id: number;
  num: number;
  name: string;
  team: "A" | "B";
  isSubstitute: boolean;
}

interface MatchFiltersProps {
  // Team configuration
  teamA: string;
  teamB: string;
  teamMode: "A" | "B" | "BOTH";

  // Match configuration
  matchFormat: "2_halves" | "4_quarters";

  // Players
  players: Player[];

  // Current filter values
  selectedTeams: ("A" | "B")[];
  selectedPlayers: string[]; // Format: "team-number" (e.g., "A-5", "B-7")
  selectedActionTypes: string[];
  selectedPeriods: number[];

  // Callbacks for filter changes (applied immediately)
  onTeamsChange: (teams: ("A" | "B")[]) => void;
  onPlayersChange: (players: string[]) => void;
  onActionTypesChange: (actionTypes: string[]) => void;
  onPeriodsChange: (periods: number[]) => void;
}

export default function MatchFilters({
  teamA,
  teamB,
  teamMode,
  matchFormat,
  players,
  selectedTeams,
  selectedPlayers,
  selectedActionTypes,
  selectedPeriods,
  onTeamsChange,
  onPlayersChange,
  onActionTypesChange,
  onPeriodsChange,
}: MatchFiltersProps) {
  const totalPeriods = matchFormat === "2_halves" ? 2 : 4;

  const toggleTeam = (team: "A" | "B") => {
    const newTeams = selectedTeams.includes(team)
      ? selectedTeams.filter((t) => t !== team)
      : [...selectedTeams, team];
    onTeamsChange(newTeams);
  };

  const selectAllTeams = () => {
    let newTeams: ("A" | "B")[];
    if (teamMode === "BOTH") {
      newTeams = ["A", "B"];
    } else if (teamMode === "A") {
      newTeams = ["A"];
    } else {
      newTeams = ["B"];
    }
    onTeamsChange(newTeams);
  };

  const togglePlayer = (playerIdentifier: string) => {
    const newPlayers = selectedPlayers.includes(playerIdentifier)
      ? selectedPlayers.filter((id) => id !== playerIdentifier)
      : [...selectedPlayers, playerIdentifier];
    onPlayersChange(newPlayers);
  };

  const selectAllPlayersTeamA = () => {
    const teamAPlayers = players
      .filter((p) => p.team === "A")
      .map((p) => `A-${p.num}`);
    const newPlayers = [...new Set([...selectedPlayers, ...teamAPlayers])];
    onPlayersChange(newPlayers);
  };

  const selectAllPlayersTeamB = () => {
    const teamBPlayers = players
      .filter((p) => p.team === "B")
      .map((p) => `B-${p.num}`);
    const newPlayers = [...new Set([...selectedPlayers, ...teamBPlayers])];
    onPlayersChange(newPlayers);
  };

  const toggleActionType = (actionType: string) => {
    const newActionTypes = selectedActionTypes.includes(actionType)
      ? selectedActionTypes.filter((type) => type !== actionType)
      : [...selectedActionTypes, actionType];
    onActionTypesChange(newActionTypes);
  };

  const selectAllActionTypes = () => {
    const newActionTypes = ACTION_DEFINITIONS.map((action) => action.id);
    onActionTypesChange(newActionTypes);
  };

  const togglePeriod = (period: number) => {
    const newPeriods = selectedPeriods.includes(period)
      ? selectedPeriods.filter((p) => p !== period)
      : [...selectedPeriods, period];
    onPeriodsChange(newPeriods);
  };

  const selectAllPeriods = () => {
    const newPeriods = Array.from({ length: totalPeriods }, (_, i) => i + 1);
    onPeriodsChange(newPeriods);
  };

  return (
    <View style={styles.container}>
      {/* Équipes */}
      <View style={styles.filterCategory}>
        <View style={styles.filterCategoryHeader}>
          <Text style={styles.filterCategoryLabel}>Équipe</Text>
          <TouchableOpacity
            onPress={selectAllTeams}
            style={styles.selectAllButton}
          >
            <Text style={styles.selectAllText}>Tous</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterCards}>
          {/* Show Team A option if managing Team A or both */}
          {(teamMode === "A" || teamMode === "BOTH") && (
            <TouchableOpacity
              style={[
                styles.filterCard,
                selectedTeams.includes("A") && styles.filterCardActive,
              ]}
              onPress={() => toggleTeam("A")}
            >
              <Text
                style={[
                  styles.filterCardText,
                  selectedTeams.includes("A") && styles.filterCardTextActive,
                ]}
              >
                {teamA}
              </Text>
            </TouchableOpacity>
          )}

          {/* Show Team B option if managing Team B or both */}
          {(teamMode === "B" || teamMode === "BOTH") && (
            <TouchableOpacity
              style={[
                styles.filterCard,
                selectedTeams.includes("B") && styles.filterCardActive,
              ]}
              onPress={() => toggleTeam("B")}
            >
              <Text
                style={[
                  styles.filterCardText,
                  selectedTeams.includes("B") && styles.filterCardTextActive,
                ]}
              >
                {teamB}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Joueurs */}
      <View style={styles.filterCategory}>
        <Text style={styles.filterCategoryLabel}>Joueurs</Text>

        {/* Team A Players - Show if managing Team A or both */}
        {(selectedTeams.includes("A") || teamMode === "A") && (
          <>
            <View style={styles.filterSubHeader}>
              <Text style={styles.filterSubLabel}>{teamA}</Text>
              <TouchableOpacity
                onPress={selectAllPlayersTeamA}
                style={styles.selectAllButton}
              >
                <Text style={styles.selectAllText}>Tous</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterCardsScroll}
            >
              {players
                .filter((p) => p.team === "A")
                .sort((a, b) => a.num - b.num)
                .map((player) => {
                  const playerIdentifier = `A-${player.num}`;
                  return (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.filterCard,
                        selectedPlayers.includes(playerIdentifier) &&
                          styles.filterCardActive,
                      ]}
                      onPress={() => togglePlayer(playerIdentifier)}
                    >
                      <Text
                        style={[
                          styles.filterCardText,
                          selectedPlayers.includes(playerIdentifier) &&
                            styles.filterCardTextActive,
                        ]}
                      >
                        #{player.num} {player.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </>
        )}

        {/* Team B Players - Show if managing Team B or both */}
        {(selectedTeams.includes("B") || teamMode === "B") && (
          <>
            <View
              style={[
                styles.filterSubHeader,
                (selectedTeams.includes("A") || teamMode === "BOTH") &&
                  styles.filterSubHeaderMargin,
              ]}
            >
              <Text style={styles.filterSubLabel}>{teamB}</Text>
              <TouchableOpacity
                onPress={selectAllPlayersTeamB}
                style={styles.selectAllButton}
              >
                <Text style={styles.selectAllText}>Tous</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterCardsScroll}
            >
              {players
                .filter((p) => p.team === "B")
                .sort((a, b) => a.num - b.num)
                .map((player) => {
                  const playerIdentifier = `B-${player.num}`;
                  return (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.filterCard,
                        selectedPlayers.includes(playerIdentifier) &&
                          styles.filterCardActive,
                      ]}
                      onPress={() => togglePlayer(playerIdentifier)}
                    >
                      <Text
                        style={[
                          styles.filterCardText,
                          selectedPlayers.includes(playerIdentifier) &&
                            styles.filterCardTextActive,
                        ]}
                      >
                        #{player.num} {player.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </>
        )}
      </View>

      {/* Types d'actions */}
      <View style={styles.filterCategory}>
        <View style={styles.filterCategoryHeader}>
          <Text style={styles.filterCategoryLabel}>Actions</Text>
          <TouchableOpacity
            onPress={selectAllActionTypes}
            style={styles.selectAllButton}
          >
            <Text style={styles.selectAllText}>Tous</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterCardsScroll}
        >
          {ACTION_DEFINITIONS.map((action) => {
            const isSelected = selectedActionTypes.includes(action.id);
            return (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.filterCard,
                  isSelected && {
                    backgroundColor: action.backgroundColor,
                    borderColor: action.backgroundColor,
                  },
                ]}
                onPress={() => toggleActionType(action.id)}
              >
                <Text
                  style={[
                    styles.filterCardText,
                    isSelected && styles.filterCardTextActive,
                  ]}
                >
                  {action.icon} {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Périodes */}
      <View style={styles.filterCategory}>
        <View style={styles.filterCategoryHeader}>
          <Text style={styles.filterCategoryLabel}>
            {matchFormat === "2_halves" ? "Mi-temps" : "Quart-temps"}
          </Text>
          <TouchableOpacity
            onPress={selectAllPeriods}
            style={styles.selectAllButton}
          >
            <Text style={styles.selectAllText}>Tous</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterCards}>
          {Array.from({ length: totalPeriods }, (_, i) => i + 1).map(
            (period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.filterCard,
                  selectedPeriods.includes(period) && styles.filterCardActive,
                ]}
                onPress={() => togglePeriod(period)}
              >
                <Text
                  style={[
                    styles.filterCardText,
                    selectedPeriods.includes(period) &&
                      styles.filterCardTextActive,
                  ]}
                >
                  {matchFormat === "2_halves" ? `MT${period}` : `QT${period}`}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  filterCategory: {
    gap: 8,
    marginBottom: 20,
  },
  filterCategoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  filterCategoryLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
    flex: 1,
  },
  selectAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(76,175,80,0.1)",
    borderRadius: 4,
  },
  selectAllText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  filterCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterCardsScroll: {
    flexDirection: "row",
  },
  filterCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginRight: 8,
  },
  filterCardActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  filterCardText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterCardTextActive: {
    color: "#fff",
  },
  filterSubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  filterSubHeaderMargin: {
    marginTop: 16,
  },
  filterSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
  },
});
