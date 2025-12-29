/**
 * Color palette for light and dark themes
 * Organized by semantic meaning for easy theming
 * Uses SLATE colors for UI elements and BRAND colors for primary actions
 */

// ===========================
// BASE COLOR PALETTES
// ===========================

/**
 * Brand colors (Orange palette)
 * Used for primary actions, branding, and emphasis
 */
export const BRAND_COLORS = {
  50: "#fff7ed",
  100: "#ffedd5",
  200: "#fed7aa",
  300: "#fdba74",
  400: "#fb923c",
  500: "#f97316", // Main brand color
  600: "#ea580c",
  700: "#c2410c",
  800: "#9a3412",
  900: "#7c2d12",
} as const;

/**
 * Slate colors (Gray palette)
 * Used for backgrounds, borders, text, and neutral UI elements
 */
export const SLATE_COLORS = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
} as const;

/**
 * Common utility colors
 */
export const COMMON_COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

// ===========================
// THEME COLORS
// ===========================

export const Colors = {
  light: {
    // Primary brand color
    primary: BRAND_COLORS[500],
    onPrimary: COMMON_COLORS.white, // Text/icon color on primary background
    onSecondary: COMMON_COLORS.black, 

    // Backgrounds
    background: COMMON_COLORS.white,
    surface: SLATE_COLORS[50],
    surfaceVariant: SLATE_COLORS[100],

    // Text colors
    text: {
      primary: SLATE_COLORS[900],
      secondary: SLATE_COLORS[500],
      tertiary: SLATE_COLORS[400],
      disabled: SLATE_COLORS[400],
    },

    // Input colors
    input: {
      background: COMMON_COLORS.white,
      border: SLATE_COLORS[200],
    },

    // Button colors
    button: {
      primary: BRAND_COLORS[500],
      secondary: SLATE_COLORS[800],
      club: "#9C27B0",
      brandAlpha: `${BRAND_COLORS[500]}10`, // 10% opacity for light backgrounds
      brandAlphaBorder: `${BRAND_COLORS[500]}30`, // 30% opacity for borders
      quickScoreBackground: SLATE_COLORS[100],
      playPaused: SLATE_COLORS[200],
    },

    // Status colors
    success: "#4CAF50",
    warning: "#F57C00",
    error: "#F44336",
    required: "#ef4444",
    info: "#2196F3",

    // Court colors (basketball)
    court: {
      background: "#1a472a",
      line: COMMON_COLORS.white,
    },

    // Borders
    border: SLATE_COLORS[200],
    borderFocus: BRAND_COLORS[500],

    // Overlays
    overlay: `rgba(0, 0, 0, 0.5)`,

    // Shadow (for elevation)
    shadow: COMMON_COLORS.black,

    transparent: COMMON_COLORS.transparent,

  },

  dark: {
    // Primary brand color
    primary: BRAND_COLORS[500],
    onPrimary: COMMON_COLORS.white, // Text/icon color on primary background
    onSecondary: COMMON_COLORS.black, 

    // Backgrounds
    background: SLATE_COLORS[950],
    surface: SLATE_COLORS[900],
    surfaceVariant: SLATE_COLORS[800],

    // Text colors
    text: {
      primary: COMMON_COLORS.white,
      secondary: SLATE_COLORS[400],
      tertiary: SLATE_COLORS[500],
      disabled: SLATE_COLORS[600],
    },

    // Input colors
    input: {
      background: SLATE_COLORS[900],
      border: SLATE_COLORS[800],
    },

    // Button colors
    button: {
      primary: BRAND_COLORS[500],
      secondary: SLATE_COLORS[700],
      club: "#BA68C8",
      brandAlpha: `${BRAND_COLORS[500]}20`, // 20% opacity for dark backgrounds
      brandAlphaBorder: `${BRAND_COLORS[500]}30`, // 30% opacity for borders
      quickScoreBackground: SLATE_COLORS[800],
      playPaused: SLATE_COLORS[800],
    },

    // Status colors
    success: "#66BB6A",
    warning: "#FFD54F",
    error: "#EF5350",
    required: "#ef4444",
    info: "#42A5F5",

    // Court colors (basketball)
    court: {
      background: "#0d2e1a",
      line: COMMON_COLORS.white,
    },

    // Borders
    border: SLATE_COLORS[800],
    borderFocus: BRAND_COLORS[500],

    // Overlays
    overlay: `rgba(0, 0, 0, 0.7)`,

    // Shadow (for elevation)
    shadow: COMMON_COLORS.black,

    transparent: COMMON_COLORS.transparent,
  },
} as const;

// ===========================
// UI CONSTANTS
// ===========================

/**
 * Shadow color used throughout the app
 */
export const SHADOW_COLOR = COMMON_COLORS.black;

/**
 * Opacity constants for UI interactions and overlays
 */
export const OPACITY = {
  gradient: {
    low: "66", // 40% opacity - for gradient overlays
    medium: "CC", // 80% opacity - for backgrounds and overlays
    full: "", // 100% opacity
  },
  interaction: {
    low: 0.7, // Light touch feedback
    high: 0.8, // Standard touch feedback
  },
  disabled: 0.6, // Disabled state
} as const;

/**
 * Logo dimensions for different contexts
 */
export const LOGO_SIZE = {
  auth: {
    width: 240,
  },
} as const;

/**
 * Password validation constants
 */
export const PASSWORD_VALIDATION = {
  minLength: 6,
} as const;

// ===========================
// TYPES
// ===========================

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.light;
