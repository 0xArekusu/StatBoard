import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import { useResponsive } from "../../src/hooks/useResponsive";

interface AddOpponentFormProps {
  playerName: string;
  playerNumber: string;
  playerLicense: string;
  onNameChange: (text: string) => void;
  onNumberChange: (text: string) => void;
  onLicenseChange: (text: string) => void;
  onAdd: () => void;
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
  colors,
}) => {
  const { sp, font, sizes } = useResponsive();

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
          onChangeText={onNameChange}
          style={[
            styles.input,
            styles.inputName,
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
        <TextInput
          placeholder="#"
          placeholderTextColor={colors.textSecondary}
          value={playerNumber}
          onChangeText={onNumberChange}
          keyboardType="number-pad"
          maxLength={2}
          style={[
            styles.input,
            styles.inputNumber,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: colors.borderColor,
              color: colors.textPrimary,
              padding: sp.sm + sp.xs,
              borderRadius: sp.sm,
              fontSize: font.md,
              width: sp.xxl * 2,
            },
          ]}
        />
        <TouchableOpacity
          onPress={onAdd}
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
        placeholder="VTXXXXXX"
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
});
