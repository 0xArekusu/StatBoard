/**
 * Team Selector Component
 *
 * Displays the selected team for the match.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { STATUS_COLORS } from "../../src/theme";
import { MATCH_CREATION_FORM_LABELS, MATCH_CREATION_INFO_MESSAGES } from "../../constants";
import type { Team } from "../../models/Team";

interface TeamSelectorProps {
  /** Selected team */
  team: Team | null;
  /** Available teams */
  teams: Team[];
  /** Theme colors */
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

/**
 * Displays the selected team (read-only, team is pre-selected from route params or defaults to first team)
 */
export const TeamSelector: React.FC<TeamSelectorProps> = ({
  team,
  teams,
  colors,
}) => {
  return (
    <View style={styles.formSection}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
        {MATCH_CREATION_FORM_LABELS.MY_TEAM}
      </Text>
      {teams.length > 0 ? (
        <View
          style={[
            styles.formInput,
            { backgroundColor: colors.surfaceColor, borderColor: colors.borderColor },
          ]}
        >
          <Text style={[styles.formInputText, { color: colors.textPrimary }]}>
            {team?.name || "Équipe non trouvée"}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.alertBox,
            {
              backgroundColor: STATUS_COLORS.errorBackground,
              borderColor: STATUS_COLORS.error,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="alert-circle"
            size={16}
            color={STATUS_COLORS.error}
          />
          <Text style={[styles.alertText, { color: STATUS_COLORS.errorLight }]}>
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
