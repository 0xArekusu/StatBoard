/**
 * Player Roster Card Component
 *
 * Card displaying a player with selection checkbox and starter toggle.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Player } from "../../models/Player";
import { useTheme } from "../../src/contexts/ThemeContext";
import PlayerAvatar from "../PlayerAvatar";

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
}) => {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onToggleSelect}
      style={[
        styles.playerCard,
        {
          backgroundColor: isSelected
            ? colors.surface
            : colors.surfaceVariant,
          borderColor: isSelected
            ? `${colors.primary}50`
            : colors.border,
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
              borderColor: isSelected ? colors.primary : colors.border,
              backgroundColor: isSelected ? colors.primary : "transparent",
            },
          ]}
        >
          {isSelected && (
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={colors.text.primary}
            />
          )}
        </View>

        {/* Player Avatar */}
        <PlayerAvatar
          playerName={player.name}
          playerNumber={player.jerseyNumber}
          photoUrl={player.photoUrl}
          size={40}
          borderColor={colors.border}
          backgroundColor={colors.surfaceVariant}
          textColor={isSelected ? colors.text.primary : colors.text.secondary}
          borderWidth={2}
        />

        {/* Player Name and Number */}
        <View style={styles.playerNameContainer}>
          <Text
            style={[
              styles.playerName,
              {
                color: isSelected ? colors.text.primary : colors.text.secondary,
              },
            ]}
          >
            {player.name}
          </Text>
          <Text
            style={[
              styles.playerNumber,
              {
                color: isSelected ? colors.text.secondary : colors.text.tertiary,
              },
            ]}
          >
            {" - #"}{player.jerseyNumber}
          </Text>
        </View>
      </View>

      {/* Starter Toggle (only visible if selected) */}
      {isSelected && (
        <TouchableOpacity
          onPress={onToggleStarter}
          style={[
            styles.starButton,
            {
              backgroundColor: isStarter ? `${colors.warning}20` : "transparent",
              borderWidth: isStarter ? 2 : 0,
              borderColor: isStarter ? colors.warning : "transparent",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isStarter ? "star" : "star-outline"}
            size={20}
            color={isStarter ? colors.warning : colors.text.secondary}
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
  playerNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  starButton: {
    padding: 8,
    borderRadius: 999,
  },
});
