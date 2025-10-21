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
import CreateClubScreen from "./screens/CreateClubScreen";
import JoinClubScreen from "./screens/JoinClubScreen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";

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
        initialRouteName="MainMenu"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="Board" component={BoardScreen} />
        <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
        <Stack.Screen name="MatchSummary" component={MatchSummaryScreen} />
        <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="CreateClub" component={CreateClubScreen} />
        <Stack.Screen name="JoinClub" component={JoinClubScreen} />
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
