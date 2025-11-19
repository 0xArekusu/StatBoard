/**
 * Spacing constants for consistent layout
 * Based on 4px grid system
 */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

export type SpacingKey = keyof typeof Spacing;
