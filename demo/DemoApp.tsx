/**
 * DemoApp
 *
 * Root of the interactive demo embedded in the landing page. It renders the
 * real LiveMatch and MatchDetails screens, unchanged, as a guest user:
 * - no sign-in, no club: the visitor lands directly on a match
 * - no PostHogProvider: the landing page sends no product analytics
 * - matches live in the browser storage (SQLite web), like the app's local mode
 * - web-only gaps of existing components are filled by polyfills in ./polyfills
 */

// Must run before any screen renders (see the polyfill header)
import "./polyfills/webSvgPressLocation";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import { LanguageProvider } from "../src/contexts/LanguageContext";
import { AuthProvider } from "../src/contexts/AuthContext";
import { ClubProvider } from "../src/contexts/ClubContext";
import { AdProvider } from "../src/contexts/AdContext";
import "../src/i18n";
import LiveMatchScreen from "../screens/LiveMatchScreen";
import MatchDetailsScreen from "../screens/MatchDetailsScreen";
import PlayerProfileScreen from "../screens/PlayerProfileScreen";
import DemoLauncherScreen from "./screens/DemoLauncherScreen";
import { ROUTES } from "../constants/routes";
import { DEMO_ROUTES } from "./constants/demoConstants";

const Stack = createNativeStackNavigator();

const DemoNavigation = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName={DEMO_ROUTES.LAUNCHER}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={DEMO_ROUTES.LAUNCHER} component={DemoLauncherScreen} />
      {/* Leaving a match lands on the dashboard in the app: restart the demo instead */}
      <Stack.Screen name={DEMO_ROUTES.DASHBOARD_TAB} component={DemoLauncherScreen} />
      <Stack.Screen name={ROUTES.MAIN_TABS} component={DemoLauncherScreen} />
      <Stack.Screen name={ROUTES.LIVE_MATCH} component={LiveMatchScreen} />
      <Stack.Screen name={ROUTES.MATCH_DETAILS} component={MatchDetailsScreen} />
      <Stack.Screen name={ROUTES.PLAYER_PROFILE} component={PlayerProfileScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default function DemoApp() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <ClubProvider>
                  <AdProvider>
                    <DemoNavigation />
                  </AdProvider>
                </ClubProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
