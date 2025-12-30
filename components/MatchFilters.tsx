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
import { ACTION_DEFINITIONS } from "../src/models/ActionTypes";
import { useTheme } from "../src/contexts/ThemeContext";
import { Team } from "../src/models/types";

interface Player {
  id: number;
  num: number;
  name: string;
  team: Team;
  isSubstitute: boolean;
}

interface MatchFiltersProps {
  // Team configuration
  teamA: string;
  teamB: string;
  teamMode: Team | "BOTH";

  // Match configuration
  matchFormat: "2_halves" | "4_quarters";

  // Players
  players: Player[];

  // Current filter values
  selectedTeams: Team[];
  selectedPlayers: string[]; // Format: "team-number" (e.g., "MyTeam-5", "Opponent-7")
  selectedActionTypes: string[];
  selectedPeriods: number[];

  // Callbacks for filter changes (applied immediately)
  onTeamsChange: (teams: Team[]) => void;
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
  const { colors } = useTheme();
  const totalPeriods = matchFormat === "2_halves" ? 2 : 4;

  const toggleTeam = (team: Team) => {
    const newTeams = selectedTeams.includes(team)
      ? selectedTeams.filter((t) => t !== team)
      : [...selectedTeams, team];
    onTeamsChange(newTeams);
  };

  const selectAllTeams = () => {
    let newTeams: Team[];
    if (teamMode === "BOTH") {
      newTeams = [Team.MY_TEAM, Team.OPPONENT];
    } else if (teamMode === Team.MY_TEAM) {
      newTeams = [Team.MY_TEAM];
    } else {
      newTeams = [Team.OPPONENT];
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
      .filter((p) => p.team === Team.MY_TEAM)
      .map((p) => `${Team.MY_TEAM}-${p.num}`);
    const newPlayers = [...new Set([...selectedPlayers, ...teamAPlayers])];
    onPlayersChange(newPlayers);
  };

  const selectAllPlayersTeamB = () => {
    const teamBPlayers = players
      .filter((p) => p.team === Team.OPPONENT)
      .map((p) => `${Team.OPPONENT}-${p.num}`);
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
          <Text style={[styles.filterCategoryLabel, { color: colors.text.primary }]}>Équipe</Text>
          <TouchableOpacity
            onPress={selectAllTeams}
            style={styles.selectAllButton}
          >
            <Text style={[styles.selectAllText, { color: colors.text.tertiary }]}>Tous</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterCards}>
          {/* Show Team A option if managing Team A or both */}
          {(teamMode === Team.MY_TEAM || teamMode === "BOTH") && (
            <TouchableOpacity
              style={[
                styles.filterCard,
                { backgroundColor: colors.surfaceVariant },
                selectedTeams.includes(Team.MY_TEAM) && { backgroundColor: colors.success },
              ]}
              onPress={() => toggleTeam(Team.MY_TEAM)}
            >
              <Text
                style={[
                  styles.filterCardText,
                  { color: colors.text.secondary },
                  selectedTeams.includes(Team.MY_TEAM) && { color: colors.text.primary },
                ]}
              >
                {teamA}
              </Text>
            </TouchableOpacity>
          )}

          {/* Show Team B option if managing Team B or both */}
          {(teamMode === Team.OPPONENT || teamMode === "BOTH") && (
            <TouchableOpacity
              style={[
                styles.filterCard,
                { backgroundColor: colors.surfaceVariant },
                selectedTeams.includes(Team.OPPONENT) && { backgroundColor: colors.success },
              ]}
              onPress={() => toggleTeam(Team.OPPONENT)}
            >
              <Text
                style={[
                  styles.filterCardText,
                  { color: colors.text.secondary },
                  selectedTeams.includes(Team.OPPONENT) && { color: colors.text.primary },
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
        <Text style={[styles.filterCategoryLabel, { color: colors.text.primary }]}>Joueurs</Text>

        {/* Team A Players - Show if managing Team A or both */}
        {(selectedTeams.includes(Team.MY_TEAM) || teamMode === Team.MY_TEAM) && (
          <>
            <View style={styles.filterSubHeader}>
              <Text style={[styles.filterSubLabel, { color: colors.text.secondary }]}>{teamA}</Text>
              <TouchableOpacity
                onPress={selectAllPlayersTeamA}
                style={styles.selectAllButton}
              >
                <Text style={[styles.selectAllText, { color: colors.text.tertiary }]}>Tous</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterCardsScroll}
            >
              {players
                .filter((p) => p.team === Team.MY_TEAM)
                .sort((a, b) => a.num - b.num)
                .map((player) => {
                  const playerIdentifier = `${Team.MY_TEAM}-${player.num}`;
                  return (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.filterCard,
                        { backgroundColor: colors.surfaceVariant },
                        selectedPlayers.includes(playerIdentifier) &&
                          { backgroundColor: colors.success },
                      ]}
                      onPress={() => togglePlayer(playerIdentifier)}
                    >
                      <Text
                        style={[
                          styles.filterCardText,
                          { color: colors.text.secondary },
                          selectedPlayers.includes(playerIdentifier) &&
                            { color: colors.text.primary },
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
        {(selectedTeams.includes(Team.OPPONENT) || teamMode === Team.OPPONENT) && (
          <>
            <View
              style={[
                styles.filterSubHeader,
                (selectedTeams.includes(Team.MY_TEAM) || teamMode === "BOTH") &&
                  styles.filterSubHeaderMargin,
              ]}
            >
              <Text style={[styles.filterSubLabel, { color: colors.text.secondary }]}>{teamB}</Text>
              <TouchableOpacity
                onPress={selectAllPlayersTeamB}
                style={styles.selectAllButton}
              >
                <Text style={[styles.selectAllText, { color: colors.text.tertiary }]}>Tous</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterCardsScroll}
            >
              {players
                .filter((p) => p.team === Team.OPPONENT)
                .sort((a, b) => a.num - b.num)
                .map((player) => {
                  const playerIdentifier = `${Team.OPPONENT}-${player.num}`;
                  return (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.filterCard,
                        { backgroundColor: colors.surfaceVariant },
                        selectedPlayers.includes(playerIdentifier) &&
                          { backgroundColor: colors.success },
                      ]}
                      onPress={() => togglePlayer(playerIdentifier)}
                    >
                      <Text
                        style={[
                          styles.filterCardText,
                          { color: colors.text.secondary },
                          selectedPlayers.includes(playerIdentifier) &&
                            { color: colors.text.primary },
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
          <Text style={[styles.filterCategoryLabel, { color: colors.text.primary }]}>Actions</Text>
          <TouchableOpacity
            onPress={selectAllActionTypes}
            style={styles.selectAllButton}
          >
            <Text style={[styles.selectAllText, { color: colors.text.tertiary }]}>Tous</Text>
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
                  { backgroundColor: colors.surfaceVariant },
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
                    { color: colors.text.secondary },
                    isSelected && { color: colors.text.primary },
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
          <Text style={[styles.filterCategoryLabel, { color: colors.text.primary }]}>
            {matchFormat === "2_halves" ? "Mi-temps" : "Quart-temps"}
          </Text>
          <TouchableOpacity
            onPress={selectAllPeriods}
            style={styles.selectAllButton}
          >
            <Text style={[styles.selectAllText, { color: colors.text.tertiary }]}>Tous</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterCards}>
          {Array.from({ length: totalPeriods }, (_, i) => i + 1).map(
            (period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.filterCard,
                  { backgroundColor: colors.surfaceVariant },
                  selectedPeriods.includes(period) && { backgroundColor: colors.success },
                ]}
                onPress={() => togglePeriod(period)}
              >
                <Text
                  style={[
                    styles.filterCardText,
                    { color: colors.text.secondary },
                    selectedPeriods.includes(period) &&
                      { color: colors.text.primary },
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
