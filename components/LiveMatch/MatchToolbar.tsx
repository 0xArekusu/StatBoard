import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { FilterMode } from "../../constants/liveMatchConstants";
import { useResponsive } from "../../src/hooks/useResponsive";
import { useLandscapeCollapse } from "../../src/hooks/useLandscapeCollapse";
import { LandscapeToggleButton } from "./LandscapeToggleButton";

interface MatchToolbarProps {
  filterMode: FilterMode;
  showMarkers: boolean;
  isGeneratingMockData: boolean;
  isAdmin?: boolean;
  hasActiveFilters?: boolean;
  onUndo: () => void;
  onOpenFilter: () => void;
  onToggleMarkers: () => void;
  onGenerateMock: () => void;
  onOpenHistory: () => void;
}

export function MatchToolbar({
  filterMode,
  showMarkers,
  isGeneratingMockData,
  isAdmin = false,
  hasActiveFilters = false,
  onUndo,
  onOpenFilter,
  onToggleMarkers,
  onGenerateMock,
  onOpenHistory,
}: MatchToolbarProps) {
  const { colors } = useTheme();
  const { isMobileLandscape } = useResponsive();
  const surfaceColor = colors.surface;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  const iconSize = isMobileLandscape ? 18 : 22;
  const toolbarHeight = isMobileLandscape ? 44 : 64;

  const [expanded, setExpanded] = useLandscapeCollapse(isMobileLandscape);

  // Paysage téléphone + repliée : un simple onglet flottant pour déplier la barre
  if (isMobileLandscape && !expanded) {
    return (
      <LandscapeToggleButton
        icon={hasActiveFilters ? "filter" : "filter-outline"}
        onPress={() => setExpanded(true)}
        color={colors.primary}
        backgroundColor={surfaceColor}
        borderColor={borderColor}
        style={styles.toggleButtonCollapsed}
        size={36}
        iconSize={20}
      />
    );
  }

  return (
    <View
      style={[
        styles.toolbar,
        {
          backgroundColor: surfaceColor,
          borderTopColor: borderColor,
          height: toolbarHeight,
          paddingRight: isMobileLandscape ? 44 : 8,
        },
      ]}
    >
      {isMobileLandscape && (
        <LandscapeToggleButton
          icon="chevron-down"
          onPress={() => setExpanded(false)}
          color={colors.primary}
          backgroundColor={surfaceColor}
          borderColor={borderColor}
          style={styles.toggleButtonInBar}
          size={36}
          iconSize={18}
        />
      )}

      <TouchableOpacity onPress={onUndo} style={styles.toolbarButton}>
        <MaterialCommunityIcons
          name="undo"
          size={iconSize}
          color={textSecondary}
        />
        {!isMobileLandscape && (
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Annuler
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenFilter} style={styles.toolbarButton}>
        <MaterialCommunityIcons
          name={hasActiveFilters ? "filter" : "filter-outline"}
          size={iconSize}
          color={hasActiveFilters ? colors.primary : textSecondary}
        />
        {!isMobileLandscape && (
          <Text
            style={[
              styles.toolbarButtonText,
              {
                color: hasActiveFilters ? colors.primary : textSecondary,
              },
            ]}
          >
            Filtres
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onToggleMarkers} style={styles.toolbarButton}>
        <MaterialCommunityIcons
          name={showMarkers ? "eye" : "eye-off"}
          size={iconSize}
          color={showMarkers ? colors.primary : textSecondary}
        />
        {!isMobileLandscape && (
          <Text
            style={[
              styles.toolbarButtonText,
              { color: showMarkers ? colors.primary : textSecondary },
            ]}
          >
            Vue
          </Text>
        )}
      </TouchableOpacity>

      {isAdmin && (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Ajouter des données de test ?",
              "Cela va générer des actions fictives pour le match.",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Confirmer", onPress: onGenerateMock },
              ],
            );
          }}
          disabled={isGeneratingMockData}
          style={[
            styles.toolbarButton,
            isGeneratingMockData && { opacity: 0.5 },
          ]}
        >
          <MaterialCommunityIcons
            name="flask"
            size={iconSize}
            color={colors.primary}
          />
          {!isMobileLandscape && (
            <Text style={[styles.toolbarButtonText, { color: colors.primary }]}>
              {isGeneratingMockData ? "..." : "Test"}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onOpenHistory} style={styles.toolbarButton}>
        <MaterialCommunityIcons
          name="format-list-bulleted"
          size={iconSize}
          color={textSecondary}
        />
        {!isMobileLandscape && (
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Historique
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  toolbarButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  toolbarButtonText: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
  },
  toggleButtonCollapsed: {
    bottom: 6,
    right: 6,
  },
  toggleButtonInBar: {
    top: 4,
    right: 6,
  },
});
