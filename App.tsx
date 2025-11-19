/**
 * App.tsx
 *
 * Main application component that sets up navigation and authentication context.
 * Manages the initial loading state and renders the navigation stack once ready.
 */

import { useState, useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppState, AppStateStatus } from "react-native";
import MainMenuScreen from "./screens/MainMenuScreen";
import BoardScreen from "./screens/BoardScreen";
import MatchDetailsScreen from "./screens/MatchDetailsScreen";
import MatchSummaryScreen from "./screens/MatchSummaryScreen";
import MatchHistoryScreen from "./screens/MatchHistoryScreen";
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import ClubFormScreen from "./screens/ClubFormScreen";
import TeamFormScreen from "./screens/TeamFormScreen";
import JoinClubScreen from "./screens/JoinClubScreen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { ROUTES } from "./constants/routes";
import { logInfo, logWarn } from "./utils/logger";
import DebugCourtClick from "./DebugCourtClick";

const Stack = createNativeStackNavigator();

/**
 * Navigation component that manages the app's screen navigation
 * Displays splash screen during loading, then shows the main navigation stack
 */
function Navigation() {
  const { loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logInfo("App", "🚀 App initialization started");

    // Simulate initial loading time for splash screen
    setTimeout(() => {
      setIsLoading(false);
      logInfo("App", "✅ App initialization completed");
    }, 500);
  }, []);

  // Show splash screen while loading auth or initial data
  if (isLoading || loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ROUTES.MAIN_MENU}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name={ROUTES.DEBUG_COURT} component={DebugCourtClick} />
        <Stack.Screen name={ROUTES.MAIN_MENU} component={MainMenuScreen} />
        <Stack.Screen name={ROUTES.BOARD} component={BoardScreen} />
        <Stack.Screen
          name={ROUTES.MATCH_HISTORY}
          component={MatchHistoryScreen}
        />
        <Stack.Screen
          name={ROUTES.MATCH_SUMMARY}
          component={MatchSummaryScreen}
        />
        <Stack.Screen
          name={ROUTES.MATCH_DETAILS}
          component={MatchDetailsScreen}
        />
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={ROUTES.SIGN_UP} component={SignUpScreen} />
        <Stack.Screen name={ROUTES.CLUB_FORM} component={ClubFormScreen} />
        <Stack.Screen name={ROUTES.TEAM_FORM} component={TeamFormScreen} />
        <Stack.Screen name={ROUTES.JOIN_CLUB} component={JoinClubScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * Root App component
 * Sets up providers (SafeArea, Auth) and renders the navigation
 * Also tracks app lifecycle (foreground, background, inactive)
 */
export default function App() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Log initial app state
    logInfo("App", "📱 App initial state", {
      currentState: appState.current
    });

    /**
     * AppState listener - Tracks when app goes to background or comes to foreground
     * States:
     * - "active": App is in foreground and user is interacting
     * - "background": App is in background (user switched to another app)
     * - "inactive": App is transitioning between states (iOS only, brief state)
     */
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      const previousState = appState.current;

      // App coming back to foreground (from background or inactive)
      if (
        previousState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        logInfo("App", "🟢 App came to foreground", {
          previousState,
          currentState: nextAppState,
          timestamp: new Date().toISOString()
        });
      }

      // App going to background
      if (
        previousState === "active" &&
        nextAppState === "background"
      ) {
        logInfo("App", "⚫ App went to background", {
          previousState,
          currentState: nextAppState,
          timestamp: new Date().toISOString()
        });
      }

      // App going inactive (iOS transition state)
      if (
        previousState === "active" &&
        nextAppState === "inactive"
      ) {
        logWarn("App", "🟡 App became inactive (transitioning)", {
          previousState,
          currentState: nextAppState,
          timestamp: new Date().toISOString()
        });
      }

      appState.current = nextAppState;

      // Log all state changes for debugging
      logInfo("App", "🔄 App state changed", {
        from: previousState,
        to: nextAppState,
        timestamp: new Date().toISOString()
      });
    });

    // Cleanup listener on unmount (app closing)
    return () => {
      logInfo("App", "🔴 App component unmounting (app closing)", {
        lastState: appState.current,
        timestamp: new Date().toISOString()
      });
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <Navigation />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
