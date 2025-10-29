import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface SyncErrorModalProps {
  visible: boolean;
  reason: string;
  isNotConnected?: boolean;
  isFreemium?: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function SyncErrorModal({
  visible,
  reason,
  isNotConnected = false,
  isFreemium = false,
  onClose,
  onUpgrade,
}: SyncErrorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="cloud-off-outline"
              size={70}
              color="#FF6B6B"
            />
          </View>

          <Text style={styles.title}>Synchronisation impossible</Text>

          <Text style={styles.message}>{reason}</Text>

          {isNotConnected && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
              <Text style={styles.infoText}>
                Connectez-vous pour sauvegarder vos matchs sur le cloud et y accéder depuis n'importe quel appareil.
              </Text>
            </View>
          )}

          {isFreemium && (
            <View style={styles.upgradeBox}>
              <Ionicons name="rocket-outline" size={24} color="#9C27B0" />
              <Text style={styles.upgradeText}>
                Passez à un abonnement payant pour synchroniser automatiquement vos matchs et profiter d'un stockage illimité.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {isFreemium && onUpgrade && (
              <TouchableOpacity
                style={[styles.button, styles.upgradeButton]}
                onPress={() => {
                  onClose();
                  onUpgrade();
                }}
              >
                <Ionicons name="star" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.upgradeButtonText}>Passer à Premium</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    minWidth: 320,
    maxWidth: 420,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 24,
    backgroundColor: "#FFEBEE",
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1565C0",
    lineHeight: 20,
    fontWeight: "500",
  },
  upgradeBox: {
    backgroundColor: "#F3E5F5",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#CE93D8",
  },
  upgradeText: {
    flex: 1,
    fontSize: 14,
    color: "#6A1B9A",
    lineHeight: 20,
    fontWeight: "500",
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  upgradeButton: {
    backgroundColor: "#9C27B0",
    shadowColor: "#9C27B0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    backgroundColor: "#f5f5f5",
  },
  closeButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
