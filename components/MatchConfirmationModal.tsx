/**
 * MatchConfirmationModal
 *
 * Reusable confirmation modal for critical match actions.
 * Used for period transitions and match end confirmations.
 *
 * Features:
 * - Custom title and message
 * - Time remaining warning (shows if time > 0)
 * - Configurable button labels
 * - Semi-transparent overlay
 * - Hardware back button closes modal (onRequestClose)
 *
 * Usage:
 * - Next period confirmation (with time remaining warning)
 * - End match confirmation (with time remaining warning)
 * - Any other destructive/important match action
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";

interface MatchConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  timeRemaining: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export default function MatchConfirmationModal({
  visible,
  title,
  message,
  timeRemaining,
  onConfirm,
  onCancel,
  confirmButtonText = "Confirmer",
  cancelButtonText = "Annuler",
}: MatchConfirmationModalProps) {
  const { colors } = useTheme();

  /**
   * Format seconds to MM:SS display
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Modal title */}
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>

          {/* Confirmation message */}
          <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>

          {/* Time remaining warning (only shown if time > 0) */}
          {timeRemaining > 0 && (
            <View style={[styles.timeWarning, { backgroundColor: STATUS_COLORS.warning + "20", borderColor: STATUS_COLORS.warning }]}>
              <Text style={styles.timeWarningIcon}>⏰</Text>
              <Text style={[styles.timeWarningText, { color: STATUS_COLORS.warning }]}>
                Temps restant : {formatTime(timeRemaining)}
              </Text>
            </View>
          )}

          {/* Action buttons: Cancel (left) and Confirm (right) */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>{cancelButtonText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: STATUS_COLORS.error }]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmButtonText, { color: COMMON_COLORS.white }]}>{confirmButtonText}</Text>
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
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#333",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  timeWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderColor: "#FF9800",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  timeWarningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  timeWarningText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E65100",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
    borderWidth: 1,
  },
  confirmButton: {
    backgroundColor: "#F44336",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});