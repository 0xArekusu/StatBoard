/**
 * Add Player Form Component
 *
 * Form to add a temporary player (reinforcement) to the roster.
 */

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SLATE_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import { MATCH_CREATION_BUTTON_LABELS } from "../../constants";
import type { Player } from "../../models/Player";

interface AddPlayerFormProps {
  /** Player name input value */
  name: string;
  /** Player number input value */
  number: string;
  /** Callback when name changes */
  onNameChange: (text: string) => void;
  /** Callback when number changes */
  onNumberChange: (text: string) => void;
  /** Callback when add button is pressed */
  onAdd: () => void;
  /** All players to check for duplicates */
  allPlayers?: Player[];
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
 * Form to add a reinforcement player
 */
export const AddPlayerForm: React.FC<AddPlayerFormProps> = ({
  name,
  number,
  onNameChange,
  onNumberChange,
  onAdd,
  allPlayers = [],
  isDark,
  colors,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleNumberChange = (text: string) => {
    onNumberChange(text);
    setError(null);
  };

  const handleAdd = () => {
    setError(null);

    const numValue = parseInt(number, 10);

    // Validation
    if (isNaN(numValue) || numValue < 0 || numValue > 99) {
      setError("Le numéro doit être entre 0 et 99.");
      return;
    }

    // Check for duplicate number
    const isDuplicateNumber = allPlayers.some(
      (p) => p.jerseyNumber === numValue
    );

    if (isDuplicateNumber) {
      setError("Ce numéro de maillot est déjà utilisé.");
      return;
    }

    // Check for duplicate name
    const trimmedName = name.trim();
    const isDuplicateName = allPlayers.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicateName) {
      setError("Un joueur avec ce nom existe déjà.");
      return;
    }

    onAdd();
  };

  const isValid = name && number;

  return (
    <View
      style={[styles.addPlayerSection, { borderTopColor: colors.borderColor }]}
    >
      <Text style={[styles.addPlayerTitle, { color: colors.textPrimary }]}>
        {MATCH_CREATION_BUTTON_LABELS.ADD_REINFORCEMENT}
      </Text>
      <View style={styles.addPlayerForm}>
        <TextInput
          placeholder="Nom"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={(text) => {
            onNameChange(text);
            setError(null);
          }}
          style={[
            styles.addPlayerInput,
            styles.addPlayerInputName,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: error ? "#ef4444" : colors.borderColor,
              color: colors.textPrimary,
            },
          ]}
        />
        <TextInput
          placeholder="#"
          placeholderTextColor={colors.textSecondary}
          value={number}
          onChangeText={handleNumberChange}
          keyboardType="number-pad"
          maxLength={2}
          style={[
            styles.addPlayerInput,
            styles.addPlayerInputNumber,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: error ? "#ef4444" : colors.borderColor,
              color: colors.textPrimary,
            },
          ]}
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!isValid}
          style={[
            styles.addPlayerButton,
            {
              backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[900],
              opacity: isValid ? 1 : OPACITY.disabled,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={COMMON_COLORS.white}
          />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  addPlayerSection: {
    paddingTop: 24,
    marginTop: 24,
    borderTopWidth: 1,
  },
  addPlayerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  addPlayerForm: {
    flexDirection: "row",
    gap: 8,
  },
  addPlayerInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addPlayerInputName: {
    flex: 1,
  },
  addPlayerInputNumber: {
    width: 64,
    textAlign: "center",
  },
  addPlayerButton: {
    width: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 8,
  },
});
