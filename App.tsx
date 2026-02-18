/**
 * App.tsx
 *
 * Main application component that sets up navigation and authentication context.
 * Manages the initial loading state and renders the navigation stack once ready.
 */

import { useState, useEffect, useRef } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppState, AppStateStatus, Linking } from "react-native";
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
import { ClubProvider } from "./src/contexts/ClubContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { ROUTES } from "./constants/routes";
import { logInfo, logWarn, logError } from "./utils/logger";
import DebugCourtClick from "./DebugCourtClick";

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

/**
 * Navigation component that manages the app's screen navigation
 * Displays splash screen during loading, then shows the main navigation stack
 */
function Navigation() {
  const { loading, user, createSessionFromUrl } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const pendingEmailConfirmed = useRef<'confirmed' | 'error' | false>(false);

  useEffect(() => {
    logInfo("App", "🚀 App initialization started");

    // Simulate initial loading time for splash screen
    setTimeout(() => {
      setIsLoading(false);
      logInfo("App", "✅ App initialization completed");
    }, 500);
  }, []);

  useEffect(() => {
    /**
     * Handle deep linking for authentication
     * Listens for incoming deep links (email confirmation, password reset)
     */
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      logInfo("App", "🔗 Deep link received", { url });

      // Check if it's an auth-related deep link
      const isEmailCallback = url.includes('auth/callback');
      const isPasswordReset = url.includes('reset-password');

      if (isEmailCallback || isPasswordReset) {
        logInfo("App", "🔐 Processing authentication deep link");
        const { error } = await createSessionFromUrl(url);

        if (isEmailCallback) {
          if (error) {
            logError("App", "❌ Failed to process deep link", { error: error.message });
            if (navigationRef.isReady()) {
              navigationRef.navigate(ROUTES.LOGIN, { emailError: true });
            } else {
              pendingEmailConfirmed.current = 'error';
            }
          } else {
            logInfo("App", "✅ Email confirmed, navigating to login");
            if (navigationRef.isReady()) {
              navigationRef.navigate(ROUTES.LOGIN, { emailConfirmed: true });
            } else {
              pendingEmailConfirmed.current = 'confirmed';
            }
          }
        } else if (error) {
          logError("App", "❌ Failed to process deep link", { error: error.message });
        } else {
          logInfo("App", "✅ Successfully processed deep link");
        }
      }
    };

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        logInfo("App", "🔗 Initial URL detected", { url });
        handleDeepLink({ url });
      }
    }).catch((err) => {
      logError("App", "❌ Error getting initial URL", { error: err.message });
    });

    return () => {
      subscription.remove();
    };
  }, [createSessionFromUrl]);

  // Once splash screen is done, flush any pending navigation
  useEffect(() => {
    if (!isLoading && !loading && pendingEmailConfirmed.current) {
      const pending = pendingEmailConfirmed.current;
      pendingEmailConfirmed.current = false;
      if (navigationRef.isReady()) {
        if (pending === 'confirmed') {
          logInfo("App", "✅ Flushing pending email confirmed navigation");
          navigationRef.navigate(ROUTES.LOGIN, { emailConfirmed: true });
        } else if (pending === 'error') {
          logInfo("App", "❌ Flushing pending email error navigation");
          navigationRef.navigate(ROUTES.LOGIN, { emailError: true });
        }
      }
    }
  }, [isLoading, loading]);

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
    <NavigationContainer ref={navigationRef}>
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
            <ClubProvider>
              <Navigation />
            </ClubProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
