/**
 * InitTeamModal
 *
 * Pre-game modal that allows user to configure team names and select team mode.
 * Features:
 * - Edit team names (if not from club)
 * - Swap teams
 * - Select team mode (manage Team A only, Team B only, or both)
 * - Shows which team is from the club (if applicable)
 */

import React from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../../src/theme";
import { logInfo } from "../../utils/logger";

interface InitTeamModalProps {
  visible: boolean;
  teamA: string;
  setTeamA: (v: string) => void;
  teamB: string;
  setTeamB: (v: string) => void;
  teamAId?: string | null;
  setTeamAId?: (v: string | null) => void;
  teamBId?: string | null;
  setTeamBId?: (v: string | null) => void;
  onConfirm: (teamMode: "A" | "B" | "BOTH") => void;
  isConfirmDisabled: boolean;
  getFormattedDate: () => string;
  onRequestClose: () => void;
  onBack?: () => void; // Callback to go back to team selection
  canGoBack?: boolean; // Show back button only if team was selected
  onGoToMenu?: () => void; // Callback to go to menu (if no team selected)
  hasClubTeam?: boolean; // Whether user has selected a club team
}

export default function InitTeamModal({
  visible,
  teamA,
  setTeamA,
  teamB,
  setTeamB,
  teamAId,
  setTeamAId,
  teamBId,
  setTeamBId,
  onConfirm,
  isConfirmDisabled,
  getFormattedDate,
  onRequestClose,
  onBack,
  canGoBack = false,
  onGoToMenu,
  hasClubTeam = false,
}: InitTeamModalProps) {
  const { colors } = useTheme();
  const [selectedTeamMode, setSelectedTeamMode] = React.useState<
    "A" | "B" | "BOTH" | null
  >(null);

  // Track if teams have been swapped
  const [teamsSwapped, setTeamsSwapped] = React.useState(false);

  /**
   * Reset selection states when modal opens
   * Ensures clean state when user returns to this modal
   */
  React.useEffect(() => {
    if (visible) {
      logInfo("InitTeamModal", "👁️ Modal opened, resetting selection states");
      setSelectedTeamMode(null);
      setTeamsSwapped(false);
    }
  }, [visible]);

  const isFullyDisabled = isConfirmDisabled || selectedTeamMode === null;

  // Determine which team is from the club
  // Only if user has a club team (hasClubTeam), the club team depends on swap status
  // Initially club is Team A, but if swapped, club becomes Team B
  const clubTeam = hasClubTeam ? (teamsSwapped ? "B" : "A") : null;

  /**
   * Handle confirm button click
   * Proceeds to match configuration with selected team mode
   */
  const handleConfirm = () => {
    if (!selectedTeamMode) return;

    logInfo("InitTeamModal", "✅ User confirmed team setup", {
      teamA,
      teamB,
      teamMode: selectedTeamMode,
      hasClubTeam,
      clubTeam,
      teamsSwapped,
    });

    onConfirm(selectedTeamMode);
  };

  /**
   * Swap teams A and B
   * Swaps names, IDs, and resets team mode selection
   */
  const swapTeams = () => {
    logInfo("InitTeamModal", "🔄 User swapped teams", {
      previousTeamA: teamA,
      previousTeamB: teamB,
      newTeamA: teamB,
      newTeamB: teamA,
    });

    const tempTeamA = teamA;
    setTeamA(teamB);
    setTeamB(tempTeamA);

    // Also swap team IDs if setters are provided
    if (setTeamAId && setTeamBId) {
      const tempTeamAId = teamAId;
      setTeamAId(teamBId || null);
      setTeamBId(tempTeamAId || null);
    }

    // Toggle swap state
    setTeamsSwapped(!teamsSwapped);
    // Reset team mode selection when swapping
    setSelectedTeamMode(null);
  };

  /**
   * Handle back button click
   * Returns to team selection (if team was selected) or menu (if no team)
   */
  const handleBack = () => {
    if (canGoBack && onBack) {
      logInfo(
        "InitTeamModal",
        "◀️ User clicked back button, returning to team selection"
      );
      onBack();
    } else if (!canGoBack && onGoToMenu) {
      logInfo(
        "InitTeamModal",
        "◀️ User clicked back button, returning to menu"
      );
      onGoToMenu();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        logInfo("InitTeamModal", "🔙 Hardware back button pressed");
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
              marginBottom: 16,
              textAlign: "center",
              color: colors.text.primary,
            }}
          >
            {getFormattedDate()}
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 10,
              width: 200,
              marginBottom: 2,
              textAlign: "center",
              fontSize: 16,
              backgroundColor: colors.background,
              color: colors.text.primary,
            }}
            value={teamA}
            onChangeText={setTeamA}
            placeholder="Nom équipe A"
            placeholderTextColor={colors.text.disabled}
          />
          <Text
            style={{
              fontSize: 12,
              color: colors.text.tertiary,
              marginBottom: 8,
            }}
          >
            Domicile
          </Text>

          {/* VS with swap button */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 4,
              width: 200,
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 20,
                padding: 4,
                borderWidth: 1,
                borderColor: colors.border,
                minWidth: 30,
                minHeight: 30,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -25,
              }}
              onPress={swapTeams}
            >
              <MaterialCommunityIcons
                name="swap-vertical"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: colors.text.primary,
              }}
            >
              VS
            </Text>
            <View style={{ width: 30 }} />
          </View>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 10,
              width: 200,
              marginBottom: 2,
              textAlign: "center",
              fontSize: 16,
              backgroundColor: colors.background,
              color: colors.text.primary,
            }}
            value={teamB}
            onChangeText={setTeamB}
            placeholder="Nom équipe B"
            placeholderTextColor={colors.text.disabled}
          />
          <Text
            style={{
              fontSize: 12,
              color: colors.text.tertiary,
              marginBottom: 16,
            }}
          >
            Extérieur
          </Text>

          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 12,
              color: colors.text.primary,
            }}
          >
            Quelle équipe gérez-vous ?
          </Text>

          {[
            { key: "A", label: `${teamA || "Team A"} (Domicile)` },
            { key: "B", label: `${teamB || "Team B"} (Extérieur)` },
            { key: "BOTH", label: "Les deux équipes" },
          ].map((option) => {
            // Disable Team B if club team is Team A, disable Team A if club team is Team B
            const isDisabled = !!(
              clubTeam &&
              option.key !== clubTeam &&
              option.key !== "BOTH"
            );

            return (
              <TouchableOpacity
                key={option.key}
                disabled={isDisabled}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 4,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor:
                    selectedTeamMode === option.key
                      ? STATUS_COLORS.info + "20"
                      : "transparent",
                  borderWidth: 1,
                  borderColor:
                    selectedTeamMode === option.key
                      ? STATUS_COLORS.info
                      : isDisabled
                      ? colors.surfaceVariant
                      : colors.border,
                  minWidth: 250,
                  opacity: isDisabled ? 0.4 : 1,
                }}
                onPress={() => {
                  const mode = option.key as "A" | "B" | "BOTH";
                  logInfo("InitTeamModal", "🎯 User selected team mode", {
                    selectedMode: mode,
                    modeLabel: option.label,
                  });
                  setSelectedTeamMode(mode);
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor:
                      selectedTeamMode === option.key
                        ? STATUS_COLORS.info
                        : isDisabled
                        ? colors.text.disabled
                        : colors.border,
                    backgroundColor:
                      selectedTeamMode === option.key
                        ? STATUS_COLORS.info
                        : "transparent",
                    marginRight: 10,
                  }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color:
                      selectedTeamMode === option.key
                        ? STATUS_COLORS.info
                        : isDisabled
                        ? colors.text.disabled
                        : colors.text.primary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 16,
              justifyContent: "center",
            }}
          >
            {(canGoBack && onBack) || (!canGoBack && onGoToMenu) ? (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onPress={handleBack}
              >
                <Text
                  style={{
                    color: colors.text.secondary,
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  Retour
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={{
                backgroundColor: isFullyDisabled
                  ? colors.text.disabled
                  : STATUS_COLORS.success,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 32,
                opacity: isFullyDisabled ? 0.7 : 1,
              }}
              onPress={handleConfirm}
              disabled={isFullyDisabled}
            >
              <Text
                style={{
                  color: COMMON_COLORS.white,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Confirmer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
