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
import AuthScreen from "./screens/authentication/AuthScreen";
import LoginScreen from "./screens/authentication/LoginScreen";
import RegisterScreen from "./screens/authentication/RegisterScreen";
import MatchDetailsScreen from "./screens/MatchDetailsScreen";
import SplashScreen from "./screens/SplashScreen";
import TeamInfoScreen from "./screens/club/TeamInfoScreen";
import TeamRosterScreen from "./screens/club/TeamRosterScreen";
import TeamStartersScreen from "./screens/club/TeamStartersScreen";
import NewMatchScreen from "./screens/NewMatchScreen";
import LiveMatchScreen from "./screens/LiveMatchScreen";
import MainTabNavigator from "./navigation/MainTabNavigator";
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
  const { loading, user } = useAuth();
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

  // Determine initial route based on authentication state
  const initialRoute = user ? ROUTES.MAIN_TABS : ROUTES.AUTH;

  logInfo("App", "🧭 Determining initial route", {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    initialRoute,
  });

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name={ROUTES.AUTH} component={AuthScreen} />
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={ROUTES.SIGN_UP} component={RegisterScreen} />
        <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabNavigator} />
        <Stack.Screen name={ROUTES.DEBUG_COURT} component={DebugCourtClick} />
        <Stack.Screen
          name={ROUTES.MATCH_DETAILS}
          component={MatchDetailsScreen}
        />
        <Stack.Screen name={ROUTES.TEAM_INFO} component={TeamInfoScreen} />
        <Stack.Screen name={ROUTES.TEAM_ROSTER} component={TeamRosterScreen} />
        <Stack.Screen
          name={ROUTES.TEAM_STARTERS}
          component={TeamStartersScreen}
        />
        <Stack.Screen name={ROUTES.NEW_MATCH} component={NewMatchScreen} />
        <Stack.Screen name={ROUTES.LIVE_MATCH} component={LiveMatchScreen} />
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
      currentState: appState.current,
    });

    /**
     * AppState listener - Tracks when app goes to background or comes to foreground
     * States:
     * - "active": App is in foreground and user is interacting
     * - "background": App is in background (user switched to another app)
     * - "inactive": App is transitioning between states (iOS only, brief state)
     */
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        const previousState = appState.current;

        // App coming back to foreground (from background or inactive)
        if (
          previousState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          logInfo("App", "🟢 App came to foreground", {
            previousState,
            currentState: nextAppState,
            timestamp: new Date().toISOString(),
          });
        }

        // App going to background
        if (previousState === "active" && nextAppState === "background") {
          logInfo("App", "⚫ App went to background", {
            previousState,
            currentState: nextAppState,
            timestamp: new Date().toISOString(),
          });
        }

        // App going inactive (iOS transition state)
        if (previousState === "active" && nextAppState === "inactive") {
          logWarn("App", "🟡 App became inactive (transitioning)", {
            previousState,
            currentState: nextAppState,
            timestamp: new Date().toISOString(),
          });
        }

        appState.current = nextAppState;

        // Log all state changes for debugging
        logInfo("App", "🔄 App state changed", {
          from: previousState,
          to: nextAppState,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Cleanup listener on unmount (app closing)
    return () => {
      logInfo("App", "🔴 App component unmounting (app closing)", {
        lastState: appState.current,
        timestamp: new Date().toISOString(),
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
