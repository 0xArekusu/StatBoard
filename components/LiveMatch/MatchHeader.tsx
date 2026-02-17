import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS } from "../../src/theme/colors";
import { formatTime, getPeriodLabel } from "../../utils/liveMatchHelpers";
import { TeamId } from "../../constants/liveMatchConstants";
import { BREAKPOINTS } from "../../constants/breakpoints";
import { useResponsive } from "../../src/hooks/useResponsive";

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
  const { isCompact, isPortrait, sp, font, width } = useResponsive();
  const isNarrow = isPortrait && width < BREAKPOINTS.narrowPortraitMaxWidth;
  const amIHome = match.location === TeamId.HOME;

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
            {
              color: isMyTeam ? textPrimary : textSecondary,
              fontSize: font.xxxl,
            },
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
                marginTop: sp.sm,
                paddingVertical: isCompact ? 2 : 4,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={isCompact ? 10 : 12}
              color={colors.primary}
            />
            <Text style={[styles.subButtonText, { color: colors.primary }]}>
              CHANGT
            </Text>
          </TouchableOpacity>
        ) : !match.trackOpponentStats && onOpponentScoreSimple ? (
          <View style={[styles.quickScoreButtons, { paddingTop: sp.sm }]}>
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
                    { color: textSecondary, fontSize: font.xl },
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
        {
          backgroundColor: surfaceColor,
          borderBottomColor: borderColor,
          paddingTop: isCompact ? sp.sm : 20,
          paddingBottom: isCompact ? sp.sm : 10,
        },
      ]}
    >
      <View style={styles.headerContent}>
        {/* LEFT SIDE - My team when home, opponent when away */}
        {renderTeamSection(amIHome, true)}

        {/* CENTER (TIMER) */}
        <View style={styles.timerSection}>
          <View
            style={[
              styles.periodRow,
              { marginBottom: isCompact ? sp.xs : sp.sm },
            ]}
          >
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
                size={isCompact ? 14 : 16}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.timerDisplay,
              { width: isNarrow ? 110 : isCompact ? 130 : 170 },
            ]}
          >
            <Text
              style={[
                styles.timerText,
                { fontSize: isNarrow ? 22 : isCompact ? 22 : 32 },
              ]}
            >
              {formatTime(timer)}
            </Text>
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
                width: isCompact ? 32 : 40,
                height: isCompact ? 32 : 40,
                padding: isCompact ? 4 : 6,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isRunning ? "pause" : "play"}
              size={isCompact ? 16 : 20}
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
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
    paddingTop: 4,
  },
  score: {
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
    gap: 8,
    paddingTop: 8,
  },
  quickScoreButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickScoreButtonText: {
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
    width: 24,
    height: 24,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
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
    borderRadius: 999,
    borderWidth: 4,
    zIndex: 10,
    width: 40,
    height: 40,
  },
});
