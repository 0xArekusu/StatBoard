/**
 * ThemeToggleButton
 *
 * Floating button to toggle between light and dark mode
 * Can be placed on any screen for testing theme changes
 */

import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";

interface ThemeToggleButtonProps {
  position?: "left" | "right";
}

export default function ThemeToggleButton({
  position = "left",
}: ThemeToggleButtonProps) {
  const { colors, isDark, setThemeMode } = useTheme();

  const handleToggle = () => {
    const nextMode = isDark ? "light" : "dark";
    setThemeMode(nextMode);
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        position === "left" ? styles.left : styles.right,
        { backgroundColor: colors.surfaceVariant },
      ]}
      onPress={handleToggle}
    >
      <Ionicons
        name={isDark ? "sunny-outline" : "moon-outline"}
        size={24}
        color={colors.text.primary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 20,
    borderRadius: 30,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  left: {
    left: 20,
  },
  right: {
    right: 20,
  },
});
