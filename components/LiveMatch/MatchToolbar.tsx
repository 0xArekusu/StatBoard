import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { FilterMode } from "../../constants/liveMatchConstants";
import { AdminService } from "../../services/AdminService";
import { useResponsive } from "../../src/hooks/useResponsive";

interface MatchToolbarProps {
  filterMode: FilterMode;
  showMarkers: boolean;
  isGeneratingMockData: boolean;
  isAdmin?: boolean;
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
  onUndo,
  onOpenFilter,
  onToggleMarkers,
  onGenerateMock,
  onOpenHistory,
}: MatchToolbarProps) {
  const { colors } = useTheme();
  const { isPortrait } = useResponsive();
  const isLandscape = !isPortrait;
  const surfaceColor = colors.surface;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  const iconSize = isLandscape ? 18 : 22;
  const toolbarHeight = isLandscape ? 44 : 64;

  return (
    <View
      style={[
        styles.toolbar,
        {
          backgroundColor: surfaceColor,
          borderTopColor: borderColor,
          height: toolbarHeight,
        },
      ]}
    >
      <TouchableOpacity onPress={onUndo} style={styles.toolbarButton}>
        <MaterialCommunityIcons name="undo" size={iconSize} color={textSecondary} />
        {!isLandscape && (
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Annuler
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenFilter} style={styles.toolbarButton}>
        <MaterialCommunityIcons
          name="filter-outline"
          size={iconSize}
          color={filterMode !== FilterMode.ALL ? colors.primary : textSecondary}
        />
        {!isLandscape && (
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
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
        {!isLandscape && (
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
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
              ]
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
          {!isLandscape && (
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
        {!isLandscape && (
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
});
