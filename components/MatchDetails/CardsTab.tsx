/**
 * Cards Tab Component
 *
 * Displays player statistics in a card-based layout with sorting capabilities
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import {
  PlayerStats,
  SortBy,
  SortOrder,
} from "../../constants/matchDetailsConstants";
import { ShootingBar } from "./SharedComponents";
import { SHOOTING_BAR_COLORS } from "../../src/theme/colors";
import PlayerAvatar from "../PlayerAvatar";

// ===========================
// PROPS INTERFACE
// ===========================

interface CardsTabProps {
  stats: PlayerStats[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  handleSort: (column: SortBy) => void;
  setViewPlayer: (player: PlayerStats) => void;
}

// ===========================
// COMPONENT
// ===========================

export default function CardsTab({
  stats,
  sortBy,
  sortOrder,
  handleSort,
  setViewPlayer,
}: CardsTabProps) {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes, isCompact } = useResponsive();

  // Theme colors
  const textPrimary = isDark ? colors.text.primary : colors.text.primary;
  const textSecondary = isDark ? colors.text.secondary : colors.text.secondary;
  const textTertiary = isDark ? colors.text.tertiary : colors.text.secondary;
  const surfaceColor = isDark ? colors.surface : colors.surface;
  const borderColor = isDark ? colors.surfaceVariant : colors.border;
  const bgColor = isDark ? colors.background : colors.surface;

  return (
    <View style={[styles.cardsContainer, { padding: sp.md }]}>
      {/* Sort Chips */}
      <View style={[styles.cardsSortSection, { marginBottom: sp.md }]}>
        <Text style={[styles.courtFilterLabel, { color: textTertiary, fontSize: font.xs, marginBottom: sp.sm }]}>
          TRIER PAR
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.courtFilterScroll}
        >
          <View style={[styles.courtFilterButtonsRow, { gap: sp.sm }]}>
            <TouchableOpacity
              onPress={() => handleSort("name")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "name"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "name" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "name"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Nom{" "}
                {sortBy === "name" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("pts")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "pts"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "pts" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "pts"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Points{" "}
                {sortBy === "pts" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("reb")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "reb"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "reb" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "reb"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Rebonds{" "}
                {sortBy === "reb" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("ast")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "ast"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "ast" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "ast"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Passes{" "}
                {sortBy === "ast" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("stl")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "stl"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "stl" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "stl"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Interceptions{" "}
                {sortBy === "stl" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("blk")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "blk"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "blk" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "blk"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Contres{" "}
                {sortBy === "blk" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("pm")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "pm"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "pm" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "pm"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                +/-{" "}
                {sortBy === "pm" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("eff")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "eff"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "eff" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "eff"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Évaluation{" "}
                {sortBy === "eff" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("fgm")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "fgm"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "fgm" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "fgm"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Tirs{" "}
                {sortBy === "fgm" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("fg2m")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "fg2m"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "fg2m" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "fg2m"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                2 Points{" "}
                {sortBy === "fg2m" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("fg3m")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "fg3m"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "fg3m" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "fg3m"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                3 Points{" "}
                {sortBy === "fg3m" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSort("ftm")}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    sortBy === "ftm"
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    sortBy === "ftm" ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      sortBy === "ftm"
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Lancers francs{" "}
                {sortBy === "ftm" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {stats.map((player, index) => (
        <TouchableOpacity
          key={`${player.team}-${player.playerNumber}-${index}`}
          onPress={() => setViewPlayer(player)}
          style={[
            styles.playerCard,
            {
              backgroundColor: surfaceColor,
              borderColor: borderColor,
            },
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardPlayerInfo}>
              <PlayerAvatar
                playerName={player.name}
                playerNumber={player.playerNumber}
                photoUrl={player.photoUrl}
                size={isCompact ? 40 : 56}
                borderColor={borderColor}
                backgroundColor={bgColor}
                textColor={textPrimary}
                borderWidth={2}
              />
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  style={[styles.cardPlayerName, { color: textPrimary, fontSize: isCompact ? 16 : 20 }]}
                >
                  {player.name}
                </Text>
                <Text
                  style={[
                    styles.cardPlayerNumber,
                    { color: textSecondary },
                  ]}
                >
                  #{player.playerNumber}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.cardPointsBadge,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.cardPointsValue,
                  { color: colors.primary },
                ]}
              >
                {player.pts}
              </Text>
              <Text
                style={[
                  styles.cardPointsLabel,
                  { color: colors.primary },
                ]}
              >
                Points
              </Text>
            </View>
          </View>

          {/* Shooting Bars */}
          <View style={styles.cardShootingBars}>
            <ShootingBar
              label="3 PTS"
              made={player.fg3m}
              attempted={player.fg3a}
              color={SHOOTING_BAR_COLORS.threePoint}
              compact
            />
            <ShootingBar
              label="2 PTS"
              made={player.fg2m}
              attempted={player.fg2a}
              color={SHOOTING_BAR_COLORS.twoPoint}
              compact
            />
            <ShootingBar
              label="Lancers"
              made={player.ftm}
              attempted={player.fta}
              color={SHOOTING_BAR_COLORS.freeThrow}
              compact
            />
          </View>

          {/* Stats Grid */}
          <View style={[styles.cardStatsGrid, { borderTopColor: borderColor }]}>
            {/* Ligne 1 */}
            <View style={styles.cardStatsRow}>
              {[
                { label: "MIN",         value: player.min },
                { label: "REB OFF/DEF", value: `${player.reb_off}/${player.reb_def}` },
                { label: "AST",         value: player.ast },
                { label: "INT",         value: player.stl },
                { label: "CTR",         value: player.blk },
              ].map(({ label, value }) => (
                <View key={label} style={[styles.cardStatItem, { backgroundColor: isDark ? colors.surfaceVariant : colors.surface }]}>
                  <Text style={[styles.cardStatLabel, { color: textTertiary }]}>{label}</Text>
                  <Text style={[styles.cardStatValue, { color: textPrimary }]}>{value}</Text>
                </View>
              ))}
            </View>
            {/* Ligne 2 */}
            <View style={styles.cardStatsRow}>
              <View style={[styles.cardStatItem, { backgroundColor: isDark ? colors.surfaceVariant : colors.surface }]}>
                <Text style={[styles.cardStatLabel, { color: textTertiary }]}>BP</Text>
                <Text style={[styles.cardStatValue, { color: textPrimary }]}>{player.to}</Text>
              </View>
              <View style={[styles.cardStatItem, { backgroundColor: isDark ? colors.surfaceVariant : colors.surface }]}>
                <Text style={[styles.cardStatLabel, { color: textTertiary }]}>FT</Text>
                <Text style={[styles.cardStatValue, { color: textPrimary }]}>{player.pf}</Text>
              </View>
              <View style={[styles.cardStatItem, { backgroundColor: isDark ? colors.surfaceVariant : colors.surface }]}>
                <Text style={[styles.cardStatLabel, { color: textTertiary }]}>FP</Text>
                <Text style={[styles.cardStatValue, { color: textPrimary }]}>{player.fd}</Text>
              </View>
              <View style={[styles.cardStatItem, { backgroundColor: isDark ? colors.surfaceVariant : colors.surface }]}>
                <Text style={[styles.cardStatLabel, { color: textTertiary }]}>+/-</Text>
                <Text style={[styles.cardStatValue, { color: player.pm > 0 ? "#4CAF50" : player.pm < 0 ? "#F44336" : textPrimary }]}>
                  {player.pm > 0 ? `+${player.pm}` : player.pm}
                </Text>
              </View>
              <View style={[styles.cardStatItem, { backgroundColor: isDark ? colors.surfaceVariant : colors.surface }]}>
                <Text style={[styles.cardStatLabel, { color: textTertiary }]}>ÉVAL</Text>
                <Text style={[styles.cardStatValue, { color: colors.primary }]}>{player.eff}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {stats.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: textTertiary }]}>
            Aucune statistique.
          </Text>
        </View>
      )}
    </View>
  );
}

// ===========================
// STYLES
// ===========================

const styles = StyleSheet.create({
  cardsContainer: {
    gap: 16,
    marginBottom: 80,
  },
  cardsSortSection: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  playerCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardPlayerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: {
    fontSize: 20,
    fontWeight: "900",
  },
  cardPlayerName: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  cardPlayerNumber: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  cardPointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-end",
  },
  cardPointsValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 28,
    alignSelf: "center",
  },
  cardPointsLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardShootingBars: {
    gap: 8,
    marginBottom: 20,
  },
  cardStatsGrid: {
    flexDirection: "column",
    gap: 4,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cardStatsRow: {
    flexDirection: "row",
    gap: 4,
  },
  cardStatItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 4,
  },
  cardStatLabel: {
    fontSize: 8,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardStatValue: {
    fontSize: 14,
    fontWeight: "900",
  },
  courtFilterLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  courtFilterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  courtFilterButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  courtFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  courtFilterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 12,
  },
});
