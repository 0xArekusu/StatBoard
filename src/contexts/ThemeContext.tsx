/**
 * ThemeContext
 *
 * Manages app-wide theming with support for:
 * - Automatic system theme detection
 * - Manual theme override
 * - Theme persistence with AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, type ColorScheme, type ThemeColors } from '../theme';

const THEME_STORAGE_KEY = '@statboard_theme_preference';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  // Current active color scheme
  colorScheme: ColorScheme;
  // Current theme colors
  colors: ThemeColors;
  // Theme mode preference (light, dark, or system)
  themeMode: ThemeMode;
  // Function to change theme mode
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  // Boolean helpers
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  // Determine the active color scheme based on mode
  const getActiveColorScheme = (): ColorScheme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  };

  const colorScheme = getActiveColorScheme();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update when system theme changes (only if in system mode)
  useEffect(() => {
    if (themeMode === 'system') {
      // Force re-render when system theme changes
    }
  }, [systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        setThemeModeState(storedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const value: ThemeContextType = {
    colorScheme,
    colors,
    themeMode,
    setThemeMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * Must be used within ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
