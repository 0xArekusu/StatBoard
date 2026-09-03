import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { SLATE_COLORS, COMMON_COLORS } from "../../src/theme";
import { Colors } from "../../src/theme/colors";

interface JoinClubFormProps {
  clubCode: string;
  setClubCode: (code: string) => void;
  onSubmit: () => void;
}

export default function JoinClubForm({
  clubCode,
  setClubCode,
  onSubmit,
}: JoinClubFormProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { sp, font } = useResponsive();

  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];
  const requiredColor = isDark ? Colors.dark.required : Colors.light.required;

  return (
    <View style={[styles.formContainer, { gap: sp.lg }]}>
      <View style={[styles.formSection, { gap: sp.sm }]}>
        <Text style={[styles.formLabel, { color: textSecondary, fontSize: font.xs }]}>
          {t("joinClubForm.codeLabel")} <Text style={{ color: requiredColor }}>*</Text>
        </Text>
        <TextInput
          placeholder={t("joinClubForm.codePlaceholder")}
          placeholderTextColor={textSecondary}
          value={clubCode}
          onChangeText={(value) => setClubCode(value.toUpperCase())}
          style={[
            styles.formInput,
            styles.codeInput,
            {
              backgroundColor: surfaceColor,
              borderColor,
              color: textPrimary,
              padding: sp.md,
              fontSize: font.xl,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.infoBox,
          {
            backgroundColor: isDark
              ? `${SLATE_COLORS[800]}80`
              : SLATE_COLORS[100],
            borderColor,
            padding: sp.md,
          },
        ]}
      >
        <Text style={[styles.infoText, { color: textSecondary, fontSize: font.sm }]}>
          {t("joinClubForm.infoText")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 24,
  },
  formSection: {
    gap: 8,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  formInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "bold",
  },
  codeInput: {
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 4,
    fontSize: 18,
    fontFamily: "monospace",
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
  },
});
