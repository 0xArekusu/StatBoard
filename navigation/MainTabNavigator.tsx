import React from "react";
import { Alert } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
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

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  const isGuest = !user;

  const handleStatsTabPress = (e: any) => {
    if (isGuest) {
      e.preventDefault();
      Alert.alert(
        t("mainTabNavigator.guestGuard.title"),
        t("mainTabNavigator.guestGuard.statsMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("mainTabNavigator.guestGuard.loginButton"),
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
        t("mainTabNavigator.guestGuard.title"),
        t("mainTabNavigator.guestGuard.clubMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("mainTabNavigator.guestGuard.loginButton"),
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
          tabBarLabel: t("mainTabNavigator.tabs.dashboard"),
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
          tabBarLabel: t("mainTabNavigator.tabs.history"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.STATS}
        component={StatsScreen}
        options={{
          tabBarLabel: t("mainTabNavigator.tabs.stats"),
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
          tabBarLabel: t("mainTabNavigator.tabs.club"),
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
    </Tab.Navigator>
  );
}
