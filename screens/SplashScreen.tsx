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

export default function SplashScreen() {
  useEffect(() => {
    logInfo("SplashScreen", "🚀 App initialization started");
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo placeholder - uncomment when logo asset is available */}
      {/* <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      /> */}

      {/* Loading indicator */}
      <ActivityIndicator size="large" color="#007AFF" />
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
  // Loading text displayed below spinner
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
});
