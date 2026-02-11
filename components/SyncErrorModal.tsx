import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS, SHADOW_COLOR } from "../src/theme";

interface SyncErrorModalProps {
  visible: boolean;
  reason: string;
  isNotConnected?: boolean;
  isFreemium?: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  onLogin?: () => void;
}

export default function SyncErrorModal({
  visible,
  reason,
  isNotConnected = false,
  isFreemium = false,
  onClose,
  onUpgrade,
  onLogin,
}: SyncErrorModalProps) {
  const { colors } = useTheme();

  const infoBoxColor = isNotConnected ? STATUS_COLORS.info : STATUS_COLORS.warning;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: STATUS_COLORS.error + "20" }]}>
            <MaterialCommunityIcons
              name="cloud-off-outline"
              size={70}
              color={STATUS_COLORS.error}
            />
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>Synchronisation impossible</Text>

          <Text style={[styles.message, { color: colors.text.secondary }]}>{reason}</Text>

          {isNotConnected && (
            <View style={[styles.infoBox, { backgroundColor: infoBoxColor + "20", borderColor: infoBoxColor }]}>
              <Ionicons name="information-circle-outline" size={24} color={infoBoxColor} />
              <Text style={[styles.infoText, { color: infoBoxColor }]}>
                Connectez-vous pour sauvegarder vos matchs sur le cloud et y accéder depuis n'importe quel appareil.
              </Text>
            </View>
          )}

          {isFreemium && (
            <View style={[styles.infoBox, { backgroundColor: infoBoxColor + "20", borderColor: infoBoxColor }]}>
              <Ionicons name="rocket-outline" size={24} color={infoBoxColor} />
              <Text style={[styles.infoText, { color: infoBoxColor }]}>
                Passez à un abonnement payant pour synchroniser automatiquement vos matchs et profiter d'un stockage illimité.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {isNotConnected && onLogin && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: STATUS_COLORS.info }]}
                onPress={() => {
                  onClose();
                  onLogin();
                }}
              >
                <Ionicons name="log-in-outline" size={18} color={COMMON_COLORS.white} style={styles.buttonIcon} />
                <Text style={[styles.primaryButtonText, { color: COMMON_COLORS.white }]}>Se connecter</Text>
              </TouchableOpacity>
            )}

            {isFreemium && onUpgrade && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: STATUS_COLORS.warning }]}
                onPress={() => {
                  onClose();
                  onUpgrade();
                }}
              >
                <Ionicons name="star" size={18} color={COMMON_COLORS.white} style={styles.buttonIcon} />
                <Text style={[styles.primaryButtonText, { color: COMMON_COLORS.white }]}>Passer à Premium</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: colors.text.secondary }]}>Fermer</Text>
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
    padding: 20,
  },
  modal: {
    borderRadius: 24,
    padding: 32,
    minWidth: 320,
    maxWidth: 420,
    alignItems: "center",
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 24,
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  infoBox: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
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
  primaryButton: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {},
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
