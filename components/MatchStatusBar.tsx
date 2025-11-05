/**
 * MatchStatusBar
 *
 * Top toolbar displaying match status and timer controls during active gameplay.
 * Features:
 * - Team names with digital-style scores
 * - Period indicator (quarters or halves)
 * - Countdown timer with color-coded warnings (red < 1min, orange < 5min)
 * - Timer controls: Pause/Resume buttons
 * - Period navigation: Next Period button (disabled during play)
 * - Match end: End Match button (shown only in last period, disabled during play)
 *
 * Timer controls are only enabled when match is paused or time is up.
 */
import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { MatchFormat } from "../src/models/types";
import { logInfo, logWarn } from "../utils/logger";

interface MatchStatusBarProps {
  teamA: string;
  teamB: string;
  currentPeriod: number;
  timeElapsed: number; // en secondes
  matchFormat: MatchFormat;
  periodDuration: number; // en secondes
  isPaused: boolean;
  isPortrait: boolean;
  onPause: () => void;
  onResume: () => void;
  onNextPeriod?: () => void;
  onEndMatch?: () => void;
  scoreA?: number;
  scoreB?: number;
  teamMode: "A" | "B" | "BOTH";
}

export default function MatchStatusBar({
  teamA,
  teamB,
  currentPeriod,
  timeElapsed,
  matchFormat,
  periodDuration,
  isPaused,
  isPortrait,
  onPause,
  onResume,
  onNextPeriod,
  onEndMatch,
  scoreA = 0,
  scoreB = 0,
  teamMode,
}: MatchStatusBarProps) {
  // Format seconds to MM:SS display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get localized period name (1ère MT, 2ème MT, or Q1-Q4)
  const getPeriodName = (): string => {
    if (matchFormat === "2_halves") {
      return currentPeriod === 1 ? "1ère MT" : "2ème MT";
    } else {
      return `Q${currentPeriod}`;
    }
  };

  const timeRemaining = Math.max(0, periodDuration - timeElapsed);
  const isTimeUp = timeRemaining === 0;

  // Calculate total periods based on match format
  const getTotalPeriods = (): number => {
    return matchFormat === "2_halves" ? 2 : 4;
  };

  const isLastPeriod = currentPeriod >= getTotalPeriods();

  // Handler: User clicked pause button
  const handlePause = () => {
    logInfo('MatchStatusBar', '⏸️ User clicked pause button', {
      currentPeriod,
      timeElapsed,
      timeRemaining,
      periodName: getPeriodName()
    });
    onPause();
  };

  // Handler: User clicked resume button
  const handleResume = () => {
    logInfo('MatchStatusBar', '▶️ User clicked resume button', {
      currentPeriod,
      timeElapsed,
      timeRemaining,
      periodName: getPeriodName()
    });
    onResume();
  };

  // Handler: User clicked next period button
  const handleNextPeriod = () => {
    if (!(isPaused || isTimeUp)) {
      logWarn('MatchStatusBar', '⚠️ Next period button disabled during active play');
      return;
    }

    logInfo('MatchStatusBar', '⏭️ User clicked next period button', {
      currentPeriod,
      nextPeriod: currentPeriod + 1,
      totalPeriods: getTotalPeriods(),
      timeRemaining,
      isPaused
    });

    if (onNextPeriod) {
      onNextPeriod();
    }
  };

  // Handler: User clicked end match button
  const handleEndMatch = () => {
    if (!(isPaused || isTimeUp)) {
      logWarn('MatchStatusBar', '⚠️ End match button disabled during active play');
      return;
    }

    logInfo('MatchStatusBar', '🏁 User clicked end match button', {
      currentPeriod,
      isLastPeriod: true,
      timeRemaining,
      isPaused,
      finalScoreA: scoreA,
      finalScoreB: scoreB
    });

    if (onEndMatch) {
      onEndMatch();
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: 14, // Space for phone status bar
        zIndex: 400,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Teams with digital-style scores */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
          }}
        >
          {/* Team A with score on the right */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: "#4CAF50",
                fontSize: 15,
                fontWeight: "bold",
              }}
            >
              {teamA}
            </Text>
            {(teamMode === "BOTH" || teamMode === "A") && (
              <View
                style={{
                  backgroundColor: "#0A0A0A",
                  borderRadius: 3,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginLeft: 8,
                  borderWidth: 1,
                  borderColor: "#1A1A1A",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.8,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: "#4CAF50",
                    fontSize: 16,
                    fontWeight: "900",
                    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
                    textShadowColor: "#4CAF50",
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 4,
                    letterSpacing: 1,
                    textAlign: "center",
                  }}
                >
                  {scoreA.toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
          
          <Text
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: "600",
              marginHorizontal: 8,
            }}
          >
            vs
          </Text>

          {/* Team B with score on the left */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {(teamMode === "BOTH" || teamMode === "B") && (
              <View
                style={{
                  backgroundColor: "#0A0A0A",
                  borderRadius: 3,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: "#1A1A1A",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.8,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: "#2196F3",
                    fontSize: 16,
                    fontWeight: "900",
                    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
                    textShadowColor: "#2196F3",
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 4,
                    letterSpacing: 1,
                    textAlign: "center",
                  }}
                >
                  {scoreB.toString().padStart(2, '0')}
                </Text>
              </View>
            )}
            <Text
              style={{
                color: "#2196F3",
                fontSize: 15,
                fontWeight: "bold",
              }}
            >
              {teamB}
            </Text>
          </View>
        </View>

        {/* Period and remaining time */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginHorizontal: 12,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 13,
              fontWeight: "600",
              marginRight: 8,
            }}
          >
            {getPeriodName()}
          </Text>
          
          <Text
            style={{
              color: timeRemaining <= 60 ? "#F44336" : timeRemaining <= 300 ? "#FF9800" : "#4CAF50",
              fontSize: 16,
              fontWeight: "bold",
              fontFamily: "monospace",
            }}
          >
            {formatTime(timeRemaining)}
          </Text>
        </View>

        {/* Timer control buttons: Pause/Resume, Next Period, End Match */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {isPaused ? (
            <TouchableOpacity
              onPress={isTimeUp ? undefined : handleResume}
              disabled={isTimeUp}
              style={{
                backgroundColor: isTimeUp ? "#666" : "#4CAF50",
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginLeft: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isTimeUp ? 0.1 : 0.2,
                shadowRadius: 2,
                elevation: isTimeUp ? 1 : 3,
                opacity: isTimeUp ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
                ▶ Resume
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={isTimeUp ? undefined : handlePause}
              disabled={isTimeUp}
              style={{
                backgroundColor: isTimeUp ? "#666" : "#FF9800",
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginLeft: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isTimeUp ? 0.1 : 0.2,
                shadowRadius: 2,
                elevation: isTimeUp ? 1 : 3,
                opacity: isTimeUp ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
                ⏸ Pause
              </Text>
            </TouchableOpacity>
          )}

          {/* Next Period button - shown only if not the last period, enabled only when paused */}
          {!isLastPeriod && onNextPeriod && (
            <TouchableOpacity
              onPress={(isPaused || isTimeUp) ? handleNextPeriod : undefined}
              disabled={!(isPaused || isTimeUp)}
              style={{
                backgroundColor: !(isPaused || isTimeUp) ? "#666" : "#2196F3",
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginLeft: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: !(isPaused || isTimeUp) ? 0.1 : 0.2,
                shadowRadius: 2,
                elevation: !(isPaused || isTimeUp) ? 1 : 3,
                opacity: !(isPaused || isTimeUp) ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
                ⏭ Suivant
              </Text>
            </TouchableOpacity>
          )}

          {/* End match button - shown only in the last period, enabled only when paused */}
          {isLastPeriod && onEndMatch && (
            <TouchableOpacity
              onPress={(isPaused || isTimeUp) ? handleEndMatch : undefined}
              disabled={!(isPaused || isTimeUp)}
              style={{
                backgroundColor: !(isPaused || isTimeUp) ? "#666" : "#F44336",
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginLeft: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: !(isPaused || isTimeUp) ? 0.1 : 0.2,
                shadowRadius: 2,
                elevation: !(isPaused || isTimeUp) ? 1 : 3,
                opacity: !(isPaused || isTimeUp) ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
                🏁 Fin
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </View>
  );
}