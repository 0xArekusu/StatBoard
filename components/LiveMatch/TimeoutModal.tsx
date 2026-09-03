import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/contexts/ThemeContext";

interface TimeoutModalProps {
  visible: boolean;
  teamName: string;
  limitReached: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function TimeoutModal({ visible, teamName, limitReached, onConfirm, onClose }: TimeoutModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.wrapper}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons
            name="timer-pause-outline"
            size={30}
            color={limitReached ? colors.error : colors.primary}
          />
          <Text style={[styles.label, { color: colors.text.secondary }]}>{t("timeoutModal.label")}</Text>
          <Text style={[styles.teamName, { color: colors.text.primary }]}>{teamName}</Text>

          {limitReached && (
            <View style={[styles.warningBanner, { backgroundColor: colors.error + "22", borderColor: colors.error + "55" }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={[styles.warningText, { color: colors.error }]}>
                {t("timeoutModal.limitReached")}
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnText, { color: colors.text.secondary }]}>{t("clubInfoView.close")}</Text>
            </TouchableOpacity>
            {!limitReached && (
              <TouchableOpacity
                onPress={handleConfirm}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.btnText, { color: colors.onPrimary }]}>{t("common.confirm")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 36,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
    minWidth: 220,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  teamName: {
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
