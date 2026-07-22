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
import * as Updates from "expo-updates";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import AuthScreen from "./screens/authentication/AuthScreen";
import LoginScreen from "./screens/authentication/LoginScreen";
import RegisterScreen from "./screens/authentication/RegisterScreen";
import ResetPasswordScreen from "./screens/authentication/ResetPasswordScreen";
import MatchDetailsScreen from "./screens/MatchDetailsScreen";
import PlayerProfileScreen from "./screens/PlayerProfileScreen";
import SplashScreen from "./screens/SplashScreen";
import TeamInfoScreen from "./screens/club/TeamInfoScreen";
import TeamRosterScreen from "./screens/club/TeamRosterScreen";
import TeamStartersScreen from "./screens/club/TeamStartersScreen";
import NewMatchScreen from "./screens/NewMatchScreen";
import LiveMatchScreen from "./screens/LiveMatchScreen";
import SentryTestScreen from "./screens/SentryTestScreen";
import MainTabNavigator from "./navigation/MainTabNavigator";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ClubProvider } from "./src/contexts/ClubContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { AdProvider } from "./src/contexts/AdContext";
import { ROUTES } from "./constants/routes";
import { ANALYTICS_EVENTS } from "./constants/analyticsEvents";
import { logInfo, logWarn, logError, logger } from "./utils/logger";
import DebugCourtClick from "./DebugCourtClick";
import { useAppUpdateCheck } from "./hooks/useAppUpdateCheck";
import ForceUpdateModal from "./components/ForceUpdateModal";
import ChangelogModal from "./components/ChangelogModal";


// Initialize Sentry
try {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,
    enableNativeFramesTracking: true,
    tracesSampleRate: 1.0,
    environment: __DEV__ ? "development" : "production",
    debug: false,
    beforeSend: async (event, hint) => {
      // Attach last 2000 lines of logs to the error
      try {
        const logContent = await logger.getLastLines(2000);
        if (logContent && logContent !== "No logs available") {
          event.contexts = event.contexts || {};
          event.contexts.logs = {
            last_2000_lines: logContent,
          };
        }
      } catch (error) {
        // Silently ignore log attachment failures
      }

      return event;
    },
  });
} catch (error) {
  // Silently ignore Sentry initialization errors
}

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

/**
 * Navigation component that manages the app's screen navigation
 * Displays splash screen during loading, then shows the main navigation stack
 */
function Navigation() {
  const { loading, user, createSessionFromUrl } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const pendingNavigation = useRef<'emailConfirmed' | 'emailError' | 'resetPassword' | 'resetPasswordError' | false>(false);
  const { isForceUpdateRequired, storeUrl, changelog, dismissChangelog } = useAppUpdateCheck();
  const posthog = usePostHog();
  const routeNameRef = useRef<string | undefined>(undefined);

  // Identify the PostHog user on login, reset on logout.
  // is_guest is registered as a super property so it's attached to every
  // subsequent event automatically (screens, match creation, etc.) without
  // threading it through each individual capture() call.
  useEffect(() => {
    if (user) {
      posthog?.identify(user.id, { email: user.email ?? null });
      posthog?.register({ is_guest: false });
    } else {
      posthog?.reset();
      posthog?.register({ is_guest: true });
    }
  }, [user, posthog]);

  useEffect(() => {
    logInfo("App", "🚀 App initialization started");

    // Check and apply OTA update silently during splash screen.
    // If fetch completes in time, reloadAsync() restarts the JS bundle seamlessly.
    // If it takes longer, the update is cached and will apply on the next launch.
    let canReload = true;
    if (!__DEV__) {
      (async () => {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            logInfo("App", "📦 OTA update found, fetching...");
            await Updates.fetchUpdateAsync();
            if (canReload) {
              logInfo("App", "🔄 Applying OTA update during splash...");
              await Updates.reloadAsync();
            }
          }
        } catch (err) {
          logWarn("App", "OTA check skipped", { err });
        }
      })();
    }

    const timer = setTimeout(() => {
      canReload = false;
      setIsLoading(false);
      logInfo("App", "✅ App initialization completed");
    }, 500);

    return () => clearTimeout(timer);
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
            logError("App", "❌ Failed to process email callback", { error: error.message });
            posthog?.capture(ANALYTICS_EVENTS.ACCOUNT_CONFIRMATION_FAILED, { error_message: error.message ?? null });
            if (navigationRef.isReady()) {
              navigationRef.navigate(ROUTES.LOGIN, { emailError: true });
            } else {
              pendingNavigation.current = 'emailError';
            }
          } else {
            logInfo("App", "✅ Email confirmed, navigating to login");
            posthog?.capture(ANALYTICS_EVENTS.ACCOUNT_CONFIRMED);
            if (navigationRef.isReady()) {
              navigationRef.navigate(ROUTES.LOGIN, { emailConfirmed: true });
            } else {
              pendingNavigation.current = 'emailConfirmed';
            }
          }
        } else if (isPasswordReset) {
          if (error) {
            logError("App", "❌ Failed to process password reset link", { error: error.message });
            if (navigationRef.isReady()) {
              navigationRef.navigate(ROUTES.LOGIN, { emailError: true });
            } else {
              pendingNavigation.current = 'resetPasswordError';
            }
          } else {
            logInfo("App", "✅ Password reset session created, navigating to reset screen");
            if (navigationRef.isReady()) {
              navigationRef.navigate(ROUTES.RESET_PASSWORD);
            } else {
              pendingNavigation.current = 'resetPassword';
            }
          }
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
    if (!isLoading && !loading && pendingNavigation.current) {
      const pending = pendingNavigation.current;
      pendingNavigation.current = false;
      if (navigationRef.isReady()) {
        switch (pending) {
          case 'emailConfirmed':
            logInfo("App", "✅ Flushing pending email confirmed navigation");
            navigationRef.navigate(ROUTES.LOGIN, { emailConfirmed: true });
            break;
          case 'emailError':
          case 'resetPasswordError':
            logInfo("App", "❌ Flushing pending auth error navigation");
            navigationRef.navigate(ROUTES.LOGIN, { emailError: true });
            break;
          case 'resetPassword':
            logInfo("App", "✅ Flushing pending reset password navigation");
            navigationRef.navigate(ROUTES.RESET_PASSWORD as never);
            break;
        }
      }
    }
  }, [isLoading, loading]);

  // Show splash screen while loading auth or initial data
  if (isLoading || loading) {
    return (
      <>
        <SplashScreen />
        <ForceUpdateModal visible={isForceUpdateRequired} storeUrl={storeUrl} />
      </>
    );
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
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          routeNameRef.current = navigationRef.getCurrentRoute()?.name;
        }}
        onStateChange={() => {
          const previousRouteName = routeNameRef.current;
          const currentRouteName = navigationRef.getCurrentRoute()?.name;
          if (currentRouteName && previousRouteName !== currentRouteName) {
            posthog?.screen(currentRouteName);
          }
          routeNameRef.current = currentRouteName;
        }}
      >
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name={ROUTES.AUTH} component={AuthScreen} />
          <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
          <Stack.Screen name={ROUTES.SIGN_UP} component={RegisterScreen} />
          <Stack.Screen name={ROUTES.RESET_PASSWORD} component={ResetPasswordScreen} />
          <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabNavigator} />
          <Stack.Screen name={ROUTES.DEBUG_COURT} component={DebugCourtClick} />
          <Stack.Screen name="SentryTest" component={SentryTestScreen} />
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
          <Stack.Screen name={ROUTES.PLAYER_PROFILE} component={PlayerProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <ForceUpdateModal visible={isForceUpdateRequired} storeUrl={storeUrl} />
      <ChangelogModal
        visible={!!changelog}
        title={changelog?.title ?? null}
        items={changelog?.items ?? []}
        onClose={dismissChangelog}
      />
    </>
  );
}

/**
 * Root App component
 * Sets up providers (SafeArea, Auth) and renders the navigation
 * Also tracks app lifecycle (foreground, background, inactive)
 */
function App() {
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <ThemeProvider>
            <AuthProvider>
              <PostHogProvider
                apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? ""}
                options={{
                  host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
                  enableSessionReplay: false,
                  disabled: !process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
                }}
                autocapture={{ captureTouches: false, captureScreens: false }}
              >
                <ClubProvider>
                  <AdProvider>
                    <Navigation />
                  </AdProvider>
                </ClubProvider>
              </PostHogProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap App with Sentry for error tracking
export default Sentry.wrap(App);
