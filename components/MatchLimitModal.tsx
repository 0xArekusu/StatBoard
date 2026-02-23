import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS, SHADOW_COLOR } from "../src/theme";
import { useResponsive } from "../src/hooks/useResponsive";

interface MatchLimitModalProps {
  visible: boolean;
  isConnected: boolean;
  currentCount: number;
  maxCount: number;
  onClose: () => void;
  onLogin?: () => void;
  onUpgrade?: () => void;
}

export default function MatchLimitModal({
  visible,
  isConnected,
  currentCount,
  maxCount,
  onClose,
  onLogin,
  onUpgrade,
}: MatchLimitModalProps) {
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();

  const infoBoxColor = !isConnected ? STATUS_COLORS.info : STATUS_COLORS.warning;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.overlay, padding: sp.lg }]}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: sp.lg, padding: sp.xxl }]}>
          <View style={[styles.iconContainer, { backgroundColor: STATUS_COLORS.warning + "20", marginBottom: sp.lg, width: sp.xxl * 3.75, height: sp.xxl * 3.75, borderRadius: sp.xxl * 1.875 }]}>
            <Ionicons name="warning-outline" size={sp.xxl * 2.2} color={STATUS_COLORS.warning} />
          </View>

          <Text style={[styles.title, { color: colors.text.primary, fontSize: font.xxl, marginBottom: sp.md }]}>Limite atteinte</Text>

          <Text style={[styles.message, { color: colors.text.secondary, fontSize: font.md, marginBottom: sp.lg }]}>
            Vous avez atteint la limite de <Text style={[styles.bold, { color: STATUS_COLORS.warning }]}>{maxCount} matchs</Text> en stockage local.
          </Text>

          {!isConnected ? (
            <View style={[styles.infoBox, { backgroundColor: infoBoxColor + "20", borderColor: infoBoxColor, borderRadius: sp.md, padding: sp.md, gap: sp.sm + sp.xs, marginBottom: sp.lg }]}>
              <Ionicons name="information-circle-outline" size={sizes.iconMd} color={infoBoxColor} />
              <Text style={[styles.infoText, { color: infoBoxColor, fontSize: font.md }]}>
                Connectez-vous pour accéder à un stockage illimité sur le cloud avec un abonnement premium.
              </Text>
            </View>
          ) : (
            <View style={[styles.infoBox, { backgroundColor: infoBoxColor + "20", borderColor: infoBoxColor, borderRadius: sp.md, padding: sp.md, gap: sp.sm + sp.xs, marginBottom: sp.lg }]}>
              <Ionicons name="rocket-outline" size={sizes.iconMd} color={infoBoxColor} />
              <Text style={[styles.infoText, { color: infoBoxColor, fontSize: font.md }]}>
                Passez à un abonnement premium pour un stockage illimité sur le cloud.
              </Text>
            </View>
          )}

          <View style={[styles.actions, { gap: sp.sm + sp.xs }]}>
            {!isConnected && onLogin && (
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

            {isConnected && onUpgrade && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: STATUS_COLORS.warning, paddingVertical: sp.md, paddingHorizontal: sp.lg, borderRadius: sp.md }]}
                onPress={() => {
                  onClose();
                  onUpgrade();
                }}
              >
                <Ionicons name="star" size={sizes.iconMd * 0.75} color={COMMON_COLORS.white} style={[styles.buttonIcon, { marginRight: sp.sm }]} />
                <Text style={[styles.primaryButtonText, { color: COMMON_COLORS.white, fontSize: font.md }]}>Voir les abonnements</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.surfaceVariant, paddingVertical: sp.md, paddingHorizontal: sp.lg, borderRadius: sp.md }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text.secondary, fontSize: font.md }]}>Fermer</Text>
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
  bold: {
    fontWeight: "bold",
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
  cancelButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
