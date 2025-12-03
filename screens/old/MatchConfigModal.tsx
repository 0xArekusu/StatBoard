/**
 * MatchConfigModal
 *
 * Pre-game modal that allows user to configure match format and period duration.
 * Features:
 * - Select match format (2 halves or 4 quarters)
 * - Adjust period duration with +/- buttons
 * - Shows total match duration
 * - Auto-adjusts default duration based on format
 */

import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { MatchFormat } from "../../src/models/types";
import {
  MATCH_FORMATS,
  MATCH_FORMAT_LABELS,
} from "../../constants/matchConstants";
import { useTheme } from "../../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../../src/theme";
import { logInfo } from "../../utils/logger";

interface MatchConfigModalProps {
  visible: boolean;
  onConfirm: (matchFormat: MatchFormat, periodDuration: number) => void;
  onRequestClose: () => void;
}

export default function MatchConfigModal({
  visible,
  onConfirm,
  onRequestClose,
}: MatchConfigModalProps) {
  const { colors } = useTheme();
  const [matchFormat, setMatchFormat] = React.useState<MatchFormat>(
    MATCH_FORMATS.FOUR_QUARTERS
  );
  const [periodDuration, setPeriodDuration] = React.useState<number>(600);

  // Update period duration when format changes
  React.useEffect(() => {
    setPeriodDuration(matchFormat === MATCH_FORMATS.TWO_HALVES ? 1200 : 600);
  }, [matchFormat]);

  const formatDurationDisplay = (seconds: number): string => {
    return `${Math.floor(seconds / 60)} min`;
  };

  const getTotalMatchDuration = (): string => {
    const periods = matchFormat === MATCH_FORMATS.TWO_HALVES ? 2 : 4;
    const totalSeconds = periods * periodDuration;
    return formatDurationDisplay(totalSeconds);
  };

  /**
   * Handle confirm button click
   * Proceeds to start the match with selected configuration
   */
  const handleConfirm = () => {
    const formatLabel =
      matchFormat === MATCH_FORMATS.TWO_HALVES ? "2 Mi-temps" : "4 Quart-temps";
    const totalDuration = getTotalMatchDuration();

    logInfo("MatchConfigModal", "✅ User confirmed match configuration", {
      matchFormat,
      formatLabel,
      periodDuration,
      periodDurationMinutes: Math.floor(periodDuration / 60),
      totalMatchDuration: totalDuration,
    });

    onConfirm(matchFormat, periodDuration);
  };

  /**
   * Handle back button click
   * Returns to team initialization screen
   */
  const handleBack = () => {
    logInfo(
      "MatchConfigModal",
      "◀️ User clicked back button, returning to team initialization"
    );
    onRequestClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        logInfo(
          "MatchConfigModal",
          "🔙 Hardware back button pressed, returning to team initialization"
        );
        onRequestClose();
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 24,
            minWidth: 300,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 24,
              textAlign: "center",
              color: colors.text.primary,
            }}
          >
            Configuration du match
          </Text>

          {/* Match format configuration */}
          <View style={{ width: 250 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 12,
                textAlign: "center",
                color: colors.text.primary,
              }}
            >
              Format du match
            </Text>

            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              {[
                {
                  key: MATCH_FORMATS.FOUR_QUARTERS,
                  label: `4 ${
                    MATCH_FORMAT_LABELS[MATCH_FORMATS.FOUR_QUARTERS].plural
                  }`,
                  icon: "🏀",
                },
                {
                  key: MATCH_FORMATS.TWO_HALVES,
                  label: `2 ${
                    MATCH_FORMAT_LABELS[MATCH_FORMATS.TWO_HALVES].plural
                  }`,
                  icon: "⏱️",
                },
              ].map((format) => (
                <TouchableOpacity
                  key={format.key}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 4,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor:
                      matchFormat === format.key
                        ? STATUS_COLORS.info + "20"
                        : colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor:
                      matchFormat === format.key
                        ? STATUS_COLORS.info
                        : colors.border,
                  }}
                  onPress={() => {
                    const newFormat = format.key as MatchFormat;
                    logInfo(
                      "MatchConfigModal",
                      "🏀 User changed match format",
                      {
                        previousFormat: matchFormat,
                        newFormat,
                        formatLabel: format.label,
                      }
                    );
                    setMatchFormat(newFormat);
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 4 }}>
                    {format.icon}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        matchFormat === format.key
                          ? STATUS_COLORS.info
                          : colors.text.primary,
                      fontWeight:
                        matchFormat === format.key ? "bold" : "normal",
                      textAlign: "center",
                    }}
                  >
                    {format.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 8,
                textAlign: "center",
                color: colors.text.primary,
              }}
            >
              Durée par période
            </Text>

            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: 20,
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 8,
                  }}
                  onPress={() => {
                    const newDuration = Math.max(60, periodDuration - 60);
                    logInfo(
                      "MatchConfigModal",
                      "⏱️ User decreased period duration",
                      {
                        previousDuration: periodDuration,
                        newDuration,
                        change: -60,
                      }
                    );
                    setPeriodDuration(newDuration);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: colors.text.secondary,
                    }}
                  >
                    -
                  </Text>
                </TouchableOpacity>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    minWidth: 60,
                    textAlign: "center",
                    color: colors.text.primary,
                  }}
                >
                  {formatDurationDisplay(periodDuration)}
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: 20,
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 8,
                  }}
                  onPress={() => {
                    const newDuration = Math.min(3600, periodDuration + 60);
                    logInfo(
                      "MatchConfigModal",
                      "⏱️ User increased period duration",
                      {
                        previousDuration: periodDuration,
                        newDuration,
                        change: +60,
                      }
                    );
                    setPeriodDuration(newDuration);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: colors.text.secondary,
                    }}
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: colors.text.tertiary,
                  textAlign: "center",
                }}
              >
                Durée totale : {getTotalMatchDuration()}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={handleBack}
            >
              <Text
                style={{
                  color: colors.text.secondary,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Retour
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: STATUS_COLORS.success,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
              }}
              onPress={handleConfirm}
            >
              <Text
                style={{
                  color: COMMON_COLORS.white,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Commencer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
