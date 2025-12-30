import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS } from "../../src/theme/colors";
import { formatTime, getPeriodLabel } from "../../utils/liveMatchHelpers";
import { TeamId } from "../../constants/liveMatchConstants";

interface MatchHeaderProps {
  match: {
    myTeamName?: string;
    opponent?: string;
    scoreHome: number;
    scoreAway: number;
    location: TeamId;
    trackOpponentStats?: boolean;
  };
  timer: number;
  quarter: number;
  maxPeriods: number;
  isRunning: boolean;
  onToggleTimer: () => void;
  onNextQuarter: () => void;
  onOpenSubstitution: () => void;
  onOpponentScoreSimple?: (value: number) => void;
}

export function MatchHeader({
  match,
  timer,
  quarter,
  maxPeriods,
  isRunning,
  onToggleTimer,
  onNextQuarter,
  onOpenSubstitution,
  onOpponentScoreSimple,
}: MatchHeaderProps) {
  const { colors } = useTheme();
  const amIHome = match.location === TeamId.HOME;

  console.log('[MatchHeader] Location:', match.location, 'amIHome:', amIHome);

  const bgColor = colors.background;
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  const renderTeamSection = (isMyTeam: boolean, isLeft: boolean) => {
    const score = isMyTeam
      ? amIHome
        ? match.scoreHome
        : match.scoreAway
      : amIHome
        ? match.scoreAway
        : match.scoreHome;

    const teamName = isMyTeam
      ? match.myTeamName || "Nous"
      : match.opponent || "Adversaire";

    return (
      <View style={styles.teamSection}>
        <Text
          style={[
            styles.score,
            { color: isMyTeam ? textPrimary : textSecondary },
          ]}
        >
          {score}
        </Text>
        <Text
          style={[
            styles.teamName,
            { color: isMyTeam ? colors.primary : textSecondary },
          ]}
        >
          {teamName}
        </Text>

        {isMyTeam ? (
          <TouchableOpacity
            onPress={onOpenSubstitution}
            style={[
              styles.subButton,
              {
                backgroundColor: colors.button.brandAlpha,
                borderColor: colors.button.brandAlphaBorder,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={12}
              color={colors.primary}
            />
            <Text style={[styles.subButtonText, { color: colors.primary }]}>
              CHANGT
            </Text>
          </TouchableOpacity>
        ) : !match.trackOpponentStats && onOpponentScoreSimple ? (
          <View style={styles.quickScoreButtons}>
            {[1, 2, 3].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => onOpponentScoreSimple(value)}
                style={[
                  styles.quickScoreButton,
                  {
                    backgroundColor: colors.button.quickScoreBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickScoreButtonText,
                    { color: textSecondary },
                  ]}
                >
                  +{value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: surfaceColor, borderBottomColor: borderColor },
      ]}
    >
      <View style={styles.headerContent}>
        {/* LEFT SIDE - My team when home, opponent when away */}
        {renderTeamSection(amIHome, true)}

        {/* CENTER (TIMER) */}
        <View style={styles.timerSection}>
          <View style={styles.periodRow}>
            <Text style={[styles.periodText, { color: textSecondary }]}>
              {getPeriodLabel(quarter, maxPeriods)}
            </Text>
            <TouchableOpacity
              onPress={onNextQuarter}
              style={[
                styles.nextPeriodButton,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={10}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.timerDisplay}>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>
          <TouchableOpacity
            onPress={onToggleTimer}
            style={[
              styles.playButton,
              {
                backgroundColor: isRunning
                  ? colors.button.playPaused
                  : colors.primary,
                borderColor: surfaceColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isRunning ? "pause" : "play"}
              size={14}
              color={isRunning ? colors.error : colors.onPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* RIGHT SIDE - Opponent when home, my team when away */}
        {renderTeamSection(!amIHome, false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  teamSection: {
    width: 112,
    alignItems: "center",
    paddingTop: 4,
  },
  score: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -2,
  },
  teamName: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  subButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  subButtonText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  quickScoreButtons: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  quickScoreButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickScoreButtonText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  timerSection: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  nextPeriodButton: {
    padding: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  timerDisplay: {
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: SLATE_COLORS[800],
    width: 170,
    alignItems: "center",
  },
  timerText: {
    fontFamily: "monospace",
    fontSize: 32,
    fontWeight: "900",
    color: "#dc2626",
    letterSpacing: 4,
  },
  playButton: {
    marginTop: -12,
    padding: 6,
    borderRadius: 999,
    borderWidth: 4,
    zIndex: 10,
  },
});
