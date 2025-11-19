/**
 * SplashScreen Component
 *
 * Initial loading screen displayed while the app initializes.
 * Shows a loading spinner while checking authentication status
 * and loading necessary data (database, user session, etc.).
 */

import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { logInfo } from "../utils/logger";
import Logo from "../components/icons/Logo";
import { useTheme } from "../src/contexts/ThemeContext";

export default function SplashScreen() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    logInfo("SplashScreen", "🚀 App initialization started");
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo */}
      <Logo width={350} />

      {/* Loading indicator */}
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
        Chargement...
      </Text>
      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container - centered content
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Loading indicator with margin
  loader: {
    marginTop: 40,
  },
  // Loading text displayed below spinner
  loadingText: {
    fontSize: 18,
    marginTop: 16,
  },
});
