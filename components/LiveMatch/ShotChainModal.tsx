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
import { ShotChainContext, TeamId } from "../../constants/liveMatchConstants";
import { Player } from "../../models/Player";
import { ReboundSpecification } from "../../src/models/ActionTypes";

export interface ShotChainResult {
  blockerPlayer?: Player;
  reboundSpec?: ReboundSpecification;
  reboundPlayer?: Player;
  reboundTeamId?: TeamId;
}

interface ShotChainModalProps {
  visible: boolean;
  context: ShotChainContext | null;
  playersOnCourt: Player[];
  opponentPlayersOnCourt: Player[];
  myTeamId: TeamId;
  trackOpponentStats: boolean;
  onComplete: (result: ShotChainResult) => void;
  onIgnore: () => void;
}

export const ShotChainModal: React.FC<ShotChainModalProps> = ({
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

  const [blocked, setBlocked] = useState(false);
  const [blockerPlayer, setBlockerPlayer] = useState<Player | null>(null);
  const [reboundSpec, setReboundSpec] = useState<ReboundSpecification | null>(null);
  const [reboundPlayer, setReboundPlayer] = useState<Player | null>(null);
  const [reboundTeamId, setReboundTeamId] = useState<TeamId | null>(null);

  useEffect(() => {
    if (visible) {
      setBlocked(false);
      setBlockerPlayer(null);
      setReboundSpec(null);
      setReboundPlayer(null);
      setReboundTeamId(null);
    }
  }, [visible]);

  if (!context) return null;

  // The team that shot is determined by shotTeamId
  const isShotByMyTeam = context.shotTeamId === myTeamId;

  // Blocker list: always opponents of the shooting team
  const blockerList = isShotByMyTeam ? opponentPlayersOnCourt : playersOnCourt;

  // Rebound lists depend on reboundSpec
  // Defensive rebound: opponents of shooting team
  // Offensive rebound: shooting team (excluding shooter)
  const defensiveReboundList = isShotByMyTeam
    ? opponentPlayersOnCourt
    : playersOnCourt;
  const offensiveReboundList = (isShotByMyTeam ? playersOnCourt : opponentPlayersOnCourt)
    .filter((p) => p.id !== context.shotPlayerId);

  const currentReboundList =
    reboundSpec === ReboundSpecification.DEFENSIVE
      ? defensiveReboundList
      : reboundSpec === ReboundSpecification.OFFENSIVE
      ? offensiveReboundList
      : [];

  const handleBlockedChange = (val: boolean) => {
    setBlocked(val);
    if (!val) setBlockerPlayer(null);
  };

  const handleReboundSpec = (spec: ReboundSpecification) => {
    if (reboundSpec === spec) {
      setReboundSpec(null);
      setReboundPlayer(null);
      setReboundTeamId(null);
    } else {
      setReboundSpec(spec);
      setReboundPlayer(null);
      setReboundTeamId(spec === ReboundSpecification.TEAM && !trackOpponentStats ? myTeamId : null);
    }
  };

  const isValid =
    (!blocked || blockerPlayer !== null) &&
    reboundSpec !== null &&
    (reboundSpec === ReboundSpecification.TEAM
      ? reboundTeamId !== null
      : reboundPlayer !== null);

  // Show rebound section if trackOpponentStats (both teams) or if shot is by my team
  const showReboundSection = trackOpponentStats || isShotByMyTeam;

  const blockColor = ACTION_COLORS.block;
  const reboundColor = ACTION_COLORS.rebound.base;

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
              Tir raté — #{context.shotPlayerNumber}
            </Text>

            {/* Tir contré ? — caché si stats adverses non trackées (bloqueur = adverse) */}
            {trackOpponentStats && <View style={{ gap: sp.md }}>
              <View style={styles.toggleRow}>
                <Text style={[styles.sectionLabel, { color: colors.text.primary, fontSize: font.md }]}>
                  Tir contré ?
                </Text>
                <View style={[styles.toggleBtns, { gap: sp.xs }]}>
                  {(["Non", "Oui"] as const).map((label) => {
                    const isOn = label === "Oui";
                    const isActive = blocked === isOn;
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor: isActive ? blockColor : blockColor + "15",
                            borderColor: blockColor,
                            paddingHorizontal: sp.md,
                            paddingVertical: sp.xs,
                            borderRadius: sp.xs,
                          },
                        ]}
                        onPress={() => handleBlockedChange(isOn)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: isActive ? "#fff" : blockColor, fontSize: font.sm, fontWeight: "700" }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {blocked && (
                <View style={[styles.playerRow, { gap: sp.xs }]}>
                  {blockerList
                    .slice()
                    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                    .map((player) => {
                      const isSelected = blockerPlayer?.id === player.id;
                      return (
                        <TouchableOpacity
                          key={player.id}
                          style={[
                            styles.playerCard,
                            {
                              backgroundColor: isSelected ? blockColor : blockColor + "15",
                              borderColor: blockColor,
                              padding: sp.xs,
                              borderRadius: sp.xs,
                            },
                          ]}
                          onPress={() => setBlockerPlayer(isSelected ? null : player)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.playerNumber, { color: isSelected ? "#fff" : blockColor, fontSize: font.lg }]}>
                            {player.jerseyNumber}
                          </Text>
                          <Text style={[styles.playerName, { color: isSelected ? "#fff" : colors.text.secondary, fontSize: font.xs }]} numberOfLines={1}>
                            {player.name.split(" ").pop()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </View>}

            {/* Separator */}
            <View style={{ height: 1, backgroundColor: colors.border }} />

            {/* Rebond */}
            {showReboundSection && (
              <View style={{ gap: sp.md }}>
                <Text style={[styles.sectionLabel, { color: colors.text.primary, fontSize: font.md }]}>
                  Rebond
                </Text>

                {/* Défensif / Offensif / Équipe — Offensif caché si stats adverses non trackées */}
                <View style={[styles.toggleBtns, { gap: sp.sm }]}>
                  {([
                    { spec: ReboundSpecification.DEFENSIVE, label: "Défensif", color: ACTION_COLORS.rebound.defensive },
                    { spec: ReboundSpecification.OFFENSIVE, label: "Offensif", color: ACTION_COLORS.rebound.offensive },
                    { spec: ReboundSpecification.TEAM, label: "Équipe", color: ACTION_COLORS.rebound.base },
                  ] as const).filter(({ spec }) =>
                    trackOpponentStats || spec !== ReboundSpecification.DEFENSIVE
                  ).map(({ spec, label, color }) => {
                    const isActive = reboundSpec === spec;
                    return (
                      <TouchableOpacity
                        key={spec}
                        style={[
                          styles.reboundBtn,
                          {
                            backgroundColor: isActive ? color : color + "15",
                            borderColor: color,
                            flex: 1,
                            paddingVertical: sp.sm,
                            borderRadius: sp.xs,
                          },
                        ]}
                        onPress={() => handleReboundSpec(spec)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: isActive ? "#fff" : color, fontSize: font.md, fontWeight: "700", textAlign: "center" }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Team toggle for TEAM rebound — caché si stats adverses non trackées (auto = mon équipe) */}
                {reboundSpec === ReboundSpecification.TEAM && trackOpponentStats && (
                  <View style={[styles.toggleBtns, { gap: sp.sm }]}>
                    {([
                      { label: "Mon équipe", teamId: myTeamId },
                      { label: "Adversaire", teamId: myTeamId === TeamId.HOME ? TeamId.AWAY : TeamId.HOME },
                    ] as const).map(({ label, teamId }) => {
                      const isActive = reboundTeamId === teamId;
                      const color = ACTION_COLORS.rebound.base;
                      return (
                        <TouchableOpacity
                          key={teamId}
                          style={[
                            styles.reboundBtn,
                            {
                              backgroundColor: isActive ? color : color + "15",
                              borderColor: color,
                              flex: 1,
                              paddingVertical: sp.sm,
                              borderRadius: sp.xs,
                            },
                          ]}
                          onPress={() => setReboundTeamId(isActive ? null : teamId)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: isActive ? "#fff" : color, fontSize: font.md, fontWeight: "700", textAlign: "center" }}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Player list for individual rebound */}
                {reboundSpec !== null && reboundSpec !== ReboundSpecification.TEAM && (
                  <View style={[styles.playerRow, { gap: sp.xs }]}>
                    {currentReboundList
                      .slice()
                      .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                      .map((player) => {
                        const isSelected = reboundPlayer?.id === player.id;
                        const color = reboundSpec === ReboundSpecification.DEFENSIVE
                          ? ACTION_COLORS.rebound.defensive
                          : ACTION_COLORS.rebound.offensive;
                        return (
                          <TouchableOpacity
                            key={player.id}
                            style={[
                              styles.playerCard,
                              {
                                backgroundColor: isSelected ? color : color + "15",
                                borderColor: color,
                                padding: sp.xs,
                                borderRadius: sp.xs,
                              },
                            ]}
                            onPress={() => setReboundPlayer(isSelected ? null : player)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.playerNumber, { color: isSelected ? "#fff" : color, fontSize: font.lg }]}>
                              {player.jerseyNumber}
                            </Text>
                            <Text style={[styles.playerName, { color: isSelected ? "#fff" : colors.text.secondary, fontSize: font.xs }]} numberOfLines={1}>
                              {player.name.split(" ").pop()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </View>
            )}

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
              onPress={() => {
                if (!isValid) return;
                onComplete({
                  blockerPlayer: blocked ? (blockerPlayer ?? undefined) : undefined,
                  reboundSpec: reboundSpec ?? undefined,
                  reboundPlayer: reboundPlayer ?? undefined,
                  reboundTeamId: reboundTeamId ?? undefined,
                });
              }}
              activeOpacity={isValid ? 0.8 : 1}
              disabled={!isValid}
            >
              <MaterialCommunityIcons name="check" size={sizes.iconMd} color={isValid ? "#fff" : colors.text.disabled} />
              <Text style={[styles.confirmText, { color: isValid ? "#fff" : colors.text.disabled, fontSize: font.md }]}>
                Valider
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onIgnore} style={styles.ignoreBtn} activeOpacity={0.6}>
              <Text style={{ color: colors.text.tertiary, fontSize: font.sm, fontWeight: "500" }}>
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
  reboundBtn: {
    borderWidth: 1.5,
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
