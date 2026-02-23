/**
 * Location Selector Component
 *
 * Toggle between home and away location for the match.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { BRAND_COLORS, COMMON_COLORS } from "../../src/theme";
import { MATCH_CREATION_FORM_LABELS } from "../../constants";
import { useResponsive } from "../../src/hooks/useResponsive";

interface LocationSelectorProps {
  /** Whether the match is at home (true) or away (false) */
  isHome: boolean;
  /** Callback when location changes */
  onLocationChange: (isHome: boolean) => void;
  /** Theme colors */
  colors: {
    surfaceColor: string;
    textSecondary: string;
    borderColor: string;
  };
}

/**
 * Location selector with Home/Away toggle buttons
 */
export const LocationSelector: React.FC<LocationSelectorProps> = ({
  isHome,
  onLocationChange,
  colors,
}) => {
  const { sp, font } = useResponsive();
  return (
    <View style={[styles.formSection, { marginBottom: sp.lg }]}>
      <Text style={[styles.formLabel, { color: colors.textSecondary, fontSize: font.xs, marginBottom: sp.sm }]}>
        {MATCH_CREATION_FORM_LABELS.LOCATION}
      </Text>
      <View style={[styles.locationButtons, { gap: sp.md }]}>
        <TouchableOpacity
          onPress={() => onLocationChange(true)}
          style={[
            styles.locationButton,
            {
              backgroundColor: isHome
                ? BRAND_COLORS[600]
                : colors.surfaceColor,
              borderColor: isHome ? BRAND_COLORS[500] : colors.borderColor,
              paddingVertical: sp.md,
              borderRadius: sp.md,
            },
          ]}
        >
          <Text
            style={[
              styles.locationButtonText,
              {
                color: isHome ? COMMON_COLORS.white : colors.textSecondary,
                fontSize: font.md,
              },
            ]}
          >
            {MATCH_CREATION_FORM_LABELS.HOME}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onLocationChange(false)}
          style={[
            styles.locationButton,
            {
              backgroundColor: !isHome
                ? BRAND_COLORS[600]
                : colors.surfaceColor,
              borderColor: !isHome ? BRAND_COLORS[500] : colors.borderColor,
              paddingVertical: sp.md,
              borderRadius: sp.md,
            },
          ]}
        >
          <Text
            style={[
              styles.locationButtonText,
              {
                color: !isHome ? COMMON_COLORS.white : colors.textSecondary,
                fontSize: font.md,
              },
            ]}
          >
            {MATCH_CREATION_FORM_LABELS.AWAY}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  locationButtons: {
    flexDirection: "row",
    gap: 16,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
