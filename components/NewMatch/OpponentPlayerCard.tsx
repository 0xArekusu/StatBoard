/**
 * Opponent Player Card Component
 *
 * Card displaying an opponent player with starter toggle and delete button.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SLATE_COLORS, UI_COLORS, STATUS_COLORS } from "../../src/theme";
import type { Player } from "../../models/Player";

interface OpponentPlayerCardProps {
  /** Player data */
  player: Player;
  /** Whether player is in starting lineup */
  isStarter: boolean;
  /** Callback when starter status toggles */
  onToggleStarter: () => void;
  /** Callback when delete button is pressed */
  onDelete: () => void;
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
 * Opponent player card with star (starter) and delete button
 */
export const OpponentPlayerCard: React.FC<OpponentPlayerCardProps> = ({
  player,
  isStarter,
  onToggleStarter,
  onDelete,
  isDark,
  colors,
}) => {
  return (
    <View
      style={[
        styles.opponentCard,
        { backgroundColor: colors.surfaceColor, borderColor: colors.borderColor },
      ]}
    >
      <View style={styles.opponentCardLeft}>
        {/* Jersey Number */}
        <View
          style={[
            styles.opponentNumber,
            {
              backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
            },
          ]}
        >
          <Text style={[styles.opponentNumberText, { color: colors.textPrimary }]}>
            {player.jerseyNumber}
          </Text>
        </View>

        {/* Player Name */}
        <Text
          style={[styles.opponentName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {player.name}
        </Text>
      </View>

      <View style={styles.opponentCardRight}>
        {/* Starter Toggle */}
        <TouchableOpacity
          onPress={onToggleStarter}
          style={[
            styles.starButton,
            {
              backgroundColor: isStarter ? UI_COLORS.starBackground : "transparent",
              borderWidth: isStarter ? 2 : 0,
              borderColor: isStarter ? UI_COLORS.star : "transparent",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isStarter ? "star" : "star-outline"}
            size={20}
            color={isStarter ? UI_COLORS.star : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons
            name="delete"
            size={20}
            color={STATUS_COLORS.error}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  opponentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  opponentCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  opponentNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  opponentNumberText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  opponentName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  opponentCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starButton: {
    padding: 8,
    borderRadius: 999,
  },
  deleteButton: {
    padding: 4,
  },
});
