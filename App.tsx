import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainMenuScreen from "./screens/MainMenuScreen";
import BoardScreen from "./screens/BoardScreen";
import MatchDetailsScreen from "./screens/MatchDetailsScreen";
import MatchSummaryScreen from "./screens/MatchSummaryScreen";
import SplashScreen from "./screens/SplashScreen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simuler un temps de chargement
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="DebugCourtClick"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="MainMenu" component={MainMenuScreen} />
            <Stack.Screen name="Board" component={BoardScreen} />
            <Stack.Screen name="MatchSummary" component={MatchSummaryScreen} />
            <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
            {/* <Stack.Screen name="DebugCourtClick" component={DebugCourtClick} /> */}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
