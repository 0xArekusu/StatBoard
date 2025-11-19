/**
 * Color palette for light and dark themes
 * Organized by semantic meaning for easy theming
 */

export const Colors = {
  light: {
    // Primary brand color
    primary: '#FF6B35',

    // Backgrounds
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceVariant: '#F0F0F0',

    // Text colors
    text: {
      primary: '#000000',
      secondary: '#666666',
      tertiary: '#999999',
      disabled: '#CCCCCC',
    },

    // Button colors
    button: {
      primary: '#FF6B35',
      secondary: '#4CAF50',
      club: '#9C27B0',
      login: '#007AFF',
      free: '#FFD700',
    },

    // Status colors
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',

    // Court colors (basketball)
    court: {
      background: '#1a472a',
      line: '#FFFFFF',
    },

    // Borders
    border: '#E0E0E0',
    borderFocus: '#9C27B0',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Shadow (for elevation)
    shadow: '#000000',
  },

  dark: {
    // Primary brand color (slightly lighter for dark mode)
    primary: '#FF8C42',

    // Backgrounds
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',

    // Text colors
    text: {
      primary: '#FFFFFF',
      secondary: '#AAAAAA',
      tertiary: '#777777',
      disabled: '#555555',
    },

    // Button colors (adjusted for dark mode)
    button: {
      primary: '#FF8C42',
      secondary: '#66BB6A',
      club: '#BA68C8',
      login: '#3A9BFF',
      free: '#FFE55C',
    },

    // Status colors (adjusted for dark mode)
    success: '#66BB6A',
    warning: '#FFD54F',
    error: '#EF5350',
    info: '#42A5F5',

    // Court colors (basketball)
    court: {
      background: '#0d2e1a',
      line: '#FFFFFF',
    },

    // Borders
    border: '#333333',
    borderFocus: '#BA68C8',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Shadow (for elevation)
    shadow: '#000000',
  },
};

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.light;
