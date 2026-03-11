import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";

interface GuestWelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  maxLocalMatches: number;
}

export default function GuestWelcomeModal({
  visible,
  onClose,
  maxLocalMatches,
}: GuestWelcomeModalProps) {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { padding: sp.lg }]}>
        <View style={[
          styles.modal,
          {
            backgroundColor: colors.surface,
            borderRadius: sp.lg,
            padding: sp.lg,
          }
        ]}>
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: isDark ? `${colors.primary}33` : `${colors.primary}1A`,
              width: sizes.avatarLg,
              height: sizes.avatarLg,
              borderRadius: sizes.avatarLg / 2,
              marginBottom: sp.md,
            }
          ]}>
            <Ionicons name="information-circle" size={sizes.avatarMd} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text.primary, fontSize: font.xxl, marginBottom: sp.md }]}>Mode Invité</Text>

          <Text style={[styles.message, { color: colors.text.secondary, fontSize: font.md, marginBottom: sp.md }]}>
            Bienvenue ! En mode invité, vous pouvez tester toutes les fonctionnalités.
          </Text>

          <View style={[
            styles.infoBox,
            {
              backgroundColor: colors.surfaceVariant,
              padding: sp.md,
              borderRadius: sp.sm,
              marginBottom: sp.sm,
            }
          ]}>
            <Ionicons name="save-outline" size={font.lg} color={colors.text.secondary} style={[styles.infoIcon, { marginRight: sp.sm }]} />
            <Text style={[styles.infoText, { color: colors.text.secondary, fontSize: font.sm }]}>
              Vos données sont stockées <Text style={[styles.bold, { color: colors.text.primary }]}>localement</Text> sur cet appareil. Si vous videz le cache, elles seront perdues.
            </Text>
          </View>

          <View style={[
            styles.infoBox,
            {
              backgroundColor: colors.surfaceVariant,
              padding: sp.md,
              borderRadius: sp.sm,
              marginBottom: sp.lg,
            }
          ]}>
            <Ionicons name="shield-checkmark-outline" size={font.lg} color={colors.text.secondary} style={[styles.infoIcon, { marginRight: sp.sm }]} />
            <Text style={[styles.infoText, { color: colors.text.secondary, fontSize: font.sm }]}>
              Vous pouvez créer jusqu'à <Text style={[styles.bold, { color: colors.text.primary }]}>{maxLocalMatches} match{maxLocalMatches > 1 ? "s" : ""}</Text> gratuitement. Pour en faire plus, créez un compte !
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                paddingVertical: sp.md,
                borderRadius: sp.md,
              }
            ]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary, fontSize: font.md }]}>Compris, c'est parti !</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bold: {
    fontWeight: "bold",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
