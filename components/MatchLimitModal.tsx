import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MatchLimitModalProps {
  visible: boolean;
  isConnected: boolean;
  currentCount: number;
  maxCount: number;
  onClose: () => void;
  onUpgrade?: () => void;
  onManageMatches: () => void;
}

export default function MatchLimitModal({
  visible,
  isConnected,
  currentCount,
  maxCount,
  onClose,
  onUpgrade,
  onManageMatches,
}: MatchLimitModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={60} color="#FF6B35" />
          </View>

          <Text style={styles.title}>Limite atteinte</Text>

          <Text style={styles.message}>
            Vous avez atteint la limite de <Text style={styles.bold}>{maxCount} matchs</Text> en stockage local.
          </Text>

          {!isConnected ? (
            <Text style={styles.suggestion}>
              Connectez-vous pour accéder à un stockage illimité sur le cloud avec un abonnement premium.
            </Text>
          ) : (
            <Text style={styles.suggestion}>
              Passez à un abonnement premium pour un stockage illimité sur le cloud.
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onManageMatches}
            >
              <Text style={styles.secondaryButtonText}>Gérer mes matchs</Text>
            </TouchableOpacity>

            {onUpgrade && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={onUpgrade}
              >
                <Text style={styles.primaryButtonText}>
                  {isConnected ? "Voir les abonnements" : "Se connecter"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Fermer</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    minWidth: 320,
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  bold: {
    fontWeight: "bold",
    color: "#FF6B35",
  },
  suggestion: {
    fontSize: 14,
    color: "#999",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#2196F3",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
