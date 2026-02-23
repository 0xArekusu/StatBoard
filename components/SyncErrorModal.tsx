import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS, SHADOW_COLOR } from "../src/theme";
import { useResponsive } from "../src/hooks/useResponsive";

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
  const { sp, font, sizes } = useResponsive();

  const infoBoxColor = isNotConnected ? STATUS_COLORS.info : STATUS_COLORS.warning;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.overlay, padding: sp.lg }]}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: sp.lg, padding: sp.xxl }]}>
          <View style={[styles.iconContainer, { backgroundColor: STATUS_COLORS.error + "20", marginBottom: sp.lg, width: sp.xxl * 3.75, height: sp.xxl * 3.75, borderRadius: sp.xxl * 1.875 }]}>
            <MaterialCommunityIcons
              name="cloud-off-outline"
              size={sp.xxl * 2.2}
              color={STATUS_COLORS.error}
            />
          </View>

          <Text style={[styles.title, { color: colors.text.primary, fontSize: font.xxl, marginBottom: sp.md }]}>Synchronisation impossible</Text>

          <Text style={[styles.message, { color: colors.text.secondary, fontSize: font.md, marginBottom: sp.lg }]}>{reason}</Text>

          {isNotConnected && (
            <View style={[styles.infoBox, { backgroundColor: infoBoxColor + "20", borderColor: infoBoxColor, borderRadius: sp.md, padding: sp.md, gap: sp.sm + sp.xs, marginBottom: sp.lg }]}>
              <Ionicons name="information-circle-outline" size={sizes.iconMd} color={infoBoxColor} />
              <Text style={[styles.infoText, { color: infoBoxColor, fontSize: font.md }]}>
                Connectez-vous pour sauvegarder vos matchs sur le cloud et y accéder depuis n'importe quel appareil.
              </Text>
            </View>
          )}

          {isFreemium && (
            <View style={[styles.infoBox, { backgroundColor: infoBoxColor + "20", borderColor: infoBoxColor, borderRadius: sp.md, padding: sp.md, gap: sp.sm + sp.xs, marginBottom: sp.lg }]}>
              <Ionicons name="rocket-outline" size={sizes.iconMd} color={infoBoxColor} />
              <Text style={[styles.infoText, { color: infoBoxColor, fontSize: font.md }]}>
                Passez à un abonnement payant pour synchroniser automatiquement vos matchs et profiter d'un stockage illimité.
              </Text>
            </View>
          )}

          <View style={[styles.actions, { gap: sp.sm + sp.xs }]}>
            {isNotConnected && onLogin && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: STATUS_COLORS.info, paddingVertical: sp.md, paddingHorizontal: sp.lg, borderRadius: sp.md }]}
                onPress={() => {
                  onClose();
                  onLogin();
                }}
              >
                <Ionicons name="log-in-outline" size={sizes.iconMd * 0.75} color={COMMON_COLORS.white} style={[styles.buttonIcon, { marginRight: sp.sm }]} />
                <Text style={[styles.primaryButtonText, { color: COMMON_COLORS.white, fontSize: font.md }]}>Se connecter</Text>
              </TouchableOpacity>
            )}

            {isFreemium && onUpgrade && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: STATUS_COLORS.warning, paddingVertical: sp.md, paddingHorizontal: sp.lg, borderRadius: sp.md }]}
                onPress={() => {
                  onClose();
                  onUpgrade();
                }}
              >
                <Ionicons name="star" size={sizes.iconMd * 0.75} color={COMMON_COLORS.white} style={[styles.buttonIcon, { marginRight: sp.sm }]} />
                <Text style={[styles.primaryButtonText, { color: COMMON_COLORS.white, fontSize: font.md }]}>Passer à Premium</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.closeButton, { backgroundColor: colors.surfaceVariant, paddingVertical: sp.md, paddingHorizontal: sp.lg, borderRadius: sp.md }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: colors.text.secondary, fontSize: font.md }]}>Fermer</Text>
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
