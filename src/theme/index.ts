/**
 * Main theme export
 * Aggregates all theme-related constants
 */

// Theme colors and UI constants
export {
  Colors,
  BRAND_COLORS,
  SLATE_COLORS,
  COMMON_COLORS,
  SHADOW_COLOR,
  OPACITY,
  LOGO_SIZE,
  PASSWORD_VALIDATION,
} from './colors';
export type { ColorScheme, ThemeColors } from './colors';

// Spacing
export { Spacing } from './spacing';
export type { SpacingKey } from './spacing';

// Typography
export { Typography } from './typography';
export type { FontSize, FontWeight } from './typography';

// Common styles
export { CommonStyles } from './commonStyles';

// Business/domain constants
export {
  CLUB_PRESET_COLORS,
  DEFAULT_CLUB_COLORS,
  COURT_PRESET_COLORS,
  DEFAULT_COURT_COLORS,
  STATUS_COLORS,
  UI_COLORS,
  SPORT_COLORS,
  SUBSCRIPTION_COLORS,
  TEAM_CHART_COLORS,
} from './clubDefaults';
