import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { formatTime } from "../../utils/liveMatchHelpers";
import { MOBILE_LANDSCAPE_HEADER_RESERVED_HEIGHT } from "../../constants/liveMatchConstants";
import { LandscapeToggleButton } from "./LandscapeToggleButton";

interface CollapsedMatchHeaderProps {
  myTeamName: string;
  myScore: number;
  opponentTeamName: string;
  opponentScore: number;
  timer: number;
  isRunning: boolean;
  showOpponentQuickScore: boolean;
  onToggleTimer: () => void;
  onNextQuarter: () => void;
  onOpponentScoreSimple?: (value: number) => void;
  onOpenSubstitution: () => void;
  onExpand: () => void;
}

/**
 * Mini barre de score affichée quand la barre de score complète (MatchHeader)
 * est repliée. Reste ancrée dans le flux (pas d'overlay) pour ne jamais
 * masquer le terrain.
 * - Paysage : tout sur une seule ligne (place rare).
 * - Portrait : grille 2 lignes (noms/scores/chrono en haut, play+période et
 *   +1/+2/+3 en dessous, alignés colonne par colonne).
 */
export function CollapsedMatchHeader({
  myTeamName,
  myScore,
  opponentTeamName,
  opponentScore,
  timer,
  isRunning,
  showOpponentQuickScore,
  onToggleTimer,
  onNextQuarter,
  onOpponentScoreSimple,
  onOpenSubstitution,
  onExpand,
}: CollapsedMatchHeaderProps) {
  const { colors } = useTheme();
  const { isPortrait } = useResponsive();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  const playButton = (
    <TouchableOpacity
      onPress={onToggleTimer}
      style={[
        styles.playButton,
        { backgroundColor: isRunning ? colors.button.playPaused : colors.primary },
      ]}
    >
      <MaterialCommunityIcons
        name={isRunning ? "pause" : "play"}
        size={14}
        color={isRunning ? colors.error : colors.onPrimary}
      />
    </TouchableOpacity>
  );

  const nextPeriodButton = (
    <TouchableOpacity
      onPress={onNextQuarter}
      style={[styles.nextPeriodButton, { backgroundColor: colors.surfaceVariant, borderColor }]}
    >
      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
    </TouchableOpacity>
  );

  const renderQuickScoreButtons = (small: boolean) =>
    showOpponentQuickScore &&
    onOpponentScoreSimple && (
      <View style={[styles.quickScoreRow, !small && styles.spacedLeft]}>
        {[1, 2, 3].map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => onOpponentScoreSimple(value)}
            style={[
              styles.quickScoreButton,
              small && styles.quickScoreButtonSmall,
              { backgroundColor: colors.button.quickScoreBackground },
            ]}
          >
            <Text style={[styles.quickScoreText, small && styles.quickScoreTextSmall, { color: textSecondary }]}>
              +{value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );

  // ------------------------------------------------------------------
  // Paysage : une seule ligne, inchangé.
  // ------------------------------------------------------------------
  if (!isPortrait) {
    return (
      <View
        style={[
          styles.bar,
          styles.barLandscape,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <View style={styles.side}>
          <Text style={[styles.teamName, { color: colors.primary }]} numberOfLines={1}>
            {myTeamName}
          </Text>
          <Text style={[styles.score, styles.spacedLeft, { color: textPrimary }]}>{myScore}</Text>
        </View>

        <View style={styles.center}>
          {playButton}
          <Text style={styles.timer}>{formatTime(timer)}</Text>
          {nextPeriodButton}
        </View>

        <View style={styles.side}>
          <Text style={[styles.score, { color: textSecondary }]}>{opponentScore}</Text>
          <Text style={[styles.teamName, styles.spacedLeft, { color: textSecondary }]} numberOfLines={1}>
            {opponentTeamName}
          </Text>
          {renderQuickScoreButtons(false)}
        </View>

        <LandscapeToggleButton
          icon="swap-horizontal"
          onPress={onOpenSubstitution}
          color={colors.primary}
          backgroundColor={surfaceColor}
          borderColor={borderColor}
          style={styles.subButtonPosition}
        />

        <LandscapeToggleButton
          icon="chevron-down"
          onPress={onExpand}
          color={colors.primary}
          backgroundColor={surfaceColor}
          borderColor={borderColor}
          style={styles.toggleButtonPosition}
        />
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Portrait : grille 2 lignes, colonnes alignées entre les deux lignes.
  // ------------------------------------------------------------------
  return (
    <View
      style={[
        styles.bar,
        styles.barPortrait,
        { backgroundColor: surfaceColor, borderBottomColor: borderColor },
      ]}
    >
      {/* Ligne 1 : noms + scores, chrono au centre */}
      <View style={styles.portraitRow}>
        <View style={styles.side}>
          <Text style={[styles.teamName, { color: colors.primary }]} numberOfLines={1}>
            {myTeamName}
          </Text>
          <Text style={[styles.score, styles.spacedLeft, { color: textPrimary }]}>{myScore}</Text>
        </View>

        <View style={styles.centerPortrait}>
          <Text style={styles.timer}>{formatTime(timer)}</Text>
        </View>

        <View style={styles.side}>
          <Text style={[styles.score, { color: textSecondary }]}>{opponentScore}</Text>
          <Text style={[styles.teamName, styles.spacedLeft, { color: textSecondary }]} numberOfLines={1}>
            {opponentTeamName}
          </Text>
        </View>
      </View>

      {/* Ligne 2 : changement sous mon équipe, play (centré sous le chrono) + */}
      {/* période juste à côté, +1/+2/+3 réduits */}
      <View style={styles.portraitRow}>
        <View style={styles.side}>
          <TouchableOpacity
            onPress={onOpenSubstitution}
            style={[styles.subButtonPortrait, { backgroundColor: colors.surfaceVariant, borderColor }]}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerPortrait}>
          <View style={styles.playWithNext}>
            {playButton}
            {nextPeriodButton}
          </View>
        </View>

        <View style={styles.side}>{renderQuickScoreButtons(true)}</View>
      </View>

      <LandscapeToggleButton
        icon="chevron-down"
        onPress={onExpand}
        color={colors.primary}
        backgroundColor={surfaceColor}
        borderColor={borderColor}
        style={styles.toggleButtonPosition}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
  },
  barLandscape: {
    flexDirection: "row",
    alignItems: "center",
    height: MOBILE_LANDSCAPE_HEADER_RESERVED_HEIGHT,
    paddingLeft: 44,
    paddingRight: 44,
  },
  barPortrait: {
    flexDirection: "column",
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 10,
    gap: 2,
  },
  portraitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  center: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  centerPortrait: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
  },
  playWithNext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  teamName: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    maxWidth: 90,
  },
  spacedLeft: {
    marginLeft: 10,
  },
  score: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -1,
  },
  nextPeriodButton: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: {
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "900",
    color: "#dc2626",
  },
  quickScoreRow: {
    flexDirection: "row",
    gap: 6,
  },
  quickScoreButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  quickScoreButtonSmall: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  quickScoreText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  quickScoreTextSmall: {
    fontSize: 10,
  },
  toggleButtonPosition: {
    top: 4,
    right: 6,
  },
  subButtonPosition: {
    top: 4,
    left: 6,
  },
  subButtonPortrait: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
