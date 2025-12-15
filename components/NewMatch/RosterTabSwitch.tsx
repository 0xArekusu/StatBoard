/**
 * Roster Tab Switch Component
 *
 * Animated toggle switch between home and opponent rosters.
 */

import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { BRAND_COLORS, SLATE_COLORS, COMMON_COLORS } from "../../src/theme";
import { MATCH_ROSTER_TAB_LABELS } from "../../constants";

type RosterTab = "HOME" | "AWAY";

interface RosterTabSwitchProps {
  /** Current selected tab */
  activeTab: RosterTab;
  /** Callback when tab changes */
  onTabChange: (tab: RosterTab) => void;
  /** Number of home players */
  homeCount: number;
  /** Number of opponent players */
  opponentCount: number;
  /** Whether dark mode is enabled */
  isDark: boolean;
  /** Theme colors */
  colors: {
    surfaceColor: string;
    textSecondary: string;
    borderColor: string;
  };
}

/**
 * Animated toggle switch for roster tabs
 */
export const RosterTabSwitch: React.FC<RosterTabSwitchProps> = ({
  activeTab,
  onTabChange,
  homeCount,
  opponentCount,
  isDark,
  colors,
}) => {
  const toggleAnimation = useRef(new Animated.Value(activeTab === "HOME" ? 0 : 1)).current;

  const handleToggle = () => {
    const newTab: RosterTab = activeTab === "HOME" ? "AWAY" : "HOME";
    const toValue = newTab === "HOME" ? 0 : 1;

    Animated.spring(toggleAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    onTabChange(newTab);
  };

  return (
    <View
      style={[
        styles.tabsContainer,
        { backgroundColor: colors.surfaceColor, borderBottomColor: colors.borderColor },
      ]}
    >
      <TouchableOpacity
        onPress={handleToggle}
        style={[
          styles.toggleButton,
          {
            backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
            borderColor: colors.borderColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.toggleSlider,
            {
              backgroundColor: BRAND_COLORS[600],
              transform: [
                {
                  translateX: toggleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 120],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={styles.toggleOption}>
          <Text
            style={[
              styles.toggleText,
              {
                color:
                  activeTab === "HOME"
                    ? COMMON_COLORS.white
                    : colors.textSecondary,
                fontWeight: activeTab === "HOME" ? "bold" : "normal",
              },
            ]}
          >
            {MATCH_ROSTER_TAB_LABELS.US} ({homeCount})
          </Text>
        </View>
        <View style={styles.toggleOption}>
          <Text
            style={[
              styles.toggleText,
              {
                color:
                  activeTab === "AWAY"
                    ? COMMON_COLORS.white
                    : colors.textSecondary,
                fontWeight: activeTab === "AWAY" ? "bold" : "normal",
              },
            ]}
          >
            {MATCH_ROSTER_TAB_LABELS.THEM} ({opponentCount})
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  toggleButton: {
    flexDirection: "row",
    width: 240,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    position: "relative",
    overflow: "hidden",
  },
  toggleSlider: {
    position: "absolute",
    width: 112,
    height: 44,
    borderRadius: 10,
    left: 0,
    top: 0,
    zIndex: 1,
  },
  toggleOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  toggleText: {
    fontSize: 12,
  },
});
