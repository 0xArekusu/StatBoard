/**
 * ActionModal
 *
 * Modal UI component for recording basketball actions during a match.
 * Displays step-by-step selection interface positioned near the court tap location.
 *
 * Features:
 * - Multi-step flow: Team → Action Type → Points (if shot) → Specification → Player
 * - Positioned modal with pointer/triangle indicator showing tap location
 * - Back navigation with intelligent step management
 * - Conditional steps (team selection only in BOTH mode, points only for shots)
 * - Scrollable action/player lists for long content
 *
 * Architecture:
 * - Pure presentational component (no state management)
 * - State managed by parent (ActionSystem hook)
 * - Renders different content based on currentStep prop
 * - Modal positioned near court tap with pointer indicator
 *
 * Visual Design:
 * - 220x160px modal with rounded corners
 * - Pointer triangle pointing to tap location
 * - Color-coded action buttons
 * - Player buttons with jersey numbers
 */
import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { ACTION_DEFINITIONS } from "../src/config/actionConfig";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS } from "../src/theme";
import { Team } from "../src/models/types";

// Debug: Check if ACTION_DEFINITIONS is loaded
console.log(
  "[ActionModal] ACTION_DEFINITIONS loaded:",
  ACTION_DEFINITIONS?.length,
  "actions"
);

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  onTeamSelect: (team: Team) => void;
  onActionSelect: (action: string) => void;
  onPointsSelect: (points: number) => void;
  onSpecificationSelect: (spec: string) => void;
  onPlayerSelect: (playerNum: number) => void;
  onGoBack: () => void;
  position: {
    x: number;
    y: number;
    pointerX: number;
    showPointerOnTop: boolean;
  };
  currentStep: number;
  selectedTeam: Team | null;
  selectedAction: string | null;
  selectedPoints: number | null;
  selectedSpec: string | null;
  players: Array<{
    id: number;
    num: number;
    name: string;
    team: Team;
    isSubstitute: boolean;
  }>;
  teamMode: Team | "BOTH";
  teamA: string;
  teamB: string;
}

// Modal dimensions and styling constants
const MODAL_WIDTH = 220;
const MODAL_HEIGHT = 160;
const POINTER_SIZE = 12;
const MODAL_CONTENT_PADDING = 16;

export default function ActionModal({
  visible,
  onClose,
  onTeamSelect,
  onActionSelect,
  onPointsSelect,
  onSpecificationSelect,
  onPlayerSelect,
  onGoBack,
  position,
  currentStep,
  selectedTeam,
  selectedAction,
  selectedPoints,
  selectedSpec,
  players,
  teamMode,
  teamA,
  teamB,
}: ActionModalProps) {
  const { colors } = useTheme();

  /**
   * Render back button with conditional visibility
   * Hidden at step 1 and at step 2 for single-team mode
   */
  const renderBackButton = () => {
    // Don't show back button if we're at step 1
    if (currentStep === 1) return null;

    // If teamMode is not "BOTH", don't show back button at step 2
    // (because step 1 team selection was skipped)
    if (teamMode !== "BOTH" && currentStep === 2) return null;

    return (
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: colors.surfaceVariant }]}
        onPress={onGoBack}
      >
        <Text style={[styles.backButtonText, { color: colors.text.secondary }]}>
          ←
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Step 1: Team selection (only for BOTH mode)
   * Displays two buttons for MY_TEAM and OPPONENT
   */
  const renderTeamSelection = () => {
    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
          onPress={() => onTeamSelect(Team.MY_TEAM)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🏀</Text>
          <Text style={styles.actionLabel}>{teamA}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
          onPress={() => onTeamSelect(Team.OPPONENT)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🏀</Text>
          <Text style={styles.actionLabel}>{teamB}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Step 2 (or 1 in single-team): Action type selection
   * Scrollable list of all available action types (shot, rebound, foul, etc.)
   */
  const renderActionSelection = () => {
    return (
      <View style={styles.actionsContainer}>
        <ScrollView
          style={styles.actionScrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.actionScrollContent}
        >
          {ACTION_DEFINITIONS.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionButton,
                { backgroundColor: action.backgroundColor },
                index < ACTION_DEFINITIONS.length - 1 &&
                  styles.actionButtonMargin,
              ]}
              onPress={() => onActionSelect(action.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Step 3: Points selection (only for shots)
   * Displays 1pt, 2pt, 3pt options
   */
  const renderPointsSelection = () => {
    const currentAction = ACTION_DEFINITIONS.find(
      (a) => a.id === selectedAction
    );
    if (!currentAction || !currentAction.pointsOptions) return null;

    return (
      <View style={styles.actionsContainer}>
        <ScrollView
          style={styles.actionScrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.actionScrollContent}
        >
          {currentAction.pointsOptions.map((pointOption, index) => (
            <TouchableOpacity
              key={pointOption.id}
              style={[
                styles.actionButton,
                { backgroundColor: pointOption.color },
                index < currentAction.pointsOptions!.length - 1 &&
                  styles.actionButtonMargin,
              ]}
              onPress={() => onPointsSelect(pointOption.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{pointOption.icon}</Text>
              <Text style={styles.actionLabel}>{pointOption.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Step 4: Specification selection
   * Displays action-specific options (made/missed, offensive/defensive, etc.)
   */
  const renderSpecificationSelection = () => {
    const currentAction = ACTION_DEFINITIONS.find(
      (a) => a.id === selectedAction
    );
    if (!currentAction) return null;

    return (
      <View style={styles.actionsContainer}>
        <ScrollView
          style={styles.actionScrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.actionScrollContent}
        >
          {currentAction.specifications.map((spec, index) => (
            <TouchableOpacity
              key={spec.id}
              style={[
                styles.actionButton,
                { backgroundColor: spec.color },
                index < currentAction.specifications.length - 1 &&
                  styles.actionButtonMargin,
              ]}
              onPress={() => onSpecificationSelect(spec.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{spec.icon}</Text>
              <Text style={styles.actionLabel}>{spec.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Step 5: Player selection
   * Displays list of players with jersey numbers
   * Filters by selected team in BOTH mode
   */
  const renderPlayerSelection = () => {
    // Filter players according to selected team only if in "BOTH" mode
    const filteredPlayers =
      teamMode === "BOTH" && selectedTeam
        ? players.filter((player) => player.team === selectedTeam)
        : players;

    return (
      <View style={styles.actionsContainer}>
        <ScrollView
          style={styles.playerScrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.playerScrollContent}
        >
          {filteredPlayers.map((player, index) => (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.playerButton,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
                index < filteredPlayers.length - 1 && styles.actionButtonMargin,
              ]}
              onPress={() => onPlayerSelect(player.num)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.playerNumber,
                  { backgroundColor: STATUS_COLORS.success },
                ]}
              >
                <Text style={styles.playerNumberText}>{player.num}</Text>
              </View>
              <Text style={[styles.playerName, { color: colors.text.primary }]}>
                {player.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Render content for current step
   * Handles conditional step logic (team selection, points selection)
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Team selection step (only for "BOTH" mode)
        return teamMode === "BOTH"
          ? renderTeamSelection()
          : renderActionSelection();
      case 2:
        return renderActionSelection();
      case 3:
        // Points selection (only for shots)
        return renderPointsSelection();
      case 4:
        return renderSpecificationSelection();
      case 5:
        return renderPlayerSelection();
      default:
        return renderActionSelection();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.actionModal,
            {
              backgroundColor: colors.surface,
              left: position.x,
              top: position.y,
              height: MODAL_HEIGHT, // 🎯 Constant size, no more changes at step 4
            },
          ]}
          onPress={(e) => {
            // 🎯 Prevent event propagation to avoid closing
            e.stopPropagation();
          }}
        >
          {/* Pointer */}
          <View
            style={[
              styles.pointer,
              { borderTopColor: colors.surface },
              position.showPointerOnTop
                ? styles.pointerTop
                : styles.pointerBottom,
              { left: position.pointerX - POINTER_SIZE },
            ]}
          />

          {/* Back button in absolute position */}
          {renderBackButton()}

          {/* Modal Content */}
          <View style={styles.modalContent}>{renderStepContent()}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  actionModal: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 16,
    width: MODAL_WIDTH,
    minHeight: MODAL_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: "visible",
  },
  modalContent: {
    padding: MODAL_CONTENT_PADDING,
  },
  backButton: {
    position: "absolute", // 🎯 Absolute position to float above
    top: 8, // 🎯 8px from top of modal
    left: 8, // 🎯 8px from left side of modal
    width: 28, // 🎯 Compact round button
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14, // 🎯 Completely round
    zIndex: 10, // 🎯 Above content
    shadowColor: "#000", // 🎯 Light shadow to separate from background
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // 🎯 Elevation for Android
  },
  backButtonText: {
    fontSize: 14,
    marginBottom: 5, // 🎯 Slightly smaller in the corner
    color: "#666",
    fontWeight: "900", // 🎯 Thick for visibility
  },
  actionsContainer: {
    gap: 6,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    minHeight: 40,
    gap: 10,
  },
  actionButtonMargin: {
    marginBottom: 4,
  },
  actionIcon: {
    fontSize: 16,
    width: 20,
    textAlign: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    flex: 1,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // 🎯 SCROLLVIEW ACTIONS - Adjustable!
  actionScrollView: {
    maxHeight: 130, // Max height for actions (adjustable here)
  },
  actionScrollContent: {
    flexGrow: 1,
  },
  // 🎯 SCROLLVIEW PLAYERS - Adjustable!
  playerScrollView: {
    maxHeight: 130, // 👈 ADJUST HERE the size of the players scrollview!
  },
  playerScrollContent: {
    flexGrow: 1,
  },
  playerButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  playerNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1976d2",
    justifyContent: "center",
    alignItems: "center",
  },
  playerNumberText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  playerName: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  pointer: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: POINTER_SIZE,
    borderRightWidth: POINTER_SIZE,
    borderTopWidth: POINTER_SIZE,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    zIndex: 1,
  },
  pointerTop: {
    top: -POINTER_SIZE,
    transform: [{ rotate: "180deg" }],
  },
  pointerBottom: {
    bottom: -POINTER_SIZE,
  },
});
