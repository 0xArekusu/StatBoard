/**
 * Add Player Form Component
 *
 * Form to add a temporary player (reinforcement) to the roster.
 */

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import { MATCH_CREATION_BUTTON_LABELS } from "../../constants";
import type { Player } from "../../models/Player";
import { useResponsive } from "../../src/hooks/useResponsive";

interface AddPlayerFormProps {
  /** Player name input value */
  name: string;
  /** Player number input value */
  number: string;
  /** Player license number input value */
  license: string;
  /** Callback when name changes */
  onNameChange: (text: string) => void;
  /** Callback when number changes */
  onNumberChange: (text: string) => void;
  /** Callback when license changes */
  onLicenseChange: (text: string) => void;
  /** Callback when add button is pressed */
  onAdd: () => void;
  /** All available players (unused for duplicate check) */
  allPlayers?: Player[];
  /** Selected players only — used for duplicate number check */
  selectedPlayers?: Player[];
  /** Remove top border/margin/padding — use when rendered in a sticky container */
  compact?: boolean;
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
  license,
  onNameChange,
  onNumberChange,
  onLicenseChange,
  onAdd,
  allPlayers = [],
  selectedPlayers,
  compact,
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

    // Check for duplicate number only among selected players
    const playersToCheck = selectedPlayers ?? allPlayers;
    const isDuplicateNumber = playersToCheck.some(
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
  const { sp, font, sizes } = useResponsive();

  return (
    <View
      style={[
        styles.addPlayerSection,
        !compact && { borderTopColor: colors.borderColor, paddingTop: sp.lg, marginTop: sp.lg, borderTopWidth: 1 },
      ]}
    >
      <Text style={[styles.addPlayerTitle, { color: colors.textPrimary, fontSize: font.md, marginBottom: sp.sm + sp.xs }]}>
        {MATCH_CREATION_BUTTON_LABELS.ADD_REINFORCEMENT}
      </Text>
      <View style={[styles.addPlayerForm, { gap: sp.sm }]}>
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
              padding: sp.sm + sp.xs,
              borderRadius: sp.sm,
              fontSize: font.md,
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
              padding: sp.sm + sp.xs,
              borderRadius: sp.sm,
              fontSize: font.md,
              width: sp.xxl * 2,
            },
          ]}
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!isValid}
          style={[
            styles.addPlayerButton,
            {
              backgroundColor: BRAND_COLORS[600],
              opacity: isValid ? 1 : OPACITY.disabled,
              width: sp.xxl * 1.5,
              borderRadius: sp.sm,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={sizes.iconMd}
            color={COMMON_COLORS.white}
          />
        </TouchableOpacity>
      </View>
      <TextInput
        placeholder="VTXXXXXX"
        placeholderTextColor={colors.textSecondary}
        value={license}
        onChangeText={onLicenseChange}
        autoCapitalize="characters"
        style={[
          styles.addPlayerInput,
          {
            backgroundColor: colors.surfaceColor,
            borderColor: colors.borderColor,
            color: colors.textPrimary,
            padding: sp.sm + sp.xs,
            borderRadius: sp.sm,
            fontSize: font.md,
            marginTop: sp.sm,
          },
        ]}
      />
      {error && <Text style={[styles.errorText, { fontSize: font.sm, marginTop: sp.sm }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  addPlayerSection: {},
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
