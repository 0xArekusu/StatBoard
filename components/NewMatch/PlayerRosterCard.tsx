/**
 * Player Roster Card Component
 *
 * Card displaying a player with selection checkbox and starter toggle.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Player } from "../../models/Player";
import { useTheme } from "../../src/contexts/ThemeContext";
import PlayerAvatar from "../PlayerAvatar";
import { useResponsive } from "../../src/hooks/useResponsive";

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
  /** Callback when jersey number changes */
  onNumberChange?: (playerId: string, newNumber: number) => void;
  /** All players in the roster to check for duplicates */
  allPlayers?: Player[];
  /** Callback when number error state changes */
  onNumberError?: (playerId: string, hasError: boolean) => void;
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
  onNumberChange,
  allPlayers = [],
  onNumberError,
}) => {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [tempNumber, setTempNumber] = useState(player.jerseyNumber.toString());
  const [numberError, setNumberError] = useState<string | null>(null);

  const handleNumberSubmit = () => {
    const newNumber = parseInt(tempNumber, 10);

    // Reset error
    setNumberError(null);
    if (onNumberError) {
      onNumberError(player.id, false);
    }

    // Validation
    if (isNaN(newNumber) || newNumber < 0 || newNumber > 99) {
      setNumberError("Le numéro doit être entre 0 et 99.");
      if (onNumberError) {
        onNumberError(player.id, true);
      }
      return;
    }

    // Check for duplicate number
    const isDuplicateNumber = allPlayers.some(
      (p) => p.id !== player.id && p.jerseyNumber === newNumber,
    );

    if (isDuplicateNumber) {
      setNumberError("Ce numéro de maillot est déjà utilisé.");
      if (onNumberError) {
        onNumberError(player.id, true);
      }
      return;
    }

    // If valid, update
    if (onNumberChange) {
      onNumberChange(player.id, newNumber);
    }
    setIsEditingNumber(false);
  };

  const handleNumberChange = (text: string) => {
    setTempNumber(text);
    setNumberError(null);
    if (onNumberError) {
      onNumberError(player.id, false);
    }
  };

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        onPress={onToggleSelect}
        activeOpacity={0.8}
        style={[
          styles.playerCard,
          {
            backgroundColor: isSelected
              ? colors.surface
              : colors.surfaceVariant,
            borderColor: isSelected ? `${colors.primary}50` : colors.border,
            opacity: isSelected ? 1 : 0.6,
            padding: sp.sm + sp.xs,
            borderRadius: sp.md,
          },
        ]}
      >
        <View style={[styles.playerCardLeft, { gap: sp.sm + sp.xs }]}>
          {/* Checkbox */}
          <View
            style={[
              styles.playerCheckbox,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary : "transparent",
                width: sizes.avatarSm * 0.6,
                height: sizes.avatarSm * 0.6,
              },
            ]}
          >
            {isSelected && (
              <MaterialCommunityIcons
                name="check"
                size={sizes.iconSm}
                color={colors.text.primary}
              />
            )}
          </View>

          {/* Player Avatar */}
          <PlayerAvatar
            playerName={player.name}
            playerNumber={player.jerseyNumber}
            photoUrl={player.photoUrl}
            size={isCompact ? sizes.avatarSm : sizes.avatarSm}
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
                  color: isSelected
                    ? colors.text.primary
                    : colors.text.secondary,
                  fontSize: font.md,
                },
              ]}
            >
              {player.name}
            </Text>

            {/* Editable Number */}
            {isEditingNumber ? (
              <TextInput
                value={tempNumber}
                onChangeText={handleNumberChange}
                onBlur={handleNumberSubmit}
                onSubmitEditing={handleNumberSubmit}
                keyboardType="number-pad"
                maxLength={2}
                autoFocus
                selectTextOnFocus
                style={[
                  styles.numberInput,
                  {
                    color: colors.text.primary,
                    backgroundColor: colors.background,
                    borderColor: numberError ? "#ef4444" : colors.primary,
                    fontSize: font.md,
                    paddingVertical: sp.xs,
                    paddingHorizontal: sp.sm,
                    borderRadius: sp.xs,
                    minWidth: sp.xxl * 1.5,
                    marginLeft: sp.sm + 2,
                  },
                ]}
              />
            ) : (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setIsEditingNumber(true);
                }}
                style={[
                  styles.numberTouchable,
                  {
                    gap: sp.xs,
                    paddingVertical: sp.xs,
                    paddingHorizontal: sp.xs,
                    borderRadius: sp.xs,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.playerNumber,
                    {
                      color: isSelected
                        ? colors.text.secondary
                        : colors.text.tertiary,
                      fontSize: font.md,
                    },
                  ]}
                >
                  {" - #"}
                  {player.jerseyNumber}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="pencil"
                    size={sizes.iconSm}
                    color={colors.text.tertiary}
                    style={styles.editIcon}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Starter Toggle (only visible if selected) */}
        {isSelected && (
          <TouchableOpacity
            onPress={onToggleStarter}
            style={[
              styles.starButton,
              {
                backgroundColor: isStarter
                  ? `${colors.warning}20`
                  : "transparent",
                borderWidth: isStarter ? 2 : 0,
                borderColor: isStarter ? colors.warning : "transparent",
                padding: sp.sm,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isStarter ? "star" : "star-outline"}
              size={sizes.iconMd}
              color={isStarter ? colors.warning : colors.text.secondary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Error message */}
      {numberError && (
        <Text
          style={[
            styles.errorText,
            { fontSize: font.sm, marginTop: sp.xs, marginLeft: sp.sm + sp.xs },
          ]}
        >
          {numberError}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: "100%",
  },
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
  numberTouchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  numberInput: {
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 50,
    textAlign: "center",
    marginLeft: 10,
  },
  editIcon: {
    opacity: 0.5,
  },
  starButton: {
    padding: 8,
    borderRadius: 999,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    marginLeft: 12,
  },
});
