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

export default function SplashScreen() {
  useEffect(() => {
    logInfo("SplashScreen", "🚀 App initialization started");
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Logo width={350} />

      {/* Loading indicator */}
      <ActivityIndicator size="large" color="#FF6B35" style={styles.loader} />
      <Text style={styles.loadingText}>Chargement...</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container - centered content
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    color: "#666",
    marginTop: 16,
  },
});
