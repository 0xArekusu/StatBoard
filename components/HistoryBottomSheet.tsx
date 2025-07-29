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

interface Player {
  id: number;
  num: number;
  name: string;
}

interface HistoryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  players: Player[];
  completedActions: ActionData[];
  onDeleteAction: (actionIndex: number) => void;
  teamA: string;
  teamB: string;
}

export default function HistoryBottomSheet({
  visible,
  onClose,
  players,
  completedActions,
  onDeleteAction,
  teamA,
  teamB,
}: HistoryBottomSheetProps) {
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
    return team === "A" ? "#4CAF50" : "#2196F3"; // Green for team A, Blue for team B
  };

  // Format action description
  const formatActionDescription = (action: ActionData) => {
    const playerNum = action.player || 0;
    const playerName = getPlayerName(playerNum);
    const teamName = getTeamName(action.team);
    let description = `${teamName} - ${playerName} - #${playerNum}`;

    switch (action.type) {
      case "tir":
        if (action.specification === "reussi") {
          description += " - Tir réussi"; // TODO: Add point value based on position
        } else if (action.specification === "rate") {
          description += " - Tir raté";
        }
        break;
      case "rebond":
        if (action.specification === "offensif") {
          description += " - Rebond offensif";
        } else if (action.specification === "defensif") {
          description += " - Rebond défensif";
        }
        break;
      case "faute":
        if (action.specification === "personnelle") {
          description += " - Faute personnelle";
        } else if (action.specification === "technique") {
          description += " - Faute technique";
        }
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.historySheetOverlay}>
        <TouchableOpacity
          style={styles.historySheetBackdrop}
          onPress={onClose}
        />
        <View style={styles.historySheetContainer}>
          <View style={styles.historySheetHandle} />
          <Text style={styles.historySheetTitle}>Historique des actions</Text>

          {sortedActions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Aucune action enregistrée
              </Text>
              <Text style={styles.emptyStateSubtext}>
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
                  style={styles.actionItem}
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
                      <Text style={styles.actionDescription}>
                        {formatActionDescription(action)}
                      </Text>
                      <Text style={styles.actionTime}>
                        {formatTime(new Date(action.timestamp))}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteAction(index)}
                    >
                      <Text style={styles.deleteButtonIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent
        visible={showDeleteConfirmation}
        animationType="fade"
        onRequestClose={cancelDeleteAction}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>
              Confirmer la suppression
            </Text>
            <Text style={styles.deleteModalMessage}>
              Êtes-vous sûr de vouloir supprimer cette action ?
            </Text>

            {actionToDelete !== null && completedActions[actionToDelete] && (
              <View style={styles.deleteActionDetails}>
                <Text style={styles.deleteActionTitle}>
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
                      backgroundColor: "rgba(255,255,255,0.9)",
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
                    <Text style={styles.deleteActionType}>
                      {formatActionDescription(
                        completedActions[actionToDelete]
                      )}
                    </Text>
                    <Text style={styles.deleteActionTime}>
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
                ]}
                onPress={cancelDeleteAction}
              >
                <Text style={styles.deleteModalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  styles.deleteModalButtonConfirm,
                ]}
                onPress={confirmDeleteAction}
              >
                <Text style={styles.deleteModalButtonTextConfirm}>
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
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  historySheetBackdrop: {
    flex: 1,
  },
  historySheetContainer: {
    backgroundColor: "rgba(255,255,255,0.7)",
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
});
