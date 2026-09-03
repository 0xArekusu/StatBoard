import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Match } from "../../src/models/types";
import { OPACITY } from "../../src/theme";
import { ThemeColors } from "../../src/theme/colors";
import { useResponsive } from "../../src/hooks/useResponsive";

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
  const { t } = useTranslation();
  const { isCompact, sp, font } = useResponsive();

  return (
    <View style={[styles.section, { marginBottom: sp.lg }]}>
      {/* Header */}
      <View style={[styles.sectionHeader, { marginBottom: sp.md }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: font.xl }]}>
          {t("dashboardRecentMatches.title")}
        </Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={[styles.sectionLink, { color: colors.primary }]}>
            {t("dashboardRecentMatches.viewAll")}
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

            // Determine display order based on home/away
            // Home team always on the left
            const leftScore = match.is_home ? scoreA : scoreB;
            const rightScore = match.is_home ? scoreB : scoreA;
            const leftTeam = match.is_home ? (match.my_team_name || t("liveMatchModals.myTeamFallback")) : match.opponent_name;
            const rightTeam = match.is_home ? match.opponent_name : (match.my_team_name || t("liveMatchModals.myTeamFallback"));

            return (
              <TouchableOpacity
                key={`match-${match.id}-${index}`}
                style={[
                  styles.matchCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    padding: sp.md,
                  },
                ]}
                onPress={() => onMatchPress(match)}
                activeOpacity={OPACITY.interaction.low}
              >
                {/* Left side: indicator + match info */}
                <View style={[styles.matchCardLeft, { gap: sp.md }]}>
                  <View
                    style={[
                      styles.matchIndicator,
                      {
                        backgroundColor: isWin ? colors.success : colors.error,
                      },
                    ]}
                  />
                  <View style={styles.matchInfo}>
                    <Text style={[styles.matchScore, { color: colors.text.primary, fontSize: font.xl }]}>
                      {leftScore} - {rightScore}
                    </Text>
                    <View style={styles.matchTeamsLine}>
                      <Text
                        style={[styles.matchTeamLeft, { color: colors.text.secondary }]}
                        numberOfLines={1}
                      >
                        {leftTeam}
                      </Text>
                      <Text
                        style={[styles.matchVs, { color: colors.text.tertiary }]}
                      >
                        {t("dashboardRecentMatches.vs")}
                      </Text>
                      <Text
                        style={[styles.matchTeamRight, { color: colors.text.secondary }]}
                        numberOfLines={1}
                      >
                        {rightTeam}
                      </Text>
                    </View>
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
                      {isWin ? t("dashboardRecentMatches.win") : t("dashboardRecentMatches.loss")}
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
              {t("dashboardRecentMatches.emptyState")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
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
    borderRadius: 12,
    borderWidth: 1,
  },
  matchCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  matchIndicator: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  matchInfo: {
    flex: 1,
    gap: 4,
  },
  matchScore: {
    fontWeight: "bold",
  },
  matchTeamsLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchTeamLeft: {
    fontSize: 12,
  },
  matchTeamRight: {
    fontSize: 12,
  },
  matchVs: {
    fontSize: 11,
    fontWeight: "500",
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
