/**
 * StatsTab Component
 *
 * Displays the statistics table for a match with sortable columns
 * and player details navigation.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import {
  PlayerStats,
  SortBy,
  SortOrder,
} from "../../constants/matchDetailsConstants";
import PlayerAvatar from "../PlayerAvatar";
import StatsLegendModal from "./StatsLegendModal";

interface StatsTabProps {
  stats: PlayerStats[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  handleSort: (column: SortBy) => void;
  setViewPlayer: (player: PlayerStats) => void;
  teamRebounds: number;
  handicap?: number;
}

export default function StatsTab({
  stats,
  sortBy,
  sortOrder,
  handleSort,
  setViewPlayer,
  teamRebounds,
  handicap = 0,
}: StatsTabProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();
  const [showLegend, setShowLegend] = useState(false);

  // Define color variables using theme context
  const bgColor = colors.background;
  const surfaceColor = colors.surface;
  const borderColor = colors.border;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={[styles.scrollViewContent, { padding: sp.sm }]}
      >
        <View
          style={[
            styles.tableContainer,
            {
              backgroundColor: surfaceColor,
              borderColor: borderColor,
              borderRadius: sp.sm,
            },
          ]}
        >
          {/* Table Header */}
          <View
            style={[
              styles.tableHeader,
              {
                backgroundColor: colors.surfaceVariant,
                paddingHorizontal: 16,
                paddingVertical: sp.sm,
              },
            ]}
          >
            <TouchableOpacity onPress={() => handleSort("name")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.playerCell,
                  {
                    color: sortBy === "name" ? colors.primary : textSecondary,
                    fontSize: font.xs,
                  },
                ]}
              >
                JOUEUR {sortBy === "name" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <View style={styles.numberCell}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  {
                    color: textTertiary,
                    textAlign: "center",
                    fontSize: font.xs,
                  },
                ]}
              >
                #
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleSort("min")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.minCell,
                  {
                    color: sortBy === "min" ? colors.primary : textTertiary,
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
                    color: sortBy === "pts" ? colors.primary : textSecondary,
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
                    color: sortBy === "fgm" ? colors.primary : textSecondary,
                  },
                ]}
              >
                TIRS {sortBy === "fgm" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort("fg2m")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCellWide,
                  {
                    color: sortBy === "fg2m" ? colors.primary : textSecondary,
                  },
                ]}
              >
                2PTS {sortBy === "fg2m" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort("fg3m")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCellWide,
                  {
                    color: sortBy === "fg3m" ? colors.primary : textSecondary,
                  },
                ]}
              >
                3PTS {sortBy === "fg3m" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort("ftm")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCellWide,
                  {
                    color: sortBy === "ftm" ? colors.primary : textSecondary,
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
                    color: sortBy === "reb" ? colors.primary : textSecondary,
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
                      sortBy === "reb_off" ? colors.primary : textSecondary,
                  },
                ]}
              >
                RO {sortBy === "reb_off" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort("reb_def" as SortBy)}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCell,
                  {
                    color:
                      sortBy === "reb_def" ? colors.primary : textSecondary,
                  },
                ]}
              >
                RD {sortBy === "reb_def" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.tableHeaderCell, styles.statCell, { color: textSecondary }]}>
              RE
            </Text>
            <TouchableOpacity onPress={() => handleSort("ast")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCell,
                  {
                    color: sortBy === "ast" ? colors.primary : textSecondary,
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
                    color: sortBy === "stl" ? colors.primary : textSecondary,
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
                    color: sortBy === "blk" ? colors.primary : textSecondary,
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
                    color: sortBy === "to" ? colors.primary : textSecondary,
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
                    color: sortBy === "pf" ? colors.primary : textSecondary,
                  },
                ]}
              >
                FT {sortBy === "pf" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort("fd")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCell,
                  {
                    color: sortBy === "fd" ? colors.primary : textSecondary,
                  },
                ]}
              >
                FP {sortBy === "fd" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort("pm")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCell,
                  {
                    color: sortBy === "pm" ? colors.primary : textSecondary,
                  },
                ]}
              >
                +/- {sortBy === "pm" && (sortOrder === "desc" ? "↓" : "↑")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort("eff")}>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.statCell,
                  {
                    color: sortBy === "eff" ? colors.primary : textSecondary,
                  },
                ]}
              >
                EVAL {sortBy === "eff" && (sortOrder === "desc" ? "↓" : "↑")}
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
                  {player.name}{!player.isSubstitute ? " ★" : ""}
                </Text>
              </View>
              <Text
                style={[
                  styles.tableCell,
                  styles.numberCell,
                  { color: textSecondary },
                ]}
              >
                {player.playerNumber}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.minCell,
                  { color: textTertiary },
                ]}
              >
                {player.min}
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
              <Text style={[styles.tableCell, styles.statCell, { color: textPrimary }]} />
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
                  { color: textPrimary },
                ]}
              >
                {player.fd}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.statCell,
                  styles.statCellBold,
                  { color: player.pm === null ? textTertiary : player.pm > 0 ? "#4CAF50" : player.pm < 0 ? "#F44336" : textPrimary },
                ]}
              >
                {player.pm === null ? "—" : player.pm > 0 ? `+${player.pm}` : player.pm}
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

          {/* Starters / Bench subtotal rows */}
          {stats.length > 0 && (() => {
            const starters = stats.filter((p) => !p.isSubstitute);
            const bench = stats.filter((p) => p.isSubstitute);
            const sumRow = (group: typeof stats) => ({
              pts: group.reduce((s, p) => s + p.pts, 0),
              fgm: group.reduce((s, p) => s + p.fgm, 0),
              fga: group.reduce((s, p) => s + p.fga, 0),
              fg2m: group.reduce((s, p) => s + p.fg2m, 0),
              fg2a: group.reduce((s, p) => s + p.fg2a, 0),
              fg3m: group.reduce((s, p) => s + p.fg3m, 0),
              fg3a: group.reduce((s, p) => s + p.fg3a, 0),
              ftm: group.reduce((s, p) => s + p.ftm, 0),
              fta: group.reduce((s, p) => s + p.fta, 0),
              reb: group.reduce((s, p) => s + p.reb, 0),
              reb_off: group.reduce((s, p) => s + p.reb_off, 0),
              reb_def: group.reduce((s, p) => s + p.reb_def, 0),
              ast: group.reduce((s, p) => s + p.ast, 0),
              stl: group.reduce((s, p) => s + p.stl, 0),
              blk: group.reduce((s, p) => s + p.blk, 0),
              to: group.reduce((s, p) => s + p.to, 0),
              pf: group.reduce((s, p) => s + p.pf, 0),
              fd: group.reduce((s, p) => s + p.fd, 0),
              eff: group.reduce((s, p) => s + p.eff, 0),
              pm: group.some((p) => p.pm === null) ? null : group.reduce((s, p) => s + (p.pm ?? 0), 0),
            });
            const s = sumRow(starters);
            const b = sumRow(bench);
            const subtotalStyle = [styles.tableRow, { backgroundColor: colors.surfaceVariant + "88", borderBottomColor: borderColor }];
            const labelStyle = [styles.playerNameText, styles.totalText, { color: textSecondary, fontSize: font.xs }];
            const cellStyle = (bold?: boolean) => [styles.tableCell, styles.statCell, bold ? styles.statCellBold : null, { color: textSecondary }];
            const wideStyle = [styles.tableCell, styles.statCellWide, { color: textSecondary }];
            return (
              <>
                {starters.length > 0 && (
                  <View style={subtotalStyle}>
                    <View style={styles.playerCell}><Text style={labelStyle}>5 DÉPART</Text></View>
                    <Text style={[styles.tableCell, styles.numberCell, { color: textTertiary }]}>-</Text>
                    <Text style={[styles.tableCell, styles.minCell, { color: textTertiary }]}>-</Text>
                    <Text style={cellStyle(true)}>{s.pts}</Text>
                    <Text style={wideStyle}>{s.fgm}/{s.fga}</Text>
                    <Text style={wideStyle}>{s.fg2m}/{s.fg2a}</Text>
                    <Text style={wideStyle}>{s.fg3m}/{s.fg3a}</Text>
                    <Text style={wideStyle}>{s.ftm}/{s.fta}</Text>
                    <Text style={cellStyle()}>{s.reb}</Text>
                    <Text style={cellStyle()}>{s.reb_off}</Text>
                    <Text style={cellStyle()}>{s.reb_def}</Text>
                    <Text style={cellStyle()}>-</Text>
                    <Text style={cellStyle()}>{s.ast}</Text>
                    <Text style={cellStyle()}>{s.stl}</Text>
                    <Text style={cellStyle()}>{s.blk}</Text>
                    <Text style={cellStyle()}>{s.to}</Text>
                    <Text style={cellStyle()}>{s.pf}</Text>
                    <Text style={cellStyle()}>{s.fd}</Text>
                    <Text style={[styles.tableCell, styles.statCell, styles.statCellBold, { color: textSecondary }]}>{s.pm === null ? "—" : s.pm > 0 ? `+${s.pm}` : s.pm}</Text>
                    <Text style={[styles.tableCell, styles.statCell, styles.statCellBold, { color: textSecondary }]}>{s.eff}</Text>
                  </View>
                )}
                {bench.length > 0 && (
                  <View style={subtotalStyle}>
                    <View style={styles.playerCell}><Text style={labelStyle}>BANC</Text></View>
                    <Text style={[styles.tableCell, styles.numberCell, { color: textTertiary }]}>-</Text>
                    <Text style={[styles.tableCell, styles.minCell, { color: textTertiary }]}>-</Text>
                    <Text style={cellStyle(true)}>{b.pts}</Text>
                    <Text style={wideStyle}>{b.fgm}/{b.fga}</Text>
                    <Text style={wideStyle}>{b.fg2m}/{b.fg2a}</Text>
                    <Text style={wideStyle}>{b.fg3m}/{b.fg3a}</Text>
                    <Text style={wideStyle}>{b.ftm}/{b.fta}</Text>
                    <Text style={cellStyle()}>{b.reb}</Text>
                    <Text style={cellStyle()}>{b.reb_off}</Text>
                    <Text style={cellStyle()}>{b.reb_def}</Text>
                    <Text style={cellStyle()}>-</Text>
                    <Text style={cellStyle()}>{b.ast}</Text>
                    <Text style={cellStyle()}>{b.stl}</Text>
                    <Text style={cellStyle()}>{b.blk}</Text>
                    <Text style={cellStyle()}>{b.to}</Text>
                    <Text style={cellStyle()}>{b.pf}</Text>
                    <Text style={cellStyle()}>{b.fd}</Text>
                    <Text style={[styles.tableCell, styles.statCell, styles.statCellBold, { color: textSecondary }]}>{b.pm === null ? "—" : b.pm > 0 ? `+${b.pm}` : b.pm}</Text>
                    <Text style={[styles.tableCell, styles.statCell, styles.statCellBold, { color: textSecondary }]}>{b.eff}</Text>
                  </View>
                )}
              </>
            );
          })()}

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
              <View style={[styles.playerCell, { flexDirection: "row", alignItems: "center", gap: 6 }]}>
                <Text
                  style={[
                    styles.playerNameText,
                    styles.totalText,
                    { color: textPrimary },
                  ]}
                >
                  TOTAL
                </Text>
                {handicap > 0 && (
                  <View style={[styles.hcpBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
                    <Text style={[styles.hcpBadgeText, { color: colors.primary }]}>+{handicap} HCP</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tableCell,
                  styles.numberCell,
                  { color: textTertiary },
                ]}
              >
                -
              </Text>
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
                {stats.reduce((sum, p) => sum + p.reb, 0) + teamRebounds}
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
                {teamRebounds}
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
                  { color: textPrimary },
                ]}
              >
                {stats.reduce((sum, p) => sum + p.fd, 0)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.statCell,
                  styles.statCellBold,
                  { color: textPrimary },
                ]}
              >
                {(() => { if (stats.some((p) => p.pm === null)) return "—"; const t = stats.reduce((sum, p) => sum + (p.pm ?? 0), 0); return t > 0 ? `+${t}` : t; })()}
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
              <Text style={[styles.emptyStateText, { color: textTertiary }]}>
                Aucune donnée disponible
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Info Button */}
      <TouchableOpacity
        style={[
          styles.infoButton,
          {
            backgroundColor: colors.surface,
          },
        ]}
        onPress={() => setShowLegend(true)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="information-outline"
          size={40}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* Legend Modal */}
      <StatsLegendModal
        visible={showLegend}
        onClose={() => setShowLegend(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
  tableContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 80,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
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
  numberCell: {
    width: 32,
    textAlign: "center",
    fontWeight: "700",
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
    maxWidth: 96,
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
  hcpBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  hcpBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
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
  infoButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
