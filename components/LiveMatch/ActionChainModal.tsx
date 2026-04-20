import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { ACTION_COLORS, STATUS_COLORS } from "../../src/theme/colors";
import { ReboundSpecification } from "../../src/models/ActionTypes";
import {
  ChainContext,
  ChainSuggestion,
  TeamId,
} from "../../constants/liveMatchConstants";
import { Player } from "../../models/Player";

interface ActionChainModalProps {
  visible: boolean;
  chainContext: ChainContext | null;
  playersOnCourt: Player[];
  opponentPlayersOnCourt: Player[];
  myTeamId: TeamId;
  onPlayerSelect: (suggestion: ChainSuggestion, player: Player) => void;
  onIgnore: () => void;
}

export const ActionChainModal: React.FC<ActionChainModalProps> = ({
  visible,
  chainContext,
  playersOnCourt,
  opponentPlayersOnCourt,
  myTeamId,
  onPlayerSelect,
  onIgnore,
}) => {
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedIndex(null);
      setSelectedPlayer(null);
    }
  }, [visible]);

  const handleSuggestionPress = (index: number) => {
    if (selectedIndex === index) {
      setSelectedIndex(null);
      setSelectedPlayer(null);
    } else {
      setSelectedIndex(index);
      setSelectedPlayer(null);
    }
  };

  const handleConfirm = () => {
    if (selectedIndex === null || !selectedPlayer || !chainContext) return;
    onPlayerSelect(chainContext.suggestions[selectedIndex], selectedPlayer);
  };

  if (!chainContext) return null;

  const activeSuggestion =
    selectedIndex !== null ? chainContext.suggestions[selectedIndex] : null;
  const isDefensiveActive =
    activeSuggestion?.specification === ReboundSpecification.DEFENSIVE;
  const confirmColor = activeSuggestion
    ? isDefensiveActive
      ? ACTION_COLORS.rebound.defensive
      : ACTION_COLORS.rebound.offensive
    : STATUS_COLORS.success;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              padding: sp.lg,
              gap: sp.md,
            },
          ]}
        >
          <Text style={[styles.triggerText, { color: colors.text.secondary, fontSize: font.sm }]}>
            {chainContext.triggerDescription}
          </Text>

          <Text style={[styles.title, { color: colors.text.primary, fontSize: font.xl }]}>
            Action suivante ?
          </Text>

          <View style={{ gap: sp.lg }}>
            {chainContext.suggestions.map((suggestion, index) => {
              const isSelected = selectedIndex === index;
              const isDefensive = suggestion.specification === ReboundSpecification.DEFENSIVE;
              const accentColor = isDefensive
                ? ACTION_COLORS.rebound.defensive
                : ACTION_COLORS.rebound.offensive;
              const players = suggestion.teamTab === myTeamId
                ? playersOnCourt
                : opponentPlayersOnCourt;

              return (
                <View key={index}>
                  <TouchableOpacity
                    style={[
                      styles.suggestionBtn,
                      {
                        backgroundColor: isSelected ? accentColor : accentColor + "15",
                        borderColor: accentColor,
                        borderWidth: 1.5,
                        paddingVertical: sp.sm,
                        paddingHorizontal: sp.md,
                        borderRadius: sp.sm,
                      },
                    ]}
                    onPress={() => handleSuggestionPress(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggestionLabel, { color: isSelected ? "#fff" : accentColor, fontSize: font.md }]}>
                      {suggestion.label}
                    </Text>
                    <Text style={[styles.teamLabel, { color: isSelected ? "#fff" : colors.text.secondary, fontSize: font.xs }]}>
                      {suggestion.teamLabel}
                    </Text>
                  </TouchableOpacity>

                  {isSelected && (
                    <View style={[styles.playerRow, { marginTop: sp.xs, gap: sp.xs }]}>
                      {players
                        .slice()
                        .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                        .map((player) => {
                          const isPlayerSelected = selectedPlayer?.id === player.id;
                          return (
                            <TouchableOpacity
                              key={player.id}
                              style={[
                                styles.playerCard,
                                {
                                  backgroundColor: isPlayerSelected
                                    ? accentColor
                                    : accentColor + "15",
                                  borderColor: accentColor,
                                  borderWidth: 1,
                                  padding: sp.xs,
                                  borderRadius: sp.xs,
                                },
                              ]}
                              onPress={() =>
                                setSelectedPlayer(isPlayerSelected ? null : player)
                              }
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.playerNumber, { color: isPlayerSelected ? "#fff" : accentColor, fontSize: font.lg }]}>
                                {player.jerseyNumber}
                              </Text>
                              <Text
                                style={[styles.playerName, { color: isPlayerSelected ? "#fff" : colors.text.secondary, fontSize: font.xs }]}
                                numberOfLines={1}
                              >
                                {player.name.split(" ").pop()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Valider — visible uniquement quand un joueur est sélectionné */}
          {selectedPlayer && (
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: confirmColor,
                  paddingVertical: sp.sm,
                  borderRadius: sp.sm,
                  marginTop: sp.xs,
                },
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="check" size={sizes.iconMd} color="#fff" />
              <Text style={[styles.confirmText, { fontSize: font.md }]}>
                Valider
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onIgnore}
            style={[styles.ignoreBtn, { marginTop: selectedPlayer ? 0 : sp.xs }]}
            activeOpacity={0.6}
          >
            <Text style={[styles.ignoreText, { color: colors.text.tertiary, fontSize: font.sm }]}>
              Ignorer →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
  },
  triggerText: {
    textAlign: "center",
    fontWeight: "500",
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
  },
  suggestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionLabel: {
    fontWeight: "700",
  },
  teamLabel: {
    fontStyle: "italic",
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
    color: "#fff",
    fontWeight: "700",
  },
  ignoreBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  ignoreText: {
    fontWeight: "500",
  },
});
