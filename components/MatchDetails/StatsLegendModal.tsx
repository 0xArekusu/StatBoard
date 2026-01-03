/**
 * StatsLegendModal Component
 *
 * Modal displaying the legend for all statistics abbreviations.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";

interface StatsLegendModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StatsLegendModal({
  visible,
  onClose,
}: StatsLegendModalProps) {
  const { colors } = useTheme();

  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalCloseButton}
          >
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.modalTitle,
              {
                color: colors.text.primary,
              },
            ]}
          >
            LÉGENDE DES STATISTIQUES
          </Text>

          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                MIN
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Minutes jouées
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                PTS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Points
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                TIRS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Tirs réussis/tentés
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                2PTS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Tirs à 2 points
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                3PTS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Tirs à 3 points
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                LF
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Lancers francs
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                REB
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Rebonds
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                RO
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Rebonds offensifs
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                RD
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Rebonds défensifs
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                AST
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Passes décisives
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                INT
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Interceptions
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                CTR
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Contres
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                BP
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Balles perdues
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                FT
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Fautes
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                EFF
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Efficacité
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 20,
    letterSpacing: 1,
    textAlign: "center",
  },
  legendGrid: {
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    width: 60,
  },
  legendValue: {
    fontSize: 12,
    flex: 1,
  },
});
