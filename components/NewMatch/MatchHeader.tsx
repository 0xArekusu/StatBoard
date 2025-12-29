/**
 * Match Header Component
 *
 * Displays the navigation header and progress bar for the match creation flow.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MATCH_CREATION_STEP_LABELS, type MatchCreationStep } from "../../constants";
import { useTheme } from "../../src/contexts/ThemeContext";

interface MatchHeaderProps {
  /** Current step in the match creation flow */
  step: MatchCreationStep;
  /** Callback when back/close button is pressed */
  onBack: () => void;
}

/**
 * Header component with navigation and progress indicator
 */
export const MatchHeader: React.FC<MatchHeaderProps> = ({
  step,
  onBack,
}) => {
  const { colors } = useTheme();
  return (
    <>
      {/* Header with title and navigation */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons
            name={step === 2 ? "arrow-left" : "close"}
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {MATCH_CREATION_STEP_LABELS[step]}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressStep,
              {
                backgroundColor:
                  step >= 1 ? colors.primary : colors.border,
              },
            ]}
          />
          <View
            style={[
              styles.progressStep,
              {
                backgroundColor:
                  step >= 2 ? colors.primary : colors.border,
              },
            ]}
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressBar: {
    flexDirection: "row",
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
});
