import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import { SLATE_COLORS } from '../src/theme/clubDefaults';

export default function ClubScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? SLATE_COLORS[950] : SLATE_COLORS[50] }]}>
      <Text style={[styles.text, { color: isDark ? SLATE_COLORS[100] : SLATE_COLORS[900] }]}>
        Club
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
