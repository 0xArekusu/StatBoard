import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Match } from "../../src/models/types";
import { SHADOW_COLOR, OPACITY, COMMON_COLORS } from "../../src/theme";
import { ThemeColors } from "../../src/theme/colors";
import { useResponsive } from "../../src/hooks/useResponsive";

interface DashboardResumeMatchModalProps {
  visible: boolean;
  match: Match | null;
  colors: ThemeColors;
  isNewMatchFlow: boolean;
  onResume: () => void;
  onAbandon: () => void;
  onNewMatch: () => void;
  onClose: () => void;
}

/**
 * DashboardResumeMatchModal - Modal displayed when an active/unfinished match is detected
 *
 * Shows different options based on context:
 * - Resume match (always available)
 * - New match (only when triggered from "New Match" button - isNewMatchFlow=true)
 * - Abandon match (only when NOT triggered from "New Match" button - isNewMatchFlow=false)
 * - Ignore for now (always available)
 */
export default function DashboardResumeMatchModal({
  visible,
  match,
  colors,
  isNewMatchFlow,
  onResume,
  onAbandon,
  onNewMatch,
  onClose,
}: DashboardResumeMatchModalProps) {
  const { sp, font, sizes } = useResponsive();
  if (!match) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.modalIcon,
              {
                backgroundColor: `${colors.error}${OPACITY.gradient.low}`,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="basketball"
              size={32}
              color={colors.error}
            />
          </View>

          {/* Title */}
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
            Match en cours détecté !
          </Text>

          {/* Description */}
          <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>
            Il semble que le match contre{" "}
            <Text style={{ fontWeight: "bold" }}>
              {match.opponent_name}
            </Text>{" "}
            ne soit pas terminé.
          </Text>

          {/* Primary action: Resume match */}
          <TouchableOpacity
            style={[
              styles.modalPrimaryButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={onResume}
          >
            <MaterialCommunityIcons
              name="play-circle"
              size={20}
              color={COMMON_COLORS.white}
            />
            <Text
              style={[
                styles.modalPrimaryButtonText,
                { color: COMMON_COLORS.white },
              ]}
            >
              Reprendre le match
            </Text>
          </TouchableOpacity>

          {/* Conditional button: New match OR Abandon */}
          {isNewMatchFlow ? (
            <TouchableOpacity
              style={[
                styles.modalSecondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={onNewMatch}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={20}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.modalSecondaryButtonText,
                  { color: colors.primary },
                ]}
              >
                Nouveau match
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.modalSecondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={onAbandon}
            >
              <MaterialCommunityIcons
                name="delete-forever"
                size={20}
                color={colors.error}
              />
              <Text
                style={[
                  styles.modalSecondaryButtonText,
                  { color: colors.error },
                ]}
              >
                Abandonner le match
              </Text>
            </TouchableOpacity>
          )}

          {/* Ignore button */}
          <TouchableOpacity
            style={[
              styles.modalSecondaryButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={onClose}
          >
            <Text
              style={[
                styles.modalSecondaryButtonText,
                { color: colors.text.secondary },
              ]}
            >
              Ignorer pour l'instant
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: `${SHADOW_COLOR}CC`,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  modalPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSecondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
