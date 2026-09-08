import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS } from "../../src/theme/colors";
import { formatTime, getPeriodLabel } from "../../utils/liveMatchHelpers";
import { TeamId, MatchEvent } from "../../constants/liveMatchConstants";
import { BREAKPOINTS } from "../../constants/breakpoints";
import { useResponsive } from "../../src/hooks/useResponsive";
import { Player } from "../../models/Player";
import { ActionType } from "../../src/models/ActionTypes";
import { TeamFoulDrawer } from "./TeamFoulDrawer";
import { TimeoutModal } from "./TimeoutModal";
import { CollapsedMatchHeader } from "./CollapsedMatchHeader";
import { LandscapeToggleButton } from "./LandscapeToggleButton";

interface MatchHeaderProps {
  match: {
    myTeamName?: string;
    opponent?: string;
    scoreHome: number;
    scoreAway: number;
    location: TeamId;
    trackOpponentStats?: boolean;
    myTeamHandicap?: number;
    opponentHandicap?: number;
  };
  timer: number;
  quarter: number;
  maxPeriods: number;
  isRunning: boolean;
  events?: MatchEvent[];
  myTeamRoster?: Player[];
  opponentRoster?: Player[];
  onToggleTimer: () => void;
  onNextQuarter: () => void;
  onOpenSubstitution: () => void;
  onOpponentScoreSimple?: (value: number) => void;
  onTimeout?: (teamId: "HOME" | "AWAY") => void;
  /** Repliée/déployée (paysage ou portrait téléphone). Contrôlé par le parent
   * car LiveMatchScreen a aussi besoin de connaître cet état (ex: masquer le
   * switch TERRAIN/ACTIONS quand la mini-barre est active en portrait). */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function MatchHeader({
  match,
  timer,
  quarter,
  maxPeriods,
  isRunning,
  events = [],
  myTeamRoster = [],
  opponentRoster = [],
  onToggleTimer,
  onNextQuarter,
  onOpenSubstitution,
  onOpponentScoreSimple,
  onTimeout,
  expanded,
  onExpandedChange,
}: MatchHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isCompact, isPortrait, sp, font, width, isMobileLandscape, isMobilePortrait } = useResponsive();
  const isNarrow = isPortrait && width < BREAKPOINTS.narrowPortraitMaxWidth;
  const amIHome = match.location === TeamId.HOME;

  const [foulDrawerVisible, setFoulDrawerVisible] = useState(false);
  const [timeoutModalTeamId, setTimeoutModalTeamId] = useState<"HOME" | "AWAY" | null>(null);

  const canCollapse = isMobileLandscape || isMobilePortrait;

  const myTeamId = match.location as "HOME" | "AWAY";
  const opponentTeamId = myTeamId === "HOME" ? "AWAY" : "HOME";

  const getTeamFouls = (teamId: "HOME" | "AWAY") =>
    events.filter(
      (e) =>
        e.action_type === ActionType.FOUL &&
        e.teamId === teamId &&
        e.period_number === quarter
    ).length;

  const myFouls = getTeamFouls(myTeamId);
  const opponentFouls = getTeamFouls(opponentTeamId);
  const myFoulAlert = myFouls >= 5;
  const opponentFoulAlert = opponentFouls >= 5;

  // Timeout logic (FIBA: 2 max in Q1+Q2, 3 max in Q3+Q4, 1 per OT period)
  const isFirstHalf = quarter <= 2;
  const halfPeriods = isFirstHalf ? [1, 2] : quarter <= 4 ? [3, 4] : [quarter];
  const halfMax = isFirstHalf ? 2 : quarter <= 4 ? 3 : 1;

  const getTeamTimeoutsInHalf = (teamId: "HOME" | "AWAY") =>
    events.filter(
      (e) =>
        e.action_type === ActionType.TIMEOUT &&
        e.teamId === teamId &&
        halfPeriods.includes(e.period_number ?? 0)
    ).length;

  const homeTimeoutsUsed = getTeamTimeoutsInHalf("HOME");
  const awayTimeoutsUsed = getTeamTimeoutsInHalf("AWAY");
  const homeHalfLimitReached = homeTimeoutsUsed >= halfMax;
  const awayHalfLimitReached = awayTimeoutsUsed >= halfMax;

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
      ? match.myTeamName || t("liveMatchModals.myTeamFallback")
      : match.opponent || t("liveMatchModals.opponentFallback");

    const handicap = isMyTeam
      ? (match.myTeamHandicap || 0)
      : (match.opponentHandicap || 0);

    return (
      <View style={[styles.teamSection]}>
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
        {handicap > 0 && (
          <View style={[styles.hcpBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
            <Text style={[styles.hcpBadgeText, { color: colors.primary }]}>
              +{handicap} HCP
            </Text>
          </View>
        )}
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
              {t("liveMatchHeader.substituteAbbr")}
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

  // Repliée : mini bande avec l'essentiel (équipes, score, chrono, points adverses)
  if (canCollapse && !expanded) {
    return (
      <CollapsedMatchHeader
        myTeamName={match.myTeamName || t("liveMatchModals.myTeamFallback")}
        myScore={amIHome ? match.scoreHome : match.scoreAway}
        opponentTeamName={match.opponent || t("liveMatchModals.opponentFallback")}
        opponentScore={amIHome ? match.scoreAway : match.scoreHome}
        timer={timer}
        isRunning={isRunning}
        showOpponentQuickScore={!match.trackOpponentStats && !!onOpponentScoreSimple}
        onToggleTimer={onToggleTimer}
        onNextQuarter={onNextQuarter}
        onOpponentScoreSimple={onOpponentScoreSimple}
        onOpenSubstitution={onOpenSubstitution}
        onExpand={() => onExpandedChange(true)}
      />
    );
  }

  // En paysage, la barre déployée flotte par-dessus le terrain (place rare, ne doit
  // pas redimensionner). En portrait il y a de la marge : elle reste dans le flux
  // normal comme avant, et redimensionne normalement au repli/dépli (voulu).
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
        isMobileLandscape && styles.headerOverlay,
      ]}
    >
      {canCollapse && (
        <LandscapeToggleButton
          icon="chevron-up"
          onPress={() => onExpandedChange(false)}
          color={colors.primary}
          backgroundColor={surfaceColor}
          borderColor={borderColor}
          style={styles.toggleButtonTop}
        />
      )}

      <View style={styles.headerContent}>
        {/* LEFT SIDE - My team when home, opponent when away */}
        {renderTeamSection(amIHome, true)}

        {/* CENTER (TIMER) */}
        <View style={[styles.timerSection, isMobilePortrait && { marginHorizontal: 34 }]}>
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

          <View style={[styles.timerRow, isMobilePortrait && { gap: 0 }]}>
            {/* Colonne gauche — équipe HOME */}
            <View style={[styles.sideColumn, isMobilePortrait && { minWidth: 28 }]}>
              {(amIHome || match.trackOpponentStats) ? (
                <>
                  <TouchableOpacity
                    onPress={() => setFoulDrawerVisible(true)}
                    style={[
                      styles.foulBadge,
                      { borderColor: (amIHome ? myFoulAlert : opponentFoulAlert) ? "#dc2626" : borderColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.foulBadgeText,
                        { color: (amIHome ? myFoulAlert : opponentFoulAlert) ? "#dc2626" : textSecondary },
                      ]}
                    >
                      {amIHome ? myFouls : opponentFouls}F
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTimeoutModalTeamId("HOME")}
                    style={[styles.toBadge, { borderColor: homeHalfLimitReached ? "#dc2626" : borderColor }]}
                  >
                    <Text style={[styles.toText, { color: homeHalfLimitReached ? "#dc2626" : textSecondary }]}>TO</Text>
                  </TouchableOpacity>
                  <View style={styles.timeoutDotsRow}>
                    {Array.from({ length: halfMax }).map((_, i) => {
                      const filled = i < homeTimeoutsUsed;
                      const isLastFilled = filled && i === halfMax - 1 && homeHalfLimitReached;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.timeoutDot,
                            {
                              backgroundColor: filled ? (isLastFilled ? "#dc2626" : colors.warning) : "transparent",
                              borderColor: filled ? (isLastFilled ? "#dc2626" : colors.warning) : borderColor,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={[styles.sideColumnPlaceholder, isMobilePortrait && { minWidth: 28 }]} />
              )}
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

            {/* Colonne droite — équipe AWAY */}
            <View style={[styles.sideColumn, isMobilePortrait && { minWidth: 28 }]}>
              {(!amIHome || match.trackOpponentStats) ? (
                <>
                  <TouchableOpacity
                    onPress={() => setFoulDrawerVisible(true)}
                    style={[
                      styles.foulBadge,
                      { borderColor: (!amIHome ? myFoulAlert : opponentFoulAlert) ? "#dc2626" : borderColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.foulBadgeText,
                        { color: (!amIHome ? myFoulAlert : opponentFoulAlert) ? "#dc2626" : textSecondary },
                      ]}
                    >
                      {!amIHome ? myFouls : opponentFouls}F
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTimeoutModalTeamId("AWAY")}
                    style={[styles.toBadge, { borderColor: awayHalfLimitReached ? "#dc2626" : borderColor }]}
                  >
                    <Text style={[styles.toText, { color: awayHalfLimitReached ? "#dc2626" : textSecondary }]}>TO</Text>
                  </TouchableOpacity>
                  <View style={styles.timeoutDotsRow}>
                    {Array.from({ length: halfMax }).map((_, i) => {
                      const filled = i < awayTimeoutsUsed;
                      const isLastFilled = filled && i === halfMax - 1 && awayHalfLimitReached;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.timeoutDot,
                            {
                              backgroundColor: filled ? (isLastFilled ? "#dc2626" : colors.warning) : "transparent",
                              borderColor: filled ? (isLastFilled ? "#dc2626" : colors.warning) : borderColor,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={[styles.sideColumnPlaceholder, isMobilePortrait && { minWidth: 28 }]} />
              )}
            </View>
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

      <TeamFoulDrawer
        visible={foulDrawerVisible}
        onClose={() => setFoulDrawerVisible(false)}
        events={events}
        myTeamRoster={myTeamRoster}
        opponentRoster={opponentRoster}
        trackOpponentStats={match.trackOpponentStats ?? false}
        myTeamId={myTeamId}
        currentPeriod={quarter}
        myTeamName={match.myTeamName || t("liveMatchModals.myTeamFallback")}
        opponentName={match.opponent || t("liveMatchModals.opponentFallback")}
      />

      <TimeoutModal
        visible={timeoutModalTeamId !== null}
        teamName={
          timeoutModalTeamId === myTeamId
            ? match.myTeamName || t("liveMatchModals.myTeamFallback")
            : match.opponent || t("liveMatchModals.opponentFallback")
        }
        limitReached={
          timeoutModalTeamId === "HOME" ? homeHalfLimitReached : awayHalfLimitReached
        }
        onConfirm={() => {
          if (timeoutModalTeamId && onTimeout) onTimeout(timeoutModalTeamId);
        }}
        onClose={() => setTimeoutModalTeamId(null)}
      />
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
  hcpBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 3,
  },
  hcpBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
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
  foulBadge: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  foulBadgePlaceholder: {
    width: 32,
  },
  sideColumn: {
    alignItems: "center",
    gap: 3,
    minWidth: 44,
  },
  sideColumnPlaceholder: {
    minWidth: 44,
  },
  toBadge: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  toText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  timeoutDotsRow: {
    flexDirection: "row",
    gap: 3,
  },
  timeoutDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  foulBadgeText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  timerSection: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  toggleButtonTop: {
    top: 4,
    right: 6,
  },
});
