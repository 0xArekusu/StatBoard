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
import { useResponsive } from "../src/hooks/useResponsive";

export default function SplashScreen() {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();

  useEffect(() => {
    logInfo("SplashScreen", "🚀 App initialization started");
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo */}
      <Logo
        width={sizes.logoMd * 2.5}
        primaryColor={colors.onLogoPrimary}
        secondaryColor={colors.onLogoSecondary}
        ballColor={colors.primary}
        ballBackgroundColor={colors.button.secondary}
      />

      {/* Loading indicator */}
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={[styles.loader, { marginTop: sp.xxl }]}
      />
      <Text style={[styles.loadingText, { color: colors.text.secondary, fontSize: font.lg, marginTop: sp.md }]}>
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
