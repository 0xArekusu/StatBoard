import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Match } from "../src/models/types";
import { supabase } from "../src/config/supabase";
import { resolveTeamName } from "../src/utils/teamNameResolver";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";

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
  const { colors } = useTheme();
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [teamAName, setTeamAName] = useState<string>("");
  const [teamBName, setTeamBName] = useState<string>("");

  // Resolve team names when match changes
  useEffect(() => {
    if (match) {
      resolveTeamNames();
    }
  }, [match]);

  const resolveTeamNames = async () => {
    if (!match) return;

    const resolvedTeamA = await resolveTeamName(match.team_a_name, supabase);
    const resolvedTeamB = await resolveTeamName(match.team_b_name, supabase);

    setTeamAName(resolvedTeamA);
    setTeamBName(resolvedTeamB);
  };

  if (!match) return null;

  // Use resolved names or fallback to original names
  const displayTeamA = teamAName || match.team_a_name;
  const displayTeamB = teamBName || match.team_b_name;

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
          <View style={[styles.confirmationContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmationTitle, { color: colors.text.primary }]}>⚠️ Supprimer le match</Text>

            <Text style={[styles.confirmationMessage, { color: colors.text.secondary }]}>
              Êtes-vous sûr de vouloir supprimer ce match en cours ?
            </Text>

            <Text style={[styles.warningText, { color: STATUS_COLORS.error }]}>
              Le match et toutes ses statistiques seront définitivement supprimés. Cette action est irréversible.
            </Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                onPress={cancelDiscard}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.discardButton, { backgroundColor: STATUS_COLORS.error }]}
                onPress={confirmDiscard}
              >
                <Text style={[styles.discardButtonText, { color: COMMON_COLORS.white }]}>Confirmer</Text>
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
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>🏀 Match en cours détecté</Text>

          <View style={[styles.matchInfo, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.matchTitle, { color: colors.text.primary }]}>
              {displayTeamA} vs {displayTeamB}
            </Text>

            {match.started_at && (
              <Text style={[styles.matchStarted, { color: colors.text.secondary }]}>
                Match démarré le {formatDate(match.started_at)}
              </Text>
            )}
          </View>

          <Text style={[styles.message, { color: colors.text.secondary }]}>
            Voulez-vous reprendre ce match ou en commencer un nouveau ?
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.resumeButton, { backgroundColor: STATUS_COLORS.success }]}
              onPress={onResumeMatch}
            >
              <Text style={[styles.resumeButtonText, { color: COMMON_COLORS.white }]}>
                🔄 Reprendre le match
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.newMatchButton, { backgroundColor: STATUS_COLORS.info }]}
              onPress={handleDiscardPress}
            >
              <Text style={[styles.newMatchButtonText, { color: COMMON_COLORS.white }]}>
                🆕 Nouveau match
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.backButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
              onPress={onGoBack}
            >
              <Text style={[styles.backButtonText, { color: colors.text.secondary }]}>
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