import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { ACTION_COLORS, STATUS_COLORS } from "../../src/theme/colors";
import { FoulChainContext, TeamId } from "../../constants/liveMatchConstants";
import { Player } from "../../models/Player";

export interface FoulChainResult {
  foulPlayer?: Player;
  basketPoints?: 2 | 3;
  freethrows: Array<"made" | "missed">;
}

interface FoulChainModalProps {
  visible: boolean;
  context: FoulChainContext | null;
  playersOnCourt: Player[];
  opponentPlayersOnCourt: Player[];
  myTeamId: TeamId;
  trackOpponentStats: boolean;
  onComplete: (result: FoulChainResult) => void;
  onIgnore: () => void;
}

export const FoulChainModal: React.FC<FoulChainModalProps> = ({
  visible,
  context,
  playersOnCourt,
  opponentPlayersOnCourt,
  myTeamId,
  trackOpponentStats,
  onComplete,
  onIgnore,
}) => {
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();
  const [selectedFoulPlayer, setSelectedFoulPlayer] = useState<Player | null>(null);
  const [basketMarked, setBasketMarked] = useState(false);
  const [basketPoints, setBasketPoints] = useState<2 | 3 | null>(null);
  const [lfsEnabled, setLfsEnabled] = useState(false);
  const [lfCount, setLfCount] = useState(2);
  const [lfResults, setLfResults] = useState<Array<"made" | "missed" | null>>([null, null]);

  useEffect(() => {
    if (visible) {
      setSelectedFoulPlayer(null);
      setBasketMarked(false);
      setBasketPoints(null);
      setLfsEnabled(false);
      setLfCount(2);
      setLfResults([null, null]);
    }
  }, [visible]);

  const handleBasketMarkedChange = (val: boolean) => {
    setBasketMarked(val);
    if (val) {
      // And One: force LF to Oui + 1 LF
      setLfsEnabled(true);
      setLfCount(1);
      setLfResults([null]);
    } else {
      setBasketPoints(null);
      // Keep lfsEnabled as-is, just reset LF count back to 2
      setLfCount(2);
      setLfResults([null, null]);
    }
  };

  const handleLfCountChange = (count: number) => {
    setLfCount(count);
    setLfResults(Array(count).fill(null));
  };

  const handleLfResult = (index: number, result: "made" | "missed") => {
    setLfResults((prev) => {
      const next = [...prev];
      next[index] = prev[index] === result ? null : result;
      return next;
    });
  };

  const isFoulCommitted = context?.mode === "foul_committed";

  const isValid =
    (!trackOpponentStats || selectedFoulPlayer !== null) &&
    (!basketMarked || basketPoints !== null) &&
    (!lfsEnabled || lfResults.every((r) => r !== null));

  const handleConfirm = () => {
    if (!isValid || !context) return;
    onComplete({
      foulPlayer: selectedFoulPlayer ?? undefined,
      basketPoints: basketMarked && basketPoints ? basketPoints : undefined,
      freethrows: lfsEnabled ? (lfResults as Array<"made" | "missed">) : [],
    });
  };

  if (!context) return null;

  // If the player who drew the foul is on our team → opponent committed → show opponents
  // If the player who drew the foul is on the opponent team → our player committed → show our players
  const foulPlayerList = context.foulDrawnTeamId === myTeamId
    ? opponentPlayersOnCourt
    : playersOnCourt;

  const foulColor = ACTION_COLORS.foul.base;
  const accentColor = ACTION_COLORS.foulDrawn;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: sp.lg,
                gap: sp.lg,
              },
            ]}
          >
            {/* Header */}
            <Text style={[styles.header, { color: colors.text.secondary, fontSize: font.sm }]}>
              {isFoulCommitted
                ? `Faute commise — #${context.foulDrawnPlayerNumber}`
                : `Faute provoquée — #${context.foulDrawnPlayerNumber}`}
            </Text>

            {/* Foul player selection */}
            {trackOpponentStats && (
              <View style={{ gap: sp.sm }}>
                <Text style={[styles.sectionLabel, { color: colors.text.primary, fontSize: font.md }]}>
                  {isFoulCommitted ? "Qui a provoqué la faute ?" : "Qui a commis la faute ?"}
                </Text>
                <View style={[styles.playerRow, { gap: sp.xs }]}>
                  {foulPlayerList
                    .slice()
                    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                    .map((player) => {
                      const isSelected = selectedFoulPlayer?.id === player.id;
                      return (
                        <TouchableOpacity
                          key={player.id}
                          style={[
                            styles.playerCard,
                            {
                              backgroundColor: isSelected ? foulColor : foulColor + "15",
                              borderColor: foulColor,
                              padding: sp.xs,
                              borderRadius: sp.xs,
                            },
                          ]}
                          onPress={() => setSelectedFoulPlayer(isSelected ? null : player)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.playerNumber, { color: isSelected ? "#fff" : foulColor, fontSize: font.lg }]}>
                            {player.jerseyNumber}
                          </Text>
                          <Text style={[styles.playerName, { color: isSelected ? "#fff" : colors.text.secondary, fontSize: font.xs }]} numberOfLines={1}>
                            {player.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>
            )}

            {/* Separator */}
            <View style={{ height: 1, backgroundColor: colors.border }} />

            {/* Panier marqué */}
            <View style={{ gap: sp.sm }}>
              <View style={styles.toggleRow}>
                <Text style={[styles.sectionLabel, { color: colors.text.primary, fontSize: font.md }]}>
                  Panier marqué ?
                </Text>
                <View style={[styles.toggleBtns, { gap: sp.xs }]}>
                  {(["Non", "Oui"] as const).map((label) => {
                    const isOn = label === "Oui";
                    const isActive = basketMarked === isOn;
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor: isActive ? accentColor : accentColor + "15",
                            borderColor: accentColor,
                            paddingHorizontal: sp.md,
                            paddingVertical: sp.xs,
                            borderRadius: sp.xs,
                          },
                        ]}
                        onPress={() => handleBasketMarkedChange(isOn)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: isActive ? "#fff" : accentColor, fontSize: font.sm, fontWeight: "700" }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {basketMarked && (
                <View style={[styles.toggleBtns, { gap: sp.sm }]}>
                  {([2, 3] as const).map((pts) => {
                    const isActive = basketPoints === pts;
                    return (
                      <TouchableOpacity
                        key={pts}
                        style={[
                          styles.ptsBtn,
                          {
                            backgroundColor: isActive ? accentColor : accentColor + "15",
                            borderColor: accentColor,
                            flex: 1,
                            paddingVertical: sp.sm,
                            borderRadius: sp.xs,
                          },
                        ]}
                        onPress={() => setBasketPoints(isActive ? null : pts)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: isActive ? "#fff" : accentColor, fontSize: font.md, fontWeight: "700", textAlign: "center" }}>
                          {pts} pts
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Separator */}
            <View style={{ height: 1, backgroundColor: colors.border }} />

            {/* Lancers-francs */}
            <View style={{ gap: sp.md }}>
              <View style={styles.toggleRow}>
                <Text style={[styles.sectionLabel, { color: colors.text.primary, fontSize: font.md }]}>
                  Lancers-francs ?
                </Text>
                <View style={[styles.toggleBtns, { gap: sp.xs }]}>
                  {(["Non", "Oui"] as const).map((label) => {
                    const isOn = label === "Oui";
                    const isActive = lfsEnabled === isOn;
                    const isDisabled = basketMarked && !isOn;
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor: isDisabled
                              ? colors.surfaceVariant
                              : isActive ? STATUS_COLORS.info : STATUS_COLORS.info + "15",
                            borderColor: isDisabled ? colors.border : STATUS_COLORS.info,
                            paddingHorizontal: sp.md,
                            paddingVertical: sp.xs,
                            borderRadius: sp.xs,
                          },
                        ]}
                        onPress={() => {
                          if (isDisabled) return;
                          setLfsEnabled(isOn);
                          if (!isOn) setLfResults([]);
                        }}
                        activeOpacity={isDisabled ? 1 : 0.7}
                      >
                        <Text style={{ color: isDisabled ? colors.text.disabled : isActive ? "#fff" : STATUS_COLORS.info, fontSize: font.sm, fontWeight: "700" }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {lfsEnabled && (
                <View style={{ gap: sp.md }}>
                  {/* LF count — hidden when basket marked (forced to 1) */}
                  {!basketMarked && (
                    <View style={[styles.toggleBtns, { gap: sp.sm }]}>
                      {([1, 2, 3] as const).map((count) => {
                        const isActive = lfCount === count;
                        return (
                          <TouchableOpacity
                            key={count}
                            style={[
                              styles.lfCountBtn,
                              {
                                backgroundColor: isActive ? STATUS_COLORS.info : STATUS_COLORS.info + "15",
                                borderColor: STATUS_COLORS.info,
                                flex: 1,
                                paddingVertical: sp.xs,
                                borderRadius: sp.xs,
                              },
                            ]}
                            onPress={() => handleLfCountChange(count)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: isActive ? "#fff" : STATUS_COLORS.info, fontSize: font.md, fontWeight: "700", textAlign: "center" }}>
                              {count} LF
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* LF result rows */}
                  {lfResults.map((result, i) => (
                    <View key={i} style={[styles.lfRow, { gap: sp.sm }]}>
                      <Text style={[styles.lfLabel, { color: colors.text.secondary, fontSize: font.sm, width: 36 }]}>
                        LF {i + 1}
                      </Text>
                      {(["made", "missed"] as const).map((val) => {
                        const isActive = result === val;
                        const btnColor = val === "made" ? STATUS_COLORS.success : STATUS_COLORS.error;
                        return (
                          <TouchableOpacity
                            key={val}
                            style={[
                              styles.lfBtn,
                              {
                                backgroundColor: isActive ? btnColor : btnColor + "15",
                                borderColor: btnColor,
                                flex: 1,
                                paddingVertical: sp.xs,
                                borderRadius: sp.xs,
                              },
                            ]}
                            onPress={() => handleLfResult(i, val)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: isActive ? "#fff" : btnColor, fontSize: font.sm, fontWeight: "700", textAlign: "center" }}>
                              {val === "made" ? "✓ Réussi" : "✗ Raté"}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Valider */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: isValid ? STATUS_COLORS.success : colors.surfaceVariant,
                  paddingVertical: sp.sm,
                  borderRadius: sp.sm,
                },
              ]}
              onPress={handleConfirm}
              activeOpacity={isValid ? 0.8 : 1}
              disabled={!isValid}
            >
              <MaterialCommunityIcons name="check" size={sizes.iconMd} color={isValid ? "#fff" : colors.text.disabled} />
              <Text style={[styles.confirmText, { color: isValid ? "#fff" : colors.text.disabled, fontSize: font.md }]}>
                Valider
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onIgnore} style={styles.ignoreBtn} activeOpacity={0.6}>
              <Text style={[{ color: colors.text.tertiary, fontSize: font.sm, fontWeight: "500" }]}>
                Ignorer →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  container: {
    width: "90%",
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    textAlign: "center",
    fontWeight: "500",
  },
  sectionLabel: {
    fontWeight: "600",
  },
  playerRow: {
    flexDirection: "row",
  },
  playerCard: {
    flex: 1,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 0,
  },
  playerNumber: {
    fontWeight: "800",
  },
  playerName: {
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleBtns: {
    flexDirection: "row",
  },
  toggleBtn: {
    borderWidth: 1.5,
  },
  ptsBtn: {
    borderWidth: 1.5,
  },
  lfCountBtn: {
    borderWidth: 1.5,
  },
  lfRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lfLabel: {
    fontWeight: "500",
  },
  lfBtn: {
    borderWidth: 1.5,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmText: {
    fontWeight: "700",
  },
  ignoreBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
});
