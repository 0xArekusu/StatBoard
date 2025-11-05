/**
 * LocalSaveWarningModal
 *
 * Informational modal displayed after saving a match locally.
 * Shows different warnings based on user connection status.
 *
 * Features:
 * - Local save confirmation message
 * - Warning for non-authenticated users (data loss risk on uninstall)
 * - Warning for authenticated non-premium users (no cloud sync)
 * - Different icons based on connection status
 *
 * Props:
 * - isConnected: Shows premium upsell if true, account creation warning if false
 */
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LocalSaveWarningModalProps {
  visible: boolean;
  isConnected: boolean;
  onClose: () => void;
}

export default function LocalSaveWarningModal({
  visible,
  isConnected,
  onClose,
}: LocalSaveWarningModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
        {/* Modal container */}
        <View style={styles.modal}>
          {/* Save icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="save-outline" size={60} color="#2196F3" />
          </View>

          {/* Modal title */}
          <Text style={styles.title}>Match sauvegardé localement</Text>

          {/* Success message */}
          <Text style={styles.message}>
            Votre match a été enregistré sur cet appareil.
          </Text>

          {/* Warning box: content varies based on connection status */}
          {!isConnected ? (
            /* Warning for non-authenticated users */
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={24} color="#FF9800" />
              <Text style={styles.warningText}>
                Sans compte, vos statistiques ne sont pas sauvegardées sur le cloud et peuvent être perdues si vous désinstallez l'application.
              </Text>
            </View>
          ) : (
            /* Warning for authenticated but non-premium users */
            <View style={styles.warningBox}>
              <Ionicons name="cloud-offline-outline" size={24} color="#FF9800" />
              <Text style={styles.warningText}>
                Sans abonnement, vos statistiques ne sont pas synchronisées sur le cloud. Passez à un abonnement premium pour un accès illimité et une sauvegarde automatique.
              </Text>
            </View>
          )}

          {/* Action button: Close modal */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>Fermer</Text>
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
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 24,
  },
  warningBox: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: "#E65100",
    lineHeight: 20,
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
    backgroundColor: "#f5f5f5",
  },
  secondaryButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
