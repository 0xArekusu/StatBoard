import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, SLATE_COLORS, COMMON_COLORS, OPACITY } from "../../src/theme";
import {
  MATCH_CREATION_INFO_MESSAGES,
  MATCH_CREATION_BUTTON_LABELS,
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
  onLoadTemplate: (template: OpponentTemplate) => void;
  onSaveTemplate: () => void;
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
  onLoadTemplate,
  onSaveTemplate,
  isDark,
  colors,
}) => {
  const { sp, font } = useResponsive();
  const [showTemplates, setShowTemplates] = useState(false);

  if (!trackOpponentStats) {
    return (
      <View style={[styles.rosterSection, { marginBottom: sp.lg }]}>
        <View
          style={[
            styles.disabledOpponentBox,
            {
              backgroundColor: isDark
                ? `${SLATE_COLORS[900]}80`
                : SLATE_COLORS[100],
              borderColor: colors.borderColor,
              padding: sp.xxl,
              borderRadius: sp.md,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chart-bar"
            size={sp.xxl}
            color={colors.textSecondary}
            style={{ opacity: 0.5 }}
          />
          <Text
            style={[styles.disabledOpponentTitle, { color: colors.textPrimary, fontSize: font.md, marginTop: sp.md }]}
          >
            {MATCH_CREATION_INFO_MESSAGES.OPPONENT_STATS_DISABLED}
          </Text>
          <Text
            style={[styles.disabledOpponentText, { color: colors.textSecondary, fontSize: font.sm, marginTop: sp.sm }]}
          >
            {MATCH_CREATION_INFO_MESSAGES.OPPONENT_STATS_DISABLED_DETAIL}
          </Text>
          <TouchableOpacity onPress={onGoToStep1}>
            <Text
              style={[
                styles.disabledOpponentLink,
                { color: BRAND_COLORS[600] },
              ]}
            >
              {MATCH_CREATION_BUTTON_LABELS.MODIFY_OPTIONS}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rosterSection}>
      {/* Saved templates combobox */}
      {savedTemplates.length > 0 && (
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
          <TouchableOpacity
            onPress={() => setShowTemplates(!showTemplates)}
            style={styles.templateSelectorRow}
          >
            <MaterialCommunityIcons
              name="folder-open-outline"
              size={16}
              color={BRAND_COLORS[600]}
            />
            <Text style={[styles.templateSelectorLabel, { color: BRAND_COLORS[600], fontSize: font.sm }]}>
              Charger une composition
            </Text>
            <MaterialCommunityIcons
              name={showTemplates ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showTemplates && (
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
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.templateItemText, { color: colors.textPrimary, fontSize: font.sm }]}
                    numberOfLines={1}
                  >
                    {template.name}
                  </Text>
                  <Text style={[styles.templateItemCount, { color: colors.textSecondary, fontSize: font.xs }]}>
                    {template.players.length} joueurs
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Add Opponent Form */}
      <View style={styles.addOpponentFormWrapper}>
        <View style={styles.addOpponentForm}>
          <TextInput
            placeholder="Nom (Optionnel)"
            placeholderTextColor={colors.textSecondary}
            value={newPlayerName}
            onChangeText={onNewNameChange}
            style={[
              styles.addOpponentInput,
              styles.addOpponentInputName,
              {
                backgroundColor: colors.surfaceColor,
                borderColor: colors.borderColor,
                color: colors.textPrimary,
              },
            ]}
          />
          <TextInput
            placeholder="#"
            placeholderTextColor={colors.textSecondary}
            value={newPlayerNumber}
            onChangeText={onNewNumberChange}
            keyboardType="number-pad"
            style={[
              styles.addOpponentInput,
              styles.addOpponentInputNumber,
              {
                backgroundColor: colors.surfaceColor,
                borderColor: colors.borderColor,
                color: colors.textPrimary,
              },
            ]}
          />
          <TouchableOpacity
            onPress={onAddPlayer}
            disabled={!newPlayerNumber}
            style={[
              styles.addOpponentButton,
              {
                backgroundColor: BRAND_COLORS[600],
                opacity: newPlayerNumber ? 1 : OPACITY.disabled,
              },
            ]}
          >
            <Text
              style={[
                styles.addOpponentButtonText,
                { color: COMMON_COLORS.white },
              ]}
            >
              OK
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="VTXXXXXX"
          placeholderTextColor={colors.textSecondary}
          value={newPlayerLicense}
          onChangeText={onNewLicenseChange}
          autoCapitalize="characters"
          style={[
            styles.addOpponentInput,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: colors.borderColor,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

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
            <Text
              style={[styles.emptyOpponentText, { color: colors.textSecondary }]}
            >
              {MATCH_CREATION_INFO_MESSAGES.NO_OPPONENT_PLAYERS}
            </Text>
          </View>
        )}
      </View>

      {/* Save template button */}
      {opponentRoster.length > 0 && (
        <TouchableOpacity
          onPress={onSaveTemplate}
          style={[
            styles.saveTemplateButton,
            {
              borderColor: BRAND_COLORS[600],
              backgroundColor: isDark
                ? `${BRAND_COLORS[600]}15`
                : `${BRAND_COLORS[600]}08`,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="content-save-outline"
            size={16}
            color={BRAND_COLORS[600]}
          />
          <Text
            style={[styles.saveTemplateText, { color: BRAND_COLORS[600] }]}
            numberOfLines={1}
          >
            Sauvegarder : {defaultTemplateName}
          </Text>
        </TouchableOpacity>
      )}
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
  addOpponentFormWrapper: {
    gap: 8,
    marginBottom: 24,
  },
  addOpponentForm: {
    flexDirection: "row",
    gap: 8,
  },
  addOpponentInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addOpponentInputName: {
    flex: 1,
  },
  addOpponentInputNumber: {
    width: 64,
    textAlign: "center",
  },
  addOpponentButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addOpponentButtonText: {
    fontSize: 14,
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
  saveTemplateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  saveTemplateText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
});
