/**
 * Home Roster View Component
 *
 * Displays and manages the home team roster selection.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, STATUS_COLORS } from "../../src/theme";
import { getMatchCreationInfoMessage, ROSTER_LIMITS } from "../../constants";
import { PlayerRosterCard } from "./PlayerRosterCard";
import { AddPlayerForm } from "./AddPlayerForm";
import type { Player } from "../../models/Player";
import { useResponsive } from "../../src/hooks/useResponsive";

interface HomeRosterViewProps {
  /** All available players */
  availablePlayers: Player[];
  /** Selected players for the match (also used for duplicate number checks) */
  selectedPlayers: Player[];
  /** Starting lineup player IDs */
  starters: string[];
  /** Temp player name input */
  tempPlayerName: string;
  /** Temp player number input */
  tempPlayerNumber: string;
  /** Temp player license number input */
  tempPlayerLicense: string;
  /** Callback when player selection toggles */
  onTogglePlayer: (player: Player) => void;
  /** Callback when starter status toggles */
  onToggleStarter: (playerId: string) => void;
  /** Callback when temp player name changes */
  onTempNameChange: (text: string) => void;
  /** Callback when temp player number changes */
  onTempNumberChange: (text: string) => void;
  /** Callback when temp player license changes */
  onTempLicenseChange: (text: string) => void;
  /** Callback to add temp player */
  onAddTempPlayer: () => void;
  /** If true, AddPlayerForm is not rendered (use for sticky-bottom layout) */
  hideAddForm?: boolean;
  /** Callback when jersey number changes */
  onPlayerNumberChange?: (playerId: string, newNumber: number) => void;
  /** Callback when number error state changes */
  onNumberError?: (playerId: string, hasError: boolean) => void;
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
 * Home team roster management view
 */
export const HomeRosterView: React.FC<HomeRosterViewProps> = ({
  availablePlayers,
  selectedPlayers,
  starters,
  tempPlayerName,
  tempPlayerNumber,
  tempPlayerLicense,
  onTogglePlayer,
  onToggleStarter,
  onTempNameChange,
  onTempNumberChange,
  onTempLicenseChange,
  onAddTempPlayer,
  hideAddForm,
  onPlayerNumberChange,
  onNumberError,
  isDark,
  colors,
}) => {
  const isPlayerSelected = (player: Player) =>
    selectedPlayers.some((p) => p.id === player.id);

  return (
    <View style={styles.rosterSection}>
      {/* Info Box */}
      <View
        style={[
          styles.infoBox,
          {
            backgroundColor: isDark
              ? `${BRAND_COLORS[500]}10`
              : `${BRAND_COLORS[500]}10`,
            borderColor: isDark
              ? `${BRAND_COLORS[500]}30`
              : `${BRAND_COLORS[500]}30`,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="information"
          size={16}
          color={BRAND_COLORS[600]}
        />
        <Text style={[styles.infoBoxText, { color: BRAND_COLORS[600] }]}>
          {getMatchCreationInfoMessage("ROSTER_INSTRUCTIONS")}
        </Text>
        <View
          style={[
            styles.starterBadge,
            {
              backgroundColor:
                starters.length === ROSTER_LIMITS.STARTERS
                  ? STATUS_COLORS.successBackground
                  : colors.borderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.starterBadgeText,
              {
                color:
                  starters.length === ROSTER_LIMITS.STARTERS
                    ? STATUS_COLORS.successLight
                    : colors.textSecondary,
              },
            ]}
          >
            {starters.length} / {ROSTER_LIMITS.STARTERS}
          </Text>
        </View>
      </View>

      {/* Players List */}
      <View style={styles.playersList}>
        {availablePlayers.map((player) => {
          const isSelected = isPlayerSelected(player);
          const isStarter = starters.includes(player.id);

          return (
            <PlayerRosterCard
              key={player.id}
              player={player}
              isSelected={isSelected}
              isStarter={isStarter}
              onToggleSelect={() => onTogglePlayer(player)}
              onToggleStarter={() => onToggleStarter(player.id)}
              onNumberChange={onPlayerNumberChange}
              onNumberError={onNumberError}
              allPlayers={availablePlayers}
              selectedPlayers={selectedPlayers}
            />
          );
        })}
      </View>

      {/* Add Temp Player Form — hidden when parent uses sticky-bottom layout */}
      {!hideAddForm && (
        <AddPlayerForm
          name={tempPlayerName}
          number={tempPlayerNumber}
          license={tempPlayerLicense}
          onNameChange={onTempNameChange}
          onNumberChange={onTempNumberChange}
          onLicenseChange={onTempLicenseChange}
          onAdd={onAddTempPlayer}
          allPlayers={availablePlayers}
          selectedPlayers={selectedPlayers}
          isDark={isDark}
          colors={colors}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rosterSection: {
    gap: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 12,
    flex: 1,
  },
  starterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  starterBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  playersList: {
    gap: 8,
  },
});
