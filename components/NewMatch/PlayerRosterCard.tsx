/**
 * Player Roster Card Component
 *
 * Card displaying a player with selection checkbox and starter toggle.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, SLATE_COLORS, COMMON_COLORS, UI_COLORS } from "../../src/theme";
import type { Player } from "../../models/Player";

interface PlayerRosterCardProps {
  /** Player data */
  player: Player;
  /** Whether player is selected for the match */
  isSelected: boolean;
  /** Whether player is in starting lineup */
  isStarter: boolean;
  /** Callback when player selection toggles */
  onToggleSelect: () => void;
  /** Callback when starter status toggles */
  onToggleStarter: () => void;
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
 * Player card with checkbox (select) and star (starter)
 */
export const PlayerRosterCard: React.FC<PlayerRosterCardProps> = ({
  player,
  isSelected,
  isStarter,
  onToggleSelect,
  onToggleStarter,
  isDark,
  colors,
}) => {
  return (
    <TouchableOpacity
      onPress={onToggleSelect}
      style={[
        styles.playerCard,
        {
          backgroundColor: isSelected
            ? colors.surfaceColor
            : isDark
            ? `${SLATE_COLORS[900]}80`
            : SLATE_COLORS[50],
          borderColor: isSelected
            ? isDark
              ? `${BRAND_COLORS[500]}50`
              : `${BRAND_COLORS[500]}30`
            : colors.borderColor,
          opacity: isSelected ? 1 : 0.6,
        },
      ]}
    >
      <View style={styles.playerCardLeft}>
        {/* Checkbox */}
        <View
          style={[
            styles.playerCheckbox,
            {
              borderColor: isSelected ? BRAND_COLORS[500] : colors.borderColor,
              backgroundColor: isSelected ? BRAND_COLORS[500] : "transparent",
            },
          ]}
        >
          {isSelected && (
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={COMMON_COLORS.white}
            />
          )}
        </View>

        {/* Jersey Number */}
        <View
          style={[
            styles.playerNumber,
            {
              backgroundColor: isSelected
                ? isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[100]
                : isDark
                ? SLATE_COLORS[800]
                : SLATE_COLORS[200],
            },
          ]}
        >
          <Text
            style={[
              styles.playerNumberText,
              {
                color: isSelected ? colors.textPrimary : colors.textSecondary,
              },
            ]}
          >
            {player.jerseyNumber}
          </Text>
        </View>

        {/* Player Name */}
        <Text
          style={[
            styles.playerName,
            {
              color: isSelected ? colors.textPrimary : colors.textSecondary,
            },
          ]}
        >
          {player.name}
        </Text>
      </View>

      {/* Starter Toggle (only visible if selected) */}
      {isSelected && (
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
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  playerCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  playerCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumberText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  playerName: {
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
  },
  starButton: {
    padding: 8,
    borderRadius: 999,
  },
});
