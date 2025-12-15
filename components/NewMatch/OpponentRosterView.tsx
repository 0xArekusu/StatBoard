/**
 * Opponent Roster View Component
 *
 * Displays and manages the opponent team roster.
 */

import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, SLATE_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import {
  MATCH_CREATION_INFO_MESSAGES,
  MATCH_CREATION_BUTTON_LABELS,
  ROSTER_LIMITS,
} from "../../constants";
import { OpponentPlayerCard } from "./OpponentPlayerCard";
import type { Player } from "../../models/Player";

interface OpponentRosterViewProps {
  /** Whether opponent stats tracking is enabled */
  trackOpponentStats: boolean;
  /** Opponent roster */
  opponentRoster: Player[];
  /** Opponent starter IDs */
  opponentStarters: string[];
  /** New opponent player name input */
  newPlayerName: string;
  /** New opponent player number input */
  newPlayerNumber: string;
  /** Callback when new player name changes */
  onNewNameChange: (text: string) => void;
  /** Callback when new player number changes */
  onNewNumberChange: (text: string) => void;
  /** Callback to add opponent player */
  onAddPlayer: () => void;
  /** Callback to generate multiple players */
  onGeneratePlayers: (count: number) => void;
  /** Callback when opponent starter toggles */
  onToggleStarter: (playerId: string) => void;
  /** Callback to remove player */
  onRemovePlayer: (playerId: string) => void;
  /** Callback to go back to step 1 */
  onGoToStep1: () => void;
  /** Whether dark mode is enabled */
  isDark: boolean;
  /** Theme colors */
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

/**
 * Opponent team roster management view
 */
export const OpponentRosterView: React.FC<OpponentRosterViewProps> = ({
  trackOpponentStats,
  opponentRoster,
  opponentStarters,
  newPlayerName,
  newPlayerNumber,
  onNewNameChange,
  onNewNumberChange,
  onAddPlayer,
  onGeneratePlayers,
  onToggleStarter,
  onRemovePlayer,
  onGoToStep1,
  isDark,
  colors,
}) => {
  if (!trackOpponentStats) {
    return (
      <View style={styles.rosterSection}>
        <View
          style={[
            styles.disabledOpponentBox,
            {
              backgroundColor: isDark
                ? `${SLATE_COLORS[900]}80`
                : SLATE_COLORS[100],
              borderColor: colors.borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chart-bar"
            size={32}
            color={colors.textSecondary}
            style={{ opacity: 0.5 }}
          />
          <Text
            style={[styles.disabledOpponentTitle, { color: colors.textPrimary }]}
          >
            {MATCH_CREATION_INFO_MESSAGES.OPPONENT_STATS_DISABLED}
          </Text>
          <Text
            style={[styles.disabledOpponentText, { color: colors.textSecondary }]}
          >
            {MATCH_CREATION_INFO_MESSAGES.OPPONENT_STATS_DISABLED_DETAIL}
          </Text>
          <TouchableOpacity onPress={onGoToStep1}>
            <Text
              style={[
                styles.disabledOpponentLink,
                { color: BRAND_COLORS[600] },
              ]}
            >
              {MATCH_CREATION_BUTTON_LABELS.MODIFY_OPTIONS}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rosterSection}>
      {/* Quick Add Buttons - COMMENTED FOR LATER USE */}
      {/* TODO: Re-enable quick add buttons in a future release */}
      {/* <View style={styles.quickAddButtons}>
        <TouchableOpacity
          onPress={() => onGeneratePlayers(ROSTER_LIMITS.QUICK_ADD.SMALL)}
          style={[
            styles.quickAddButton,
            {
              backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
              borderColor: colors.borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={12}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.quickAddButtonText, { color: colors.textSecondary }]}
          >
            {MATCH_CREATION_BUTTON_LABELS.GENERATE_PLAYERS(
              ROSTER_LIMITS.QUICK_ADD.SMALL
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onGeneratePlayers(ROSTER_LIMITS.QUICK_ADD.LARGE)}
          style={[
            styles.quickAddButton,
            {
              backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
              borderColor: colors.borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={12}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.quickAddButtonText, { color: colors.textSecondary }]}
          >
            {MATCH_CREATION_BUTTON_LABELS.GENERATE_PLAYERS(
              ROSTER_LIMITS.QUICK_ADD.LARGE
            )}
          </Text>
        </TouchableOpacity>
      </View> */}

      {/* Add Opponent Form */}
      <View style={styles.addOpponentForm}>
        <TextInput
          placeholder="Nom (Optionnel)"
          placeholderTextColor={colors.textSecondary}
          value={newPlayerName}
          onChangeText={onNewNameChange}
          style={[
            styles.addOpponentInput,
            styles.addOpponentInputName,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: colors.borderColor,
              color: colors.textPrimary,
            },
          ]}
        />
        <TextInput
          placeholder="#"
          placeholderTextColor={colors.textSecondary}
          value={newPlayerNumber}
          onChangeText={onNewNumberChange}
          keyboardType="number-pad"
          style={[
            styles.addOpponentInput,
            styles.addOpponentInputNumber,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: colors.borderColor,
              color: colors.textPrimary,
            },
          ]}
        />
        <TouchableOpacity
          onPress={onAddPlayer}
          disabled={!newPlayerNumber}
          style={[
            styles.addOpponentButton,
            {
              backgroundColor: BRAND_COLORS[600],
              opacity: newPlayerNumber ? 1 : OPACITY.disabled,
            },
          ]}
        >
          <Text
            style={[
              styles.addOpponentButtonText,
              { color: COMMON_COLORS.white },
            ]}
          >
            OK
          </Text>
        </TouchableOpacity>
      </View>

      {/* Opponent List */}
      <View style={styles.opponentList}>
        {opponentRoster.length > 0 ? (
          opponentRoster.map((player) => {
            const isStarter = opponentStarters.includes(player.id);
            return (
              <OpponentPlayerCard
                key={player.id}
                player={player}
                isStarter={isStarter}
                onToggleStarter={() => onToggleStarter(player.id)}
                onDelete={() => onRemovePlayer(player.id)}
                isDark={isDark}
                colors={colors}
              />
            );
          })
        ) : (
          <View style={styles.emptyOpponentList}>
            <Text
              style={[styles.emptyOpponentText, { color: colors.textSecondary }]}
            >
              {MATCH_CREATION_INFO_MESSAGES.NO_OPPONENT_PLAYERS}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rosterSection: {
    gap: 16,
  },
  disabledOpponentBox: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  disabledOpponentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  disabledOpponentText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  disabledOpponentLink: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
  },
  // Quick add buttons styles - COMMENTED FOR LATER USE
  // quickAddButtons: {
  //   flexDirection: "row",
  //   gap: 8,
  //   marginBottom: 16,
  // },
  // quickAddButton: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   gap: 4,
  //   paddingHorizontal: 12,
  //   paddingVertical: 6,
  //   borderRadius: 999,
  //   borderWidth: 1,
  // },
  // quickAddButtonText: {
  //   fontSize: 12,
  //   fontWeight: "bold",
  // },
  addOpponentForm: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  addOpponentInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addOpponentInputName: {
    flex: 1,
  },
  addOpponentInputNumber: {
    width: 64,
    textAlign: "center",
  },
  addOpponentButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addOpponentButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  opponentList: {
    gap: 8,
  },
  emptyOpponentList: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyOpponentText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
