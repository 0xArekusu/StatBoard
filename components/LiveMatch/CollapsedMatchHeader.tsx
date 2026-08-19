import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
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
  onExpand: () => void;
}

/**
 * Mini barre de score affichée en paysage téléphone quand la barre de score
 * complète (MatchHeader) est repliée. Reste ancrée dans le flux (pas d'overlay)
 * pour ne jamais masquer le terrain.
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
  onExpand,
}: CollapsedMatchHeaderProps) {
  const { colors } = useTheme();
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  return (
    <View style={[styles.bar, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
      {/* Mon équipe : nom + score */}
      <View style={styles.side}>
        <Text style={[styles.teamName, { color: colors.primary }]} numberOfLines={1}>
          {myTeamName}
        </Text>
        <Text style={[styles.score, styles.spacedLeft, { color: textPrimary }]}>{myScore}</Text>
      </View>

      {/* Centre : play/pause, chrono, période suivante */}
      <View style={styles.center}>
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

        <Text style={styles.timer}>{formatTime(timer)}</Text>

        <TouchableOpacity
          onPress={onNextQuarter}
          style={[styles.nextPeriodButton, { backgroundColor: colors.surfaceVariant, borderColor }]}
        >
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Adversaire : score + nom + ajout rapide de points */}
      <View style={styles.side}>
        <Text style={[styles.score, { color: textSecondary }]}>{opponentScore}</Text>
        <Text style={[styles.teamName, styles.spacedLeft, { color: textSecondary }]} numberOfLines={1}>
          {opponentTeamName}
        </Text>

        {showOpponentQuickScore && onOpponentScoreSimple && (
          <View style={[styles.quickScoreRow, styles.spacedLeft]}>
            {[1, 2, 3].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => onOpponentScoreSimple(value)}
                style={[styles.quickScoreButton, { backgroundColor: colors.button.quickScoreBackground }]}
              >
                <Text style={[styles.quickScoreText, { color: textSecondary }]}>+{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    height: MOBILE_LANDSCAPE_HEADER_RESERVED_HEIGHT,
    paddingLeft: 10,
    paddingRight: 44,
    borderBottomWidth: 1,
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
  quickScoreText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  toggleButtonPosition: {
    top: 4,
    right: 6,
  },
});
