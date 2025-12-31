import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";

interface GuestWelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GuestWelcomeModal({
  visible,
  onClose,
}: GuestWelcomeModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: isDark ? `${colors.primary}33` : `${colors.primary}1A` }
          ]}>
            <Ionicons name="information-circle" size={64} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>Mode Invité</Text>

          <Text style={[styles.message, { color: colors.text.secondary }]}>
            Bienvenue ! En mode invité, vous pouvez tester toutes les fonctionnalités.
          </Text>

          <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="save-outline" size={18} color={colors.text.secondary} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Vos données sont stockées <Text style={[styles.bold, { color: colors.text.primary }]}>localement</Text> sur cet appareil. Si vous videz le cache, elles seront perdues.
            </Text>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.text.secondary} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Vous pouvez créer jusqu'à <Text style={[styles.bold, { color: colors.text.primary }]}>1 match</Text> gratuitement. Pour en faire plus, créez un compte !
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Compris, c'est parti !</Text>
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
