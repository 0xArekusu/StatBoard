/**
 * Opponent Input Component
 *
 * Text input for entering the opponent team name.
 */

import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { STATUS_COLORS } from "../../src/theme";
import { MATCH_CREATION_FORM_LABELS } from "../../constants";

interface OpponentInputProps {
  /** Opponent team name */
  value: string;
  /** Callback when text changes */
  onChangeText: (text: string) => void;
  /** Theme colors */
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

/**
 * Input field for opponent team name (required field)
 */
export const OpponentInput: React.FC<OpponentInputProps> = ({
  value,
  onChangeText,
  colors,
}) => {
  return (
    <View style={styles.formSection}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
        {MATCH_CREATION_FORM_LABELS.OPPONENT}{" "}
        <Text style={{ color: STATUS_COLORS.required }}>*</Text>
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Nom de l'équipe adverse"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.formInput,
          {
            backgroundColor: colors.surfaceColor,
            borderColor: colors.borderColor,
            color: colors.textPrimary,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  formInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: "bold",
  },
});
