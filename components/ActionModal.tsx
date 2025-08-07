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
import { ACTION_DEFINITIONS } from "./ActionSystem";

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  onTeamSelect: (team: "A" | "B") => void;
  onActionSelect: (action: string) => void;
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
  selectedTeam: "A" | "B" | null;
  selectedAction: string | null;
  selectedSpec: string | null;
  players: Array<{
    id: number;
    num: number;
    name: string;
  }>;
  teamMode: "A" | "B" | "both";
  teamA: string;
  teamB: string;
}

const MODAL_WIDTH = 220;
const MODAL_HEIGHT = 160;
const POINTER_SIZE = 12;
const MODAL_CONTENT_PADDING = 16;

export default function ActionModal({
  visible,
  onClose,
  onTeamSelect,
  onActionSelect,
  onSpecificationSelect,
  onPlayerSelect,
  onGoBack,
  position,
  currentStep,
  selectedTeam,
  selectedAction,
  selectedSpec,
  players,
  teamMode,
  teamA,
  teamB,
}: ActionModalProps) {
  const renderBackButton = () => {
    if (currentStep === 1) return null;

    return (
      <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
    );
  };

  const renderTeamSelection = () => {
    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
          onPress={() => onTeamSelect("A")}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🏀</Text>
          <Text style={styles.actionLabel}>{teamA}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
          onPress={() => onTeamSelect("B")}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🏀</Text>
          <Text style={styles.actionLabel}>{teamB}</Text>
        </TouchableOpacity>
      </View>
    );
  };

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

  const renderPlayerSelection = () => {
    return (
      <View style={styles.actionsContainer}>
        <ScrollView
          style={styles.playerScrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.playerScrollContent}
        >
          {players.map((player, index) => (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.playerButton,
                index < players.length - 1 && styles.actionButtonMargin,
              ]}
              onPress={() => onPlayerSelect(player.num)}
              activeOpacity={0.8}
            >
              <View style={styles.playerNumber}>
                <Text style={styles.playerNumberText}>{player.num}</Text>
              </View>
              <Text style={styles.playerName}>{player.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Team selection step (only for "both" mode)
        return teamMode === "both"
          ? renderTeamSelection()
          : renderActionSelection();
      case 2:
        return renderActionSelection();
      case 3:
        return renderSpecificationSelection();
      case 4:
        return renderPlayerSelection();
      default:
        return renderActionSelection();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.actionModal,
            {
              left: position.x,
              top: position.y,
              height: MODAL_HEIGHT, // 🎯 Taille constante, plus de changement à l'étape 4
            },
          ]}
          onPress={(e) => {
            // 🎯 Empêcher la propagation de l'événement pour éviter la fermeture
            e.stopPropagation();
          }}
        >
          {/* Pointer */}
          <View
            style={[
              styles.pointer,
              position.showPointerOnTop
                ? styles.pointerTop
                : styles.pointerBottom,
              { left: position.pointerX - POINTER_SIZE },
            ]}
          />

          {/* Bouton retour en position absolue */}
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
    position: "absolute", // 🎯 Position absolue pour flotter au-dessus
    top: 8, // 🎯 8px du haut de la modal
    left: 8, // 🎯 8px du côté gauche de la modal
    width: 28, // 🎯 Bouton rond compact
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14, // 🎯 Complètement rond
    zIndex: 10, // 🎯 Au-dessus du contenu
    shadowColor: "#000", // 🎯 Ombre légère pour le détacher du fond
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // 🎯 Élévation pour Android
  },
  backButtonText: {
    fontSize: 14,
    marginBottom: 5, // 🎯 Légèrement plus petit dans le coin
    color: "#666",
    fontWeight: "900", // 🎯 Épais pour la visibilité
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
  // 🎯 SCROLLVIEW ACTIONS - Ajustable !
  actionScrollView: {
    maxHeight: 130, // Hauteur max pour les actions (ajustable ici)
  },
  actionScrollContent: {
    flexGrow: 1,
  },
  // 🎯 SCROLLVIEW JOUEURS - Ajustable !
  playerScrollView: {
    maxHeight: 130, // 👈 AJUSTE ICI la taille de la scrollview des joueurs !
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
    borderTopColor: "white",
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
