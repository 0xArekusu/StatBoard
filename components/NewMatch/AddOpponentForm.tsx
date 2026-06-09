import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import { useResponsive } from "../../src/hooks/useResponsive";
import type { Player } from "../../models/Player";

interface AddOpponentFormProps {
  playerName: string;
  playerNumber: string;
  playerLicense: string;
  onNameChange: (text: string) => void;
  onNumberChange: (text: string) => void;
  onLicenseChange: (text: string) => void;
  onAdd: () => void;
  existingPlayers?: Player[];
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

export const AddOpponentForm: React.FC<AddOpponentFormProps> = ({
  playerName,
  playerNumber,
  playerLicense,
  onNameChange,
  onNumberChange,
  onLicenseChange,
  onAdd,
  existingPlayers = [],
  colors,
}) => {
  const [error, setError] = useState<string | null>(null);
  const { sp, font, sizes } = useResponsive();

  const handleNumberChange = (text: string) => {
    onNumberChange(text);
    setError(null);
  };

  const handleAdd = () => {
    setError(null);
    const numValue = parseInt(playerNumber, 10);
    const isDuplicate = existingPlayers.some((p) => p.jerseyNumber === numValue);
    if (isDuplicate) {
      setError("Ce numéro de maillot est déjà utilisé.");
      return;
    }
    onAdd();
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: font.md, marginBottom: sp.sm + sp.xs }]}>
        Ajouter un joueur
      </Text>
      <View style={[styles.row, { gap: sp.sm, marginBottom: sp.sm }]}>
        <TextInput
          placeholder="Nom (Optionnel)"
          placeholderTextColor={colors.textSecondary}
          value={playerName}
          onChangeText={(text) => { onNameChange(text); setError(null); }}
          style={[
            styles.input,
            styles.inputName,
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
          value={playerNumber}
          onChangeText={handleNumberChange}
          keyboardType="number-pad"
          maxLength={2}
          style={[
            styles.input,
            styles.inputNumber,
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
          disabled={!playerNumber}
          style={[
            styles.button,
            {
              backgroundColor: BRAND_COLORS[600],
              opacity: playerNumber ? 1 : OPACITY.disabled,
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
        placeholder="VTXXXXXX (Optionnel)"
        placeholderTextColor={colors.textSecondary}
        value={playerLicense}
        onChangeText={onLicenseChange}
        autoCapitalize="characters"
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceColor,
            borderColor: colors.borderColor,
            color: colors.textPrimary,
            padding: sp.sm + sp.xs,
            borderRadius: sp.sm,
            fontSize: font.md,
          },
        ]}
      />
      {error && <Text style={[styles.errorText, { fontSize: font.sm, marginTop: sp.sm }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {},
  title: {
    fontSize: 14,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  inputName: {
    flex: 1,
  },
  inputNumber: {
    width: 64,
    textAlign: "center",
  },
  button: {
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
