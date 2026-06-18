import React from "react";
import { Alert } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
} from "../src/theme";
import { ROUTES } from "../constants/routes";

import DashboardScreen from "../screens/DashboardScreen";
import HistoryScreen from "../screens/HistoryScreen";
import StatsScreen from "../screens/StatsScreen";
import ClubScreen from "../screens/club/ClubScreen";
import PlaybookScreen from "../screens/PlaybookScreen";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { isDark } = useTheme();
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  const isGuest = !user;

  const handleStatsTabPress = (e: any) => {
    if (isGuest) {
      e.preventDefault();
      Alert.alert(
        "Connexion requise",
        "Vous devez être connecté à une équipe pour accéder aux statistiques.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Se connecter",
            onPress: async () => {
              await signOut();
              navigation.navigate(ROUTES.AUTH as never);
            },
          },
        ]
      );
    }
  };

  const handleClubTabPress = (e: any) => {
    if (isGuest) {
      e.preventDefault();
      Alert.alert(
        "Connexion requise",
        "Vous devez être connecté pour accéder à la section Club. Voulez-vous vous connecter maintenant ?",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Se connecter",
            onPress: async () => {
              // Sign out guest session and navigate to Auth screen
              await signOut();
              navigation.navigate(ROUTES.AUTH as never);
            },
          },
        ]
      );
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? SLATE_COLORS[900] : COMMON_COLORS.white,
          borderTopColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[200],
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: BRAND_COLORS[500],
        tabBarInactiveTintColor: isDark ? SLATE_COLORS[400] : SLATE_COLORS[500],
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Tableau de bord",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: "Historique",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.STATS}
        component={StatsScreen}
        options={{
          tabBarLabel: "Stats",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-bar"
              size={size}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleStatsTabPress,
        }}
      />
      <Tab.Screen
        name="Club"
        component={ClubScreen}
        options={{
          tabBarLabel: "Club",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group-outline"
              size={size}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleClubTabPress,
        }}
      />
      <Tab.Screen
        name={ROUTES.PLAYBOOK}
        component={PlaybookScreen}
        options={{
          tabBarLabel: "Systèmes",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="strategy"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
