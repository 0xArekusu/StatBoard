/**
 * TeamSelectionModal Component
 *
 * Modal displayed when downgrading subscription to select which teams to keep active.
 * Shows list of teams with checkboxes, enforces selection limit based on new tier.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Team } from "../../models/Team";

interface TeamSelectionModalProps {
  visible: boolean;
  teams: Team[];
  maxSelection: number;
  tierName: string;
  onConfirm: (selectedTeamIds: string[]) => void;
  onCancel: () => void;
}

export default function TeamSelectionModal({
  visible,
  teams,
  maxSelection,
  tierName,
  onConfirm,
  onCancel,
}: TeamSelectionModalProps) {
  const { colors } = useTheme();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleTeam = (teamId: string) => {
    if (selectedIds.includes(teamId)) {
      setSelectedIds(selectedIds.filter(id => id !== teamId));
    } else {
      if (selectedIds.length < maxSelection) {
        setSelectedIds([...selectedIds, teamId]);
      } else {
        Alert.alert(
          "Limite atteinte",
          `Vous ne pouvez sélectionner que ${maxSelection} équipe(s) avec l'offre ${tierName}.`
        );
      }
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length !== maxSelection && maxSelection > 0) {
      Alert.alert(
        "Sélection incomplète",
        `Veuillez sélectionner exactement ${maxSelection} équipe(s).`
      );
      return;
    }
    onConfirm(selectedIds);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={32}
              color={colors.warning || colors.primary}
            />
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Sélectionnez vos équipes
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              L'offre {tierName} permet {maxSelection} équipe{maxSelection > 1 ? "s" : ""}.
              {"\n"}Sélectionnez {maxSelection > 0 ? `${maxSelection} équipe(s)` : "aucune équipe"} à garder active{maxSelection > 1 ? "s" : ""}.
            </Text>
            {maxSelection === 0 && (
              <Text style={[styles.warningText, { color: colors.warning || colors.primary }]}>
                ⚠️ Toutes vos équipes seront suspendues.
              </Text>
            )}
          </View>

          {/* Team list */}
          <ScrollView style={styles.teamList}>
            {teams.map((team) => {
              const isSelected = selectedIds.includes(team.id);
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamItem,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + "20"
                        : colors.background,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => toggleTeam(team.id)}
                  disabled={maxSelection === 0}
                >
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, { color: colors.text.primary }]}>
                      {team.name}
                    </Text>
                    {team.category && (
                      <Text style={[styles.teamCategory, { color: colors.text.tertiary }]}>
                        {team.category}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={colors.onPrimary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.selectionCount, { color: colors.text.secondary }]}>
              {selectedIds.length} / {maxSelection} sélectionné{selectedIds.length > 1 ? "s" : ""}
            </Text>
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: colors.text.primary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleConfirm}
              >
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                  Confirmer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  teamList: {
    maxHeight: 300,
    paddingHorizontal: 24,
  },
  teamItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
  },
  teamCategory: {
    fontSize: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: 24,
    gap: 16,
  },
  selectionCount: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
