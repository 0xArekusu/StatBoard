/**
 * Team Selector Component
 *
 * Displays the selected team for the match.
 * For guest users, allows manual team name input.
 */

import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { STATUS_COLORS } from "../../src/theme";
import { MATCH_CREATION_FORM_LABELS, MATCH_CREATION_INFO_MESSAGES } from "../../constants";
import { useResponsive } from "../../src/hooks/useResponsive";
import type { Team } from "../../models/Team";

interface TeamSelectorProps {
  /** Selected team */
  team: Team | null;
  /** Available teams */
  teams: Team[];
  /** Team name for guest users */
  myTeamName?: string;
  /** Callback when guest user changes team name */
  onMyTeamNameChange?: (name: string) => void;
  /** Is guest mode */
  isGuest?: boolean;
  /** Theme colors */
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

/**
 * Displays the selected team (read-only for authenticated users, editable for guests)
 */
export const TeamSelector: React.FC<TeamSelectorProps> = ({
  team,
  teams,
  myTeamName,
  onMyTeamNameChange,
  isGuest = false,
  colors,
}) => {
  const { sp, font } = useResponsive();

  return (
    <View style={[styles.formSection, { marginBottom: sp.lg }]}>
      <Text style={[styles.formLabel, { color: colors.textSecondary, fontSize: font.xs, marginBottom: sp.sm }]}>
        {MATCH_CREATION_FORM_LABELS.MY_TEAM}
      </Text>
      {isGuest ? (
        // Guest mode: editable text input
        <TextInput
          style={[
            styles.formInput,
            styles.textInput,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: colors.borderColor,
              color: colors.textPrimary,
              padding: sp.md,
              fontSize: font.md,
            },
          ]}
          value={myTeamName}
          onChangeText={onMyTeamNameChange}
          placeholder="Nom de votre équipe"
          placeholderTextColor={colors.textSecondary}
        />
      ) : teams.length > 0 ? (
        // Authenticated mode: display team name (read-only)
        <View
          style={[
            styles.formInput,
            { backgroundColor: colors.surfaceColor, borderColor: colors.borderColor, padding: sp.md },
          ]}
        >
          <Text style={[styles.formInputText, { color: colors.textPrimary, fontSize: font.md }]}>
            {team?.name || "Équipe non trouvée"}
          </Text>
        </View>
      ) : (
        // No teams available
        <View
          style={[
            styles.alertBox,
            {
              backgroundColor: STATUS_COLORS.errorBackground,
              borderColor: STATUS_COLORS.error,
              gap: sp.sm,
              padding: sp.sm,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="alert-circle"
            size={16}
            color={STATUS_COLORS.error}
          />
          <Text style={[styles.alertText, { color: STATUS_COLORS.errorLight, fontSize: font.md }]}>
            {MATCH_CREATION_INFO_MESSAGES.NO_TEAM_CREATED}
          </Text>
        </View>
      )}
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
  },
  formInputText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  textInput: {
    fontSize: 14,
    fontWeight: "bold",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    fontSize: 14,
  },
});
