import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Match } from "../../src/models/types";
import { OPACITY } from "../../src/theme";
import { ThemeColors } from "../../src/theme/colors";

interface DashboardRecentMatchesProps {
  matches: Match[];
  colors: ThemeColors;
  onMatchPress: (match: Match) => void;
  onViewAllPress: () => void;
  formatDate: (dateString: string) => string;
}

/**
 * DashboardRecentMatches - Displays the last 3 completed matches
 * Shows empty state when no matches are available
 */
export default function DashboardRecentMatches({
  matches,
  colors,
  onMatchPress,
  onViewAllPress,
  formatDate,
}: DashboardRecentMatchesProps) {
  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Derniers Matchs
        </Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={[styles.sectionLink, { color: colors.primary }]}>
            Voir tout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Matches List */}
      <View style={styles.matchesList}>
        {matches.length > 0 ? (
          matches.map((match, index) => {
            const scoreA = match.my_team_score || 0;
            const scoreB = match.opponent_score || 0;
            const isWin = scoreA > scoreB;

            return (
              <TouchableOpacity
                key={`match-${match.id}-${index}`}
                style={[
                  styles.matchCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onMatchPress(match)}
                activeOpacity={OPACITY.interaction.low}
              >
                {/* Left side: indicator + match info */}
                <View style={styles.matchCardLeft}>
                  <View
                    style={[
                      styles.matchIndicator,
                      {
                        backgroundColor: isWin ? colors.success : colors.error,
                      },
                    ]}
                  />
                  <View style={styles.matchInfo}>
                    <View style={styles.matchScoreLine}>
                      <Text style={[styles.matchScore, { color: colors.text.primary }]}>
                        {scoreA} - {scoreB}
                      </Text>
                      <View
                        style={[
                          styles.matchTeamBadge,
                          {
                            backgroundColor: colors.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.matchTeamBadgeText,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {match.my_team_name || "Nous"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.matchOpponent, { color: colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      vs {match.opponent_name}
                    </Text>
                  </View>
                </View>

                {/* Right side: date + result badge */}
                <View style={styles.matchCardRight}>
                  <Text style={[styles.matchDate, { color: colors.text.tertiary }]}>
                    {formatDate(match.ended_at || match.created_at)}
                  </Text>
                  <View
                    style={[
                      styles.matchResultBadge,
                      {
                        backgroundColor: `${isWin ? colors.success : colors.error}${OPACITY.gradient.low}`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.matchResultText,
                        { color: isWin ? colors.success : colors.error },
                      ]}
                    >
                      {isWin ? "VICTOIRE" : "DÉFAITE"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-blank"
              size={32}
              color={colors.text.secondary}
              style={{ opacity: OPACITY.disabled }}
            />
            <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
              Aucun match récent
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  matchesList: {
    gap: 12,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  matchCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 16,
  },
  matchIndicator: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  matchInfo: {
    flex: 1,
  },
  matchScoreLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  matchScore: {
    fontSize: 16,
    fontWeight: "bold",
  },
  matchTeamBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchTeamBadgeText: {
    fontSize: 10,
  },
  matchOpponent: {
    fontSize: 12,
  },
  matchCardRight: {
    alignItems: "flex-end",
  },
  matchDate: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  matchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchResultText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 8,
  },
});
