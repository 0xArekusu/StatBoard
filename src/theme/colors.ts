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
// BASKETBALL ACTION COLORS
// ===========================

/**
 * Action colors for basketball game events
 * Used for markers, buttons, filters, and visualizations
 *
 * Organized by action type with base colors and specifications
 */
export const ACTION_COLORS = {
  shot: {
    base: "#FF6B35",      // Orange - Basketball orange
    made: "#4CAF50",      // Green - Successful shot
    missed: "#F44336",    // Red - Missed shot
    points: {
      one: "#9C27B0",     // Purple - 1 point
      two: "#2196F3",     // Blue - 2 points
      three: "#FF9800",   // Orange - 3 points
    },
  },
  rebound: {
    base: "#4A90E2",      // Blue
    offensive: "#2E7D32", // Dark green - Offensive rebound
    defensive: "#1976D2", // Blue - Defensive rebound
  },
  foul: {
    base: "#FFD700",      // Gold/Yellow
    personal: "#FFD700",  // Gold/Yellow - Personal foul
    technical: "#FF1744", // Pink/Red - Technical foul
    penality: "#FF6F00",  // Dark orange - Unsportsmanlike foul
    disqualification: "#000000", // Black - Disqualifying foul
  },
  assist: "#00BCD4",      // Cyan - Assist
  steal: "#F39C12",       // Yellow - Steal
  block: "#8E44AD",       // Purple - Block
  turnover: "#95A5A6",    // Gray - Turnover
} as const;

/**
 * Status and feedback colors
 * Shared across light and dark themes
 */
export const STATUS_COLORS = {
  success: "#4CAF50",   // Green
  successLight: "#16a34a", // Green for text on light background
  successBackground: "#dcfce7", // Light green background
  error: "#F44336",     // Red
  errorLight: "#dc2626", // Red for text
  errorBackground: "#fee2e2", // Light red background
  warning: "#F57C00",   // Orange
  info: "#2196F3",      // Blue
  required: "#ef4444",  // Red for required fields
} as const;

/**
 * UI element colors (stars, badges, highlights)
 * Shared across light and dark themes
 */
export const UI_COLORS = {
  star: "#eab308",                    // Yellow for star/favorite
  starBackground: "rgba(234, 179, 8, 0.2)",  // Yellow transparent background
  starForeground: "#eab308",          // Yellow for star icon (same as star)
} as const;

/**
 * Sport-specific colors
 */
export const SPORT_COLORS = {
  basketball: {
    orange: ACTION_COLORS.shot.base,  // "#FF6B35" - Basketball orange
    court: "#1a472a",   // Court green
  },
} as const;

/**
 * Shooting bar colors for statistics visualization
 * Used in player stat cards to show shooting percentages
 */
export const SHOOTING_BAR_COLORS = {
  threePoint: "#6366f1",  // Indigo - 3 point shots
  twoPoint: "#3b82f6",    // Blue - 2 point shots
  freeThrow: "#06b6d4",   // Cyan - Free throws
} as const;

/**
 * Team colors for charts and visualizations
 * Used consistently across match summary, details, and statistics
 */
export const TEAM_CHART_COLORS = {
  teamA: ACTION_COLORS.shot.base,  // "#FF6B35" - Orange - Team A
  teamB: "#004E89",  // Dark Blue - Team B
} as const;

/**
 * Colors for different subscription tiers
 */
export const SUBSCRIPTION_COLORS = {
  free: "#FFD700",      // Gold
  premium: "#9C27B0",   // Purple
  club: "#9C27B0",      // Purple (same as premium for now)
} as const;

/**
 * Preset colors for club primary/secondary colors
 */
export const CLUB_PRESET_COLORS = [
  "#000000", // Black
  "#FFFFFF", // White
  "#FF0000", // Red
  "#0000FF", // Blue
  "#00FF00", // Green
  "#FFA500", // Orange
  "#800080", // Purple
] as const;

/**
 * Default club colors when creating a new club
 */
export const DEFAULT_CLUB_COLORS = {
  primary: "#FF0000",   // Red
  secondary: "#0000FF", // Blue
} as const;

/**
 * Preset colors for court customization (rainbow spectrum)
 * Typed as const tuple for LinearGradient compatibility
 */
export const COURT_PRESET_COLORS = [
  "#FF0000", // Red
  "#FFFF00", // Yellow
  "#00FF00", // Green
  "#00FFFF", // Cyan
  "#0000FF", // Blue
  "#FF00FF", // Magenta
  "#FF0000", // Red (completing the circle)
] as const;

/**
 * Default court colors when creating a new club
 */
export const DEFAULT_COURT_COLORS = {
  background: "#1a472a", // Dark green (basketball court)
  line: "#FFFFFF",       // White lines
} as const;

// ===========================
// TYPES
// ===========================

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors[ColorScheme];
