import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { BRAND_COLORS, SLATE_COLORS, STATUS_COLORS, OPACITY } from "../../src/theme";
import { AddOpponentForm } from "./AddOpponentForm";
import {
  getMatchCreationInfoMessage,
  getMatchCreationButtonLabel,
  ROSTER_LIMITS,
} from "../../constants";
import { OpponentPlayerCard } from "./OpponentPlayerCard";
import type { Player } from "../../models/Player";
import type { OpponentTemplate } from "../../src/services/database/OpponentTemplateRepository";
import { useResponsive } from "../../src/hooks/useResponsive";

interface OpponentRosterViewProps {
  trackOpponentStats: boolean;
  opponentRoster: Player[];
  opponentStarters: string[];
  newPlayerName: string;
  newPlayerNumber: string;
  newPlayerLicense: string;
  onNewNameChange: (text: string) => void;
  onNewNumberChange: (text: string) => void;
  onNewLicenseChange: (text: string) => void;
  onAddPlayer: () => void;
  onGeneratePlayers: (count: number) => void;
  onToggleStarter: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onGoToStep1: () => void;
  savedTemplates: OpponentTemplate[];
  defaultTemplateName: string;
  loadedTemplateName: string | null;
  onLoadTemplate: (template: OpponentTemplate) => void;
  onSaveTemplate: (name: string) => void;
  /** If true, the add-player form is not rendered (use for sticky-bottom layout) */
  hideAddForm?: boolean;
  isDark: boolean;
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

export const OpponentRosterView: React.FC<OpponentRosterViewProps> = ({
  trackOpponentStats,
  opponentRoster,
  opponentStarters,
  newPlayerName,
  newPlayerNumber,
  newPlayerLicense,
  onNewNameChange,
  onNewNumberChange,
  onNewLicenseChange,
  onAddPlayer,
  onGeneratePlayers,
  onToggleStarter,
  onRemovePlayer,
  onGoToStep1,
  savedTemplates,
  defaultTemplateName,
  loadedTemplateName,
  onLoadTemplate,
  onSaveTemplate,
  hideAddForm,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();
  const { sp, font } = useResponsive();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("");

  const openSaveModal = () => {
    setSaveNameInput(defaultTemplateName);
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    const name = saveNameInput.trim();
    if (!name) return;

    const exists = savedTemplates.some(t => t.name === name);
    if (exists) {
      Alert.alert(
        t("opponentRosterView.saveModalTitle"),
        t("opponentRosterView.overwriteConfirm", { name }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("opponentRosterView.overwrite"),
            style: "destructive",
            onPress: () => {
              setShowSaveModal(false);
              onSaveTemplate(name);
            },
          },
        ]
      );
    } else {
      setShowSaveModal(false);
      onSaveTemplate(name);
    }
  };

  if (!trackOpponentStats) {
    return (
      <View style={[styles.rosterSection, { marginBottom: sp.lg }]}>
        <View
          style={[
            styles.disabledOpponentBox,
            {
              backgroundColor: isDark ? `${SLATE_COLORS[900]}80` : SLATE_COLORS[100],
              borderColor: colors.borderColor,
              padding: sp.xxl,
              borderRadius: sp.md,
            },
          ]}
        >
          <MaterialCommunityIcons name="chart-bar" size={sp.xxl} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={[styles.disabledOpponentTitle, { color: colors.textPrimary, fontSize: font.md, marginTop: sp.md }]}>
            {getMatchCreationInfoMessage("OPPONENT_STATS_DISABLED")}
          </Text>
          <Text style={[styles.disabledOpponentText, { color: colors.textSecondary, fontSize: font.sm, marginTop: sp.sm }]}>
            {getMatchCreationInfoMessage("OPPONENT_STATS_DISABLED_DETAIL")}
          </Text>
          <TouchableOpacity onPress={onGoToStep1}>
            <Text style={[styles.disabledOpponentLink, { color: BRAND_COLORS[600] }]}>
              {getMatchCreationButtonLabel("MODIFY_OPTIONS")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const canSave = opponentRoster.length > 0;
  const hasTemplates = savedTemplates.length > 0;

  return (
    <View style={styles.rosterSection}>
      {/* Info Box */}
      <View
        style={[
          styles.infoBox,
          {
            backgroundColor: `${BRAND_COLORS[500]}10`,
            borderColor: `${BRAND_COLORS[500]}30`,
          },
        ]}
      >
        <MaterialCommunityIcons name="information" size={16} color={BRAND_COLORS[600]} />
        <Text style={[styles.infoBoxText, { color: BRAND_COLORS[600] }]}>
          {getMatchCreationInfoMessage("OPPONENT_ROSTER_INSTRUCTIONS")}
        </Text>
        <View
          style={[
            styles.starterBadge,
            {
              backgroundColor:
                opponentStarters.length === ROSTER_LIMITS.STARTERS
                  ? STATUS_COLORS.successBackground
                  : colors.borderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.starterBadgeText,
              {
                color:
                  opponentStarters.length === ROSTER_LIMITS.STARTERS
                    ? STATUS_COLORS.successLight
                    : colors.textSecondary,
              },
            ]}
          >
            {opponentStarters.length} / {ROSTER_LIMITS.STARTERS}
          </Text>
        </View>
      </View>

      {/* Charger une composition + bouton sauvegarde */}
      <View
        style={[
          styles.templateSelector,
          {
            backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[50],
            borderColor: colors.borderColor,
            borderRadius: sp.sm,
          },
        ]}
      >
        <View style={styles.templateSelectorRow}>
          <TouchableOpacity
            onPress={() => hasTemplates && setShowTemplates(!showTemplates)}
            style={styles.templateSelectorLeft}
            disabled={!hasTemplates}
          >
            <MaterialCommunityIcons name="folder-open-outline" size={16} color={BRAND_COLORS[600]} />
            <Text style={[styles.templateSelectorLabel, { color: BRAND_COLORS[600], fontSize: font.sm }]}>
              {t("opponentRosterView.loadComposition")}
            </Text>
            {hasTemplates && (
              <MaterialCommunityIcons
                name={showTemplates ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textSecondary}
              />
            )}
          </TouchableOpacity>

          {/* Save icon button */}
          <TouchableOpacity
            onPress={openSaveModal}
            disabled={!canSave}
            style={[
              styles.saveIconButton,
              {
                borderColor: canSave ? BRAND_COLORS[600] : colors.borderColor,
                opacity: canSave ? 1 : OPACITY.disabled,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="content-save-outline"
              size={18}
              color={canSave ? BRAND_COLORS[600] : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {showTemplates && hasTemplates && (
          <View style={[styles.templateList, { borderTopColor: colors.borderColor }]}>
            {savedTemplates.map(template => (
              <TouchableOpacity
                key={template.id}
                onPress={() => {
                  onLoadTemplate(template);
                  setShowTemplates(false);
                }}
                style={[styles.templateItem, { borderBottomColor: colors.borderColor }]}
              >
                <MaterialCommunityIcons
                  name="basketball"
                  size={14}
                  color={template.name === loadedTemplateName ? BRAND_COLORS[600] : colors.textSecondary}
                />
                <Text
                  style={[styles.templateItemText, { color: colors.textPrimary, fontSize: font.sm }]}
                  numberOfLines={1}
                >
                  {template.name}
                </Text>
                <Text style={[styles.templateItemCount, { color: colors.textSecondary, fontSize: font.xs }]}>
                  {t("opponentRosterView.playerCount", { count: template.players.length })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Add Opponent Form — hidden when parent uses sticky-bottom layout */}
      {!hideAddForm && (
        <AddOpponentForm
          playerName={newPlayerName}
          playerNumber={newPlayerNumber}
          playerLicense={newPlayerLicense}
          onNameChange={onNewNameChange}
          onNumberChange={onNewNumberChange}
          onLicenseChange={onNewLicenseChange}
          onAdd={onAddPlayer}
          existingPlayers={opponentRoster}
          colors={colors}
        />
      )}

      {/* Opponent List */}
      <View style={styles.opponentList}>
        {opponentRoster.length > 0 ? (
          opponentRoster.map((player) => {
            const isStarter = opponentStarters.includes(player.id);
            return (
              <OpponentPlayerCard
                key={player.id}
                player={player}
                isStarter={isStarter}
                onToggleStarter={() => onToggleStarter(player.id)}
                onDelete={() => onRemovePlayer(player.id)}
                isDark={isDark}
                colors={colors}
              />
            );
          })
        ) : (
          <View style={styles.emptyOpponentList}>
            <Text style={[styles.emptyOpponentText, { color: colors.textSecondary }]}>
              {getMatchCreationInfoMessage("NO_OPPONENT_PLAYERS")}
            </Text>
          </View>
        )}
      </View>

      {/* Save modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceColor,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: font.md }]}>
              {t("opponentRosterView.saveModalTitle")}
            </Text>
            <TextInput
              value={saveNameInput}
              onChangeText={setSaveNameInput}
              autoFocus
              selectTextOnFocus
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[100],
                  borderColor: colors.borderColor,
                  color: colors.textPrimary,
                  fontSize: font.md,
                },
              ]}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowSaveModal(false)}
                style={[styles.modalButton, { borderColor: colors.borderColor }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary, fontSize: font.sm }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSave}
                disabled={!saveNameInput.trim()}
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: BRAND_COLORS[600],
                    opacity: saveNameInput.trim() ? 1 : OPACITY.disabled,
                  },
                ]}
              >
                <Text style={[styles.modalButtonText, { color: "white", fontSize: font.sm }]}>
                  {t("opponentRosterView.saveButton")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rosterSection: {
    gap: 16,
  },
  disabledOpponentBox: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  disabledOpponentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  disabledOpponentText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  disabledOpponentLink: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
  },
  templateSelector: {
    borderWidth: 1,
    overflow: "hidden",
  },
  templateSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  templateSelectorLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateSelectorLabel: {
    flex: 1,
    fontWeight: "600",
  },
  templateList: {
    borderTopWidth: 1,
  },
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  templateItemText: {
    flex: 1,
    fontWeight: "500",
  },
  templateItemCount: {
    opacity: 0.6,
  },
  saveIconButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 12,
    flex: 1,
  },
  starterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  starterBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  opponentList: {
    gap: 8,
  },
  emptyOpponentList: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyOpponentText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontWeight: "bold",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontWeight: "600",
  },
});
