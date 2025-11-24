/**
 * HistoryBottomSheet
 *
 * Bottom sheet displaying chronological list of all recorded match actions.
 * Allows viewing action details and deleting individual actions.
 *
 * Features:
 * - Chronological action list with time, player, team
 * - Color-coded by team (green/blue)
 * - Action icons and descriptions
 * - Delete action with confirmation modal
 * - Empty state message when no actions
 * - Adapts to portrait/landscape orientation
 *
 * Action Display:
 * - Shows player name, jersey number, team
 * - Action icon from ActionSystem
 * - Formatted action description (English)
 * - Period and time information
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { ActionData } from "./ActionSystemModal";
import { getActionIcon } from "./ActionSystem";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  SHOT_SPECIFICATION_FR,
  REBOUND_SPECIFICATION_FR,
  FOUL_SPECIFICATION_FR,
} from "../src/models/ActionTypes";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS, TEAM_CHART_COLORS } from "../src/theme";

interface Player {
  id: number;
  num: number;
  name: string;
  isSubstitute: boolean;
}

interface HistoryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  players: Player[];
  completedActions: ActionData[];
  onDeleteAction: (actionIndex: number) => void;
  teamA: string;
  teamB: string;
  isPortrait: boolean; // Add orientation prop
}

export default function HistoryBottomSheet({
  visible,
  onClose,
  players,
  completedActions,
  onDeleteAction,
  teamA,
  teamB,
  isPortrait,
}: HistoryBottomSheetProps) {
  const { colors } = useTheme();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<number | null>(null);

  // Get player name by number
  const getPlayerName = (playerNum: number) => {
    const player = players.find((p) => p.num === playerNum);
    return player ? player.name : `Joueur #${playerNum}`;
  };

  // Get team name by team code
  const getTeamName = (team: "A" | "B") => {
    return team === "A" ? teamA : teamB;
  };

  // Get team color
  const getTeamColor = (team: "A" | "B") => {
    return team === "A" ? TEAM_CHART_COLORS.teamA : TEAM_CHART_COLORS.teamB;
  };

  // Format action description
  const formatActionDescription = (action: ActionData) => {
    const playerNum = action.player || 0;
    const playerName = getPlayerName(playerNum);
    const teamName = getTeamName(action.team);
    let description = `${teamName} - ${playerName} - #${playerNum}`;

    switch (action.type) {
      case ActionType.SHOT:
        const shotSpec = action.specification as ShotSpecification;
        const shotLabel = SHOT_SPECIFICATION_FR[shotSpec] || action.specification;
        const points = action.points || 0;
        description += ` - Tir ${shotLabel}${points > 0 ? ` (${points} pts)` : ''}`;
        break;
      case ActionType.REBOUND:
        const reboundSpec = action.specification as ReboundSpecification;
        const reboundLabel = REBOUND_SPECIFICATION_FR[reboundSpec] || action.specification;
        description += ` - Rebond ${reboundLabel}`;
        break;
      case ActionType.FOUL:
        const foulSpec = action.specification as FoulSpecification;
        const foulLabel = FOUL_SPECIFICATION_FR[foulSpec] || action.specification;
        description += ` - Faute ${foulLabel}`;
        break;
      case ActionType.ASSIST:
        description += " - Passe décisive";
        break;
      case ActionType.STEAL:
        description += " - Interception";
        break;
      case ActionType.BLOCK:
        description += " - Contre";
        break;
      case ActionType.TURNOVER:
        description += " - Perte de balle";
        break;
      default:
        description += ` - ${action.type} ${action.specification || ""}`;
    }

    return description;
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Sort actions by timestamp (most recent first)
  const sortedActions = [...completedActions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Handle delete action
  const handleDeleteAction = (index: number) => {
    // Find the original index in completedActions array
    const actionToDeleteData = sortedActions[index];
    const originalIndex = completedActions.findIndex(
      (action) =>
        action.timestamp === actionToDeleteData.timestamp &&
        action.type === actionToDeleteData.type &&
        action.player === actionToDeleteData.player
    );

    setActionToDelete(originalIndex);
    setShowDeleteConfirmation(true);
  };

  // Confirm delete action
  const confirmDeleteAction = () => {
    if (actionToDelete !== null) {
      onDeleteAction(actionToDelete);
    }
    setShowDeleteConfirmation(false);
    setActionToDelete(null);
  };

  // Cancel delete action
  const cancelDeleteAction = () => {
    setShowDeleteConfirmation(false);
    setActionToDelete(null);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType={isPortrait ? "slide" : "fade"}
      onRequestClose={onClose}
    >
      <View
        style={
          isPortrait
            ? styles.historySheetOverlay
            : styles.historySheetOverlayLandscape
        }
      >
        <TouchableOpacity
          style={styles.historySheetBackdrop}
          onPress={onClose}
        />
        <View
          style={[
            isPortrait
              ? styles.historySheetContainer
              : styles.historySheetContainerLandscape,
            { backgroundColor: colors.surface }
          ]}
        >
          <View style={[styles.historySheetHandle, { backgroundColor: colors.text.disabled }]} />
          <Text style={[styles.historySheetTitle, { color: colors.text.primary }]}>Historique des actions</Text>

          {sortedActions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                Aucune action enregistrée
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.text.tertiary }]}>
                Les actions apparaîtront ici une fois que vous en aurez
                enregistré
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              {sortedActions.map((action, index) => (
                <View
                  key={`${action.timestamp}-${index}`}
                  style={[styles.actionItem, { backgroundColor: colors.surfaceVariant }]}
                >
                  {/* Color indicator bar */}
                  <View
                    style={[
                      styles.teamColorBar,
                      { backgroundColor: getTeamColor(action.team) },
                    ]}
                  />

                  <View style={styles.actionHeader}>
                    <View
                      style={[
                        styles.actionIconContainer,
                        { backgroundColor: `${getTeamColor(action.team)}20` },
                      ]}
                    >
                      <Text style={styles.actionIcon}>
                        {getActionIcon(action.type, action.specification)}
                      </Text>
                    </View>
                    <View style={styles.actionDetails}>
                      <Text style={[styles.actionDescription, { color: colors.text.primary }]}>
                        {formatActionDescription(action)}
                      </Text>
                      <Text style={[styles.actionTime, { color: colors.text.tertiary }]}>
                        {formatTime(new Date(action.timestamp))}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.deleteButton, { backgroundColor: STATUS_COLORS.error + "20" }]}
                      onPress={() => handleDeleteAction(index)}
                    >
                      <Text style={styles.deleteButtonIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: colors.text.secondary }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Confirmation Modal - same for both orientations */}
      <Modal
        transparent
        visible={showDeleteConfirmation}
        animationType="fade"
        onRequestClose={cancelDeleteAction}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.deleteModalTitle, { color: colors.text.primary }]}>
              Confirmer la suppression
            </Text>
            <Text style={[styles.deleteModalMessage, { color: colors.text.secondary }]}>
              Êtes-vous sûr de vouloir supprimer cette action ?
            </Text>

            {actionToDelete !== null && completedActions[actionToDelete] && (
              <View style={styles.deleteActionDetails}>
                <Text style={[styles.deleteActionTitle, { color: colors.text.secondary }]}>
                  Action à supprimer :
                </Text>
                <View
                  style={[
                    styles.deleteActionInfo,
                    {
                      borderLeftColor: getTeamColor(
                        completedActions[actionToDelete].team
                      ),
                      borderLeftWidth: 6,
                      paddingLeft: 16,
                      backgroundColor: colors.surfaceVariant,
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.deleteActionIconContainer,
                      {
                        backgroundColor: `${getTeamColor(
                          completedActions[actionToDelete].team
                        )}20`,
                      },
                    ]}
                  >
                    <Text style={styles.deleteActionIcon}>
                      {getActionIcon(
                        completedActions[actionToDelete].type,
                        completedActions[actionToDelete].specification
                      )}
                    </Text>
                  </View>
                  <View style={styles.deleteActionText}>
                    <Text style={[styles.deleteActionType, { color: colors.text.primary }]}>
                      {formatActionDescription(
                        completedActions[actionToDelete]
                      )}
                    </Text>
                    <Text style={[styles.deleteActionTime, { color: colors.text.tertiary }]}>
                      {formatTime(
                        new Date(completedActions[actionToDelete].timestamp)
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  styles.deleteModalButtonCancel,
                  { backgroundColor: colors.surfaceVariant }
                ]}
                onPress={cancelDeleteAction}
              >
                <Text style={[styles.deleteModalButtonTextCancel, { color: colors.text.secondary }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  styles.deleteModalButtonConfirm,
                  { backgroundColor: STATUS_COLORS.error }
                ]}
                onPress={confirmDeleteAction}
              >
                <Text style={[styles.deleteModalButtonTextConfirm, { color: COMMON_COLORS.white }]}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  historySheetOverlay: {
    flex: 1,
    backgroundColor: "transparent", // Remove dark overlay
    justifyContent: "flex-end",
  },
  historySheetBackdrop: {
    flex: 1,
  },
  historySheetContainer: {
    backgroundColor: "rgba(255,255,255,0.9)", // Increase opacity since no dark overlay
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "60%",
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  historySheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  historySheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  scrollContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  actionItem: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,123,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionDetails: {
    flex: 1,
  },
  actionDescription: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  actionTime: {
    fontSize: 12,
    color: "#666",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(220,53,69,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(220,53,69,0.3)",
  },
  deleteButtonIcon: {
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Delete confirmation modal styles
  deleteModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  deleteModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  deleteActionDetails: {
    marginBottom: 20,
    alignItems: "center",
  },
  deleteActionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  deleteActionInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  deleteActionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  deleteActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  deleteActionText: {
    flex: 1,
  },
  deleteActionType: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
  },
  deleteActionTime: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  deleteModalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  deleteModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
  },
  deleteModalButtonCancel: {
    backgroundColor: "#6c757d",
    borderColor: "#6c757d",
  },
  deleteModalButtonConfirm: {
    backgroundColor: "#dc3545",
    borderColor: "#dc3545",
  },
  deleteModalButtonTextCancel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteModalButtonTextConfirm: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  teamColorBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderRadius: 3,
  },
  historySheetOverlayLandscape: {
    flex: 1,
    backgroundColor: "transparent", // Remove dark overlay
    justifyContent: "center",
  },
  historySheetContainerLandscape: {
    backgroundColor: "rgba(255,255,255,0.9)", // Increase opacity since no dark overlay
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    padding: 20,
    minWidth: "40%",
    maxWidth: "60%",
    height: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    position: "absolute",
    right: 0,
  },
});
