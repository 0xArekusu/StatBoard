import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";

interface ReviewPromptModalProps {
  visible: boolean;
  onLike: () => void;
  onDislike: () => void;
}

export default function ReviewPromptModal({ visible, onLike, onDislike }: ReviewPromptModalProps) {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { padding: sp.lg }]}>
        <View
          style={[
            styles.modal,
            { backgroundColor: colors.surface, borderRadius: sp.lg, padding: sp.lg },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? `${colors.primary}33` : `${colors.primary}1A`,
                width: sizes.avatarLg,
                height: sizes.avatarLg,
                borderRadius: sizes.avatarLg / 2,
                marginBottom: sp.md,
              },
            ]}
          >
            <Ionicons name="basketball-outline" size={sizes.avatarMd} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.title,
              { color: colors.text.primary, fontSize: font.xxl, marginBottom: sp.sm },
            ]}
          >
            Vous appréciez Coach Assistant ?
          </Text>

          <Text
            style={[
              styles.message,
              { color: colors.text.secondary, fontSize: font.md, marginBottom: sp.lg },
            ]}
          >
            Votre avis nous aide à améliorer l'application.
          </Text>

          <View style={[styles.row, { gap: sp.md }]}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                { borderColor: colors.border, paddingVertical: sp.md, borderRadius: sp.md },
              ]}
              onPress={onDislike}
            >
              <Text style={[styles.buttonText, { color: colors.text.primary, fontSize: font.md }]}>
                👎 Pas vraiment
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary, paddingVertical: sp.md, borderRadius: sp.md },
              ]}
              onPress={onLike}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary, fontSize: font.md }]}>
                👍 Oui !
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
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    fontWeight: "bold",
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    width: "100%",
  },
  button: {
    flex: 1,
    alignItems: "center",
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontWeight: "bold",
  },
});
