import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";

interface ForceUpdateModalProps {
  visible: boolean;
  onUpdatePress: () => void;
}

export default function ForceUpdateModal({ visible, onUpdatePress }: ForceUpdateModalProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { padding: sp.lg }]}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.surface,
              borderRadius: sp.lg,
              padding: sp.lg,
            },
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
            <Ionicons name="arrow-up-circle" size={sizes.avatarMd} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.title,
              { color: colors.text.primary, fontSize: font.xxl, marginBottom: sp.sm },
            ]}
          >
            {t("forceUpdateModal.title")}
          </Text>

          <Text
            style={[
              styles.message,
              { color: colors.text.secondary, fontSize: font.md, marginBottom: sp.lg },
            ]}
          >
            {t("forceUpdateModal.message")}
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                paddingVertical: sp.md,
                borderRadius: sp.md,
              },
            ]}
            onPress={onUpdatePress}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary, fontSize: font.md }]}>
              {t("forceUpdateModal.button")}
            </Text>
          </TouchableOpacity>
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
  button: {
    width: "100%",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontWeight: "bold",
  },
});
