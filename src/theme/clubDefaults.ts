/**
 * Default colors and constants for the entire application
 * These are business values used throughout the app
 */

// ===========================
// CLUB CUSTOMIZATION
// ===========================

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
];

/**
 * Default club colors when creating a new club
 */
export const DEFAULT_CLUB_COLORS = {
  primary: "#FF0000",   // Red
  secondary: "#0000FF", // Blue
};

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
};

// ===========================
// COMMON UI COLORS
// ===========================

/**
 * Common icon and UI element colors
 * Use these instead of hardcoded values
 */
export const COMMON_COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
};

/**
 * Status and feedback colors
 */
export const STATUS_COLORS = {
  success: "#4CAF50",   // Green
  error: "#F44336",     // Red
  warning: "#F57C00",   // Orange
  info: "#2196F3",      // Blue
};

/**
 * Sport-specific colors
 */
export const SPORT_COLORS = {
  basketball: {
    orange: "#FF6B35",  // Basketball orange
    court: "#1a472a",   // Court green
  },
};

/**
 * Team colors for charts and visualizations
 * Used consistently across match summary, details, and statistics
 */
export const TEAM_CHART_COLORS = {
  teamA: "#FF6B35",  // Orange - Team A
  teamB: "#004E89",  // Dark Blue - Team B
};

// ===========================
// SUBSCRIPTION TIERS
// ===========================

/**
 * Colors for different subscription tiers
 */
export const SUBSCRIPTION_COLORS = {
  free: "#FFD700",      // Gold
  premium: "#9C27B0",   // Purple
  club: "#9C27B0",      // Purple (same as premium for now)
};

// ===========================
// NOTE: ACTION COLORS are now in actionConfig.ts
// ===========================
// Use ACTION_CONFIG from '../config/actionConfig' instead
// This ensures a single source of truth for all action-related colors
