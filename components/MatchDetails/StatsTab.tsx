/**
 * StatsTab Component
 *
 * Displays the statistics table for a match with sortable columns
 * and player details navigation.
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
import {
  PlayerStats,
  SortBy,
  SortOrder,
} from "../../constants/matchDetailsConstants";
import PlayerAvatar from "../PlayerAvatar";

interface StatsTabProps {
  stats: PlayerStats[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  handleSort: (column: SortBy) => void;
  setViewPlayer: (player: PlayerStats) => void;
}

export default function StatsTab({
  stats,
  sortBy,
  sortOrder,
  handleSort,
  setViewPlayer,
}: StatsTabProps) {
  const { colors, isDark } = useTheme();

  // Define color variables using theme context
  const bgColor = colors.background;
  const surfaceColor = colors.surface;
  const borderColor = colors.border;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View
        style={[
          styles.tableContainer,
          { backgroundColor: surfaceColor, borderColor: borderColor },
        ]}
      >
        {/* Table Header */}
        <View
          style={[
            styles.tableHeader,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <TouchableOpacity onPress={() => handleSort("name")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.playerCell,
                {
                  color:
                    sortBy === "name" ? colors.primary : textSecondary,
                },
              ]}
            >
              JOUEUR{" "}
              {sortBy === "name" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("min")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.minCell,
                {
                  color:
                    sortBy === "min" ? colors.primary : textTertiary,
                },
              ]}
            >
              MIN {sortBy === "min" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("pts")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "pts" ? colors.primary : textSecondary,
                },
              ]}
            >
              PTS {sortBy === "pts" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("fgm")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCellWide,
                {
                  color:
                    sortBy === "fgm" ? colors.primary : textSecondary,
                },
              ]}
            >
              TIRS{" "}
              {sortBy === "fgm" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("fg2m")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCellWide,
                {
                  color:
                    sortBy === "fg2m" ? colors.primary : textSecondary,
                },
              ]}
            >
              2PTS{" "}
              {sortBy === "fg2m" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("fg3m")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCellWide,
                {
                  color:
                    sortBy === "fg3m" ? colors.primary : textSecondary,
                },
              ]}
            >
              3PTS{" "}
              {sortBy === "fg3m" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("ftm")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCellWide,
                {
                  color:
                    sortBy === "ftm" ? colors.primary : textSecondary,
                },
              ]}
            >
              LF {sortBy === "ftm" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("reb")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "reb" ? colors.primary : textSecondary,
                },
              ]}
            >
              REB {sortBy === "reb" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("reb_off" as SortBy)}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "reb_off"
                      ? colors.primary
                      : textSecondary,
                },
              ]}
            >
              RO{" "}
              {sortBy === "reb_off" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("reb_def" as SortBy)}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "reb_def"
                      ? colors.primary
                      : textSecondary,
                },
              ]}
            >
              RD{" "}
              {sortBy === "reb_def" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("ast")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "ast" ? colors.primary : textSecondary,
                },
              ]}
            >
              AST {sortBy === "ast" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("stl")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "stl" ? colors.primary : textSecondary,
                },
              ]}
            >
              INT {sortBy === "stl" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("blk")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "blk" ? colors.primary : textSecondary,
                },
              ]}
            >
              CTR {sortBy === "blk" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("to")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "to" ? colors.primary : textSecondary,
                },
              ]}
            >
              BP {sortBy === "to" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("pf")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "pf" ? colors.primary : textSecondary,
                },
              ]}
            >
              FT {sortBy === "pf" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort("eff")}>
            <Text
              style={[
                styles.tableHeaderCell,
                styles.statCell,
                {
                  color:
                    sortBy === "eff" ? colors.primary : textSecondary,
                },
              ]}
            >
              EFF {sortBy === "eff" && (sortOrder === "desc" ? "↓" : "↑")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Table Body */}
        {stats.map((player, index) => (
          <TouchableOpacity
            key={`${player.team}-${player.playerNumber}-${index}`}
            onPress={() => setViewPlayer(player)}
            style={[
              styles.tableRow,
              { borderBottomColor: borderColor },
              index === stats.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.playerCell}>
              <PlayerAvatar
                playerName={player.name}
                playerNumber={player.playerNumber}
                photoUrl={player.photoUrl}
                size={24}
                borderColor={borderColor}
                backgroundColor={bgColor}
                textColor={textSecondary}
                borderWidth={0}
              />
              <Text
                style={[styles.playerNameText, { color: textPrimary }]}
                numberOfLines={1}
              >
                {player.name}
              </Text>
            </View>
            <Text
              style={[
                styles.tableCell,
                styles.minCell,
                { color: textTertiary },
              ]}
            >
              {player.min}'
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                styles.statCellBold,
                { color: textPrimary },
              ]}
            >
              {player.pts}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {player.fgm}/{player.fga}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {player.fg2m}/{player.fg2a}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {player.fg3m}/{player.fg3a}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {player.ftm}/{player.fta}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.reb}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.reb_off}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.reb_def}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.ast}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.stl}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.blk}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.to}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {player.pf}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                styles.statCellBold,
                { color: colors.primary },
              ]}
            >
              {player.eff}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Total Row */}
        {stats.length > 0 && (
          <View
            style={[
              styles.tableRow,
              styles.totalRow,
              {
                backgroundColor: colors.surfaceVariant,
                borderBottomWidth: 0,
              },
            ]}
          >
            <View style={styles.playerCell}>
              <Text
                style={[
                  styles.playerNameText,
                  styles.totalText,
                  { color: textPrimary },
                ]}
              >
                TOTAL
              </Text>
            </View>
            <Text
              style={[
                styles.tableCell,
                styles.minCell,
                { color: textTertiary },
              ]}
            >
              -
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                styles.statCellBold,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.pts, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.fgm, 0)}/
              {stats.reduce((sum, p) => sum + p.fga, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.fg2m, 0)}/
              {stats.reduce((sum, p) => sum + p.fg2a, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.fg3m, 0)}/
              {stats.reduce((sum, p) => sum + p.fg3a, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCellWide,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.ftm, 0)}/
              {stats.reduce((sum, p) => sum + p.fta, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.reb, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.reb_off, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.reb_def, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.ast, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.stl, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.blk, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.to, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                { color: textPrimary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.pf, 0)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.statCell,
                styles.statCellBold,
                { color: colors.primary },
              ]}
            >
              {stats.reduce((sum, p) => sum + p.eff, 0)}
            </Text>
          </View>
        )}

        {stats.length === 0 && (
          <View style={styles.emptyState}>
            <Text
              style={[styles.emptyStateText, { color: textTertiary }]}
            >
              Aucune donnée disponible
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 80,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 12,
  },
  playerCell: {
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumberBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  minCell: {
    width: 40,
    textAlign: "center",
  },
  statCell: {
    width: 40,
    textAlign: "center",
  },
  statCellWide: {
    width: 60,
    textAlign: "center",
    fontSize: 11,
  },
  statCellBold: {
    fontWeight: "900",
  },
  totalRow: {},
  totalText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 12,
  },
});
