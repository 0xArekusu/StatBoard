import React from 'react';
import { Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from '../src/theme/clubDefaults';

import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ClubScreen from '../screens/ClubScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const isGuest = !user;

  const handleClubTabPress = (e: any) => {
    if (isGuest) {
      e.preventDefault();
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour accéder à la section Club. Voulez-vous vous connecter maintenant ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => {
            // Navigate to Auth screen
            // This will be handled by the navigation prop
          }},
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
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Club"
        component={ClubScreen}
        options={{
          tabBarLabel: 'Club',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: handleClubTabPress,
        }}
      />
    </Tab.Navigator>
  );
}
