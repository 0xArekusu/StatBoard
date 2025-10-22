import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainMenuScreen from "./screens/MainMenuScreen";
import BoardScreen from "./screens/BoardScreen";
import MatchDetailsScreen from "./screens/MatchDetailsScreen";
import MatchSummaryScreen from "./screens/MatchSummaryScreen";
import MatchHistoryScreen from "./screens/MatchHistoryScreen";
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import ClubFormScreen from "./screens/ClubFormScreen";
import JoinClubScreen from "./screens/JoinClubScreen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ROUTES } from "./constants/routes";

const Stack = createNativeStackNavigator();

function Navigation() {
  const { loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simuler un temps de chargement
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

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
        <Stack.Screen name={ROUTES.MAIN_MENU} component={MainMenuScreen} />
        <Stack.Screen name={ROUTES.BOARD} component={BoardScreen} />
        <Stack.Screen name={ROUTES.MATCH_HISTORY} component={MatchHistoryScreen} />
        <Stack.Screen name={ROUTES.MATCH_SUMMARY} component={MatchSummaryScreen} />
        <Stack.Screen name={ROUTES.MATCH_DETAILS} component={MatchDetailsScreen} />
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
        <Stack.Screen name={ROUTES.SIGN_UP} component={SignUpScreen} />
        <Stack.Screen name={ROUTES.CLUB_FORM} component={ClubFormScreen} />
        <Stack.Screen name={ROUTES.JOIN_CLUB} component={JoinClubScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
