/**
 * Add Player Form Component
 *
 * Form to add a temporary player (reinforcement) to the roster.
 */

import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SLATE_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import { MATCH_CREATION_BUTTON_LABELS } from "../../constants";

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
  isDark,
  colors,
}) => {
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
          onChangeText={onNameChange}
          style={[
            styles.addPlayerInput,
            styles.addPlayerInputName,
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
          value={number}
          onChangeText={onNumberChange}
          keyboardType="number-pad"
          style={[
            styles.addPlayerInput,
            styles.addPlayerInputNumber,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: colors.borderColor,
              color: colors.textPrimary,
            },
          ]}
        />
        <TouchableOpacity
          onPress={onAdd}
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
});
