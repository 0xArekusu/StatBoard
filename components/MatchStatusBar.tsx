import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { MatchFormat } from "../src/models/types";

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
  teamMode: "A" | "B" | "both";
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
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPeriodName = (): string => {
    if (matchFormat === "2_halves") {
      return currentPeriod === 1 ? "1ère MT" : "2ème MT";
    } else {
      return `Q${currentPeriod}`;
    }
  };

  const timeRemaining = Math.max(0, periodDuration - timeElapsed);
  const isTimeUp = timeRemaining === 0;
  
  const getTotalPeriods = (): number => {
    return matchFormat === "2_halves" ? 2 : 4;
  };
  
  const isLastPeriod = currentPeriod >= getTotalPeriods();

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
        paddingTop: 14, // Espace pour la barre de statut du téléphone
        zIndex: 400,
        borderBottomWidth: isPaused ? 2 : 0,
        borderBottomColor: "#FF9800",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Équipes avec scores style digital */}
        <TouchableOpacity
          onPress={onPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
          }}
        >
          {/* Team A avec score à droite */}
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
            {(teamMode === "both" || teamMode === "A") && (
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
          
          {/* Team B avec score à gauche */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {(teamMode === "both" || teamMode === "B") && (
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
        </TouchableOpacity>

        {/* Période et temps restant */}
        <TouchableOpacity
          onPress={onPress}
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
        </TouchableOpacity>

        {/* Boutons de contrôle discrets */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {isPaused ? (
            <TouchableOpacity
              onPress={isTimeUp ? undefined : onResume}
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
              onPress={isTimeUp ? undefined : onPause}
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

          {/* Bouton Période suivante - affiché seulement si pas la dernière période */}
          {!isLastPeriod && onNextPeriod && (
            <TouchableOpacity
              onPress={(isPaused || isTimeUp) ? onNextPeriod : undefined}
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

          {/* Bouton Terminer le match - affiché seulement dans la dernière période */}
          {isLastPeriod && onEndMatch && (
            <TouchableOpacity
              onPress={(isPaused || isTimeUp) ? onEndMatch : undefined}
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