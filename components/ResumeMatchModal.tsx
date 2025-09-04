import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Match } from "../src/models/types";

interface ResumeMatchModalProps {
  visible: boolean;
  match: Match | null;
  onResumeMatch: () => void;
  onDiscardMatch: () => void;
  onGoBack: () => void;
}

export default function ResumeMatchModal({
  visible,
  match,
  onResumeMatch,
  onDiscardMatch,
  onGoBack,
}: ResumeMatchModalProps) {
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

  if (!match) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDiscardPress = () => {
    setShowDiscardConfirmation(true);
  };

  const confirmDiscard = () => {
    setShowDiscardConfirmation(false);
    onDiscardMatch();
  };

  const cancelDiscard = () => {
    setShowDiscardConfirmation(false);
  };

  if (showDiscardConfirmation) {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={cancelDiscard}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmationContainer}>
            <Text style={styles.confirmationTitle}>⚠️ Confirmer la suppression</Text>
            
            <Text style={styles.confirmationMessage}>
              Êtes-vous sûr de vouloir abandonner ce match ?
            </Text>
            
            <Text style={styles.warningText}>
              Le match sera marqué comme abandonné et toutes les données seront conservées dans l'historique, 
              mais vous ne pourrez plus le reprendre.
            </Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={cancelDiscard}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.discardButton]}
                onPress={confirmDiscard}
              >
                <Text style={styles.discardButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onGoBack}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>🏀 Match en cours détecté</Text>
          
          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle}>
              {match.team_a_name} vs {match.team_b_name}
            </Text>
            
            <Text style={styles.matchDate}>
              Commencé le {formatDate(match.created_at)}
            </Text>
            
            {match.started_at && (
              <Text style={styles.matchStarted}>
                Match démarré le {formatDate(match.started_at)}
              </Text>
            )}
          </View>

          <Text style={styles.message}>
            Voulez-vous reprendre ce match ou en commencer un nouveau ?
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.resumeButton]}
              onPress={onResumeMatch}
            >
              <Text style={styles.resumeButtonText}>
                🔄 Reprendre le match
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.newMatchButton]}
              onPress={handleDiscardPress}
            >
              <Text style={styles.newMatchButtonText}>
                🆕 Nouveau match
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={onGoBack}
            >
              <Text style={styles.backButtonText}>
                ← Menu principal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmationContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    color: "#d32f2f",
  },
  matchInfo: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  matchDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  matchStarted: {
    fontSize: 14,
    color: "#28a745",
    fontWeight: "500",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#555",
    lineHeight: 22,
  },
  confirmationMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    color: "#333",
    lineHeight: 22,
  },
  warningText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
    lineHeight: 20,
    fontStyle: "italic",
  },
  buttons: {
    gap: 12,
  },
  confirmationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeButton: {
    backgroundColor: "#28a745",
  },
  resumeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  newMatchButton: {
    backgroundColor: "#007AFF",
  },
  newMatchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    flex: 1,
  },
  cancelButtonText: {
    color: "#6c757d",
    fontSize: 16,
    fontWeight: "600",
  },
  discardButton: {
    backgroundColor: "#dc3545",
    flex: 1,
  },
  discardButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    backgroundColor: "#6c757d",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});