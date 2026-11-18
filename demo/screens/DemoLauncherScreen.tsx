/**
 * DemoLauncherScreen
 *
 * Entry screen of the demo. Each time it gets focus (first load, or a screen
 * leaving the match), it opens the real LiveMatch screen on the right match.
 * The stack is reset so every match gets a freshly mounted LiveMatch screen.
 */

import React, { useCallback, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { RootNavigationProp } from "../../types/navigation";
import { logError } from "../../utils/logger";
import { ROUTES } from "../../constants/routes";
import { DemoServiceFactory } from "../services/DemoServiceFactory";
import { disableLiveMatchTutorial } from "../services/demoTutorialPreference";
import { consumeDemoResetRequest } from "../utils/demoResetRequest";

export default function DemoLauncherScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { colors } = useTheme();
  const isLaunchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isLaunchingRef.current) return;
      isLaunchingRef.current = true;

      const launchMatch = async () => {
        try {
          await disableLiveMatchTutorial();
          const params = await DemoServiceFactory.getMatchLauncher().resolveLaunchParams(
            consumeDemoResetRequest(),
          );
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.LIVE_MATCH, params }],
          });
        } catch (error) {
          logError("DemoLauncherScreen", "❌ Failed to launch demo match", { error });
        } finally {
          isLaunchingRef.current = false;
        }
      };

      launchMatch();
    }, [navigation]),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
