/**
 * useResponsive
 *
 * Reactive hook that provides orientation-aware sizing helpers.
 * Automatically re-renders when the device rotates or window resizes.
 *
 * Scale modes:
 *  - "compact"  → landscape OR small screen (height < 700)
 *  - "normal"   → portrait on a regular phone
 *
 * Usage:
 *   const { isCompact, isPortrait, sp, font } = useResponsive();
 *   <Text style={{ fontSize: font.lg, marginBottom: sp.md }}>…</Text>
 */

import { useWindowDimensions } from "react-native";
import { Spacing, Typography } from "../theme";
import { BREAKPOINTS } from "../../constants/breakpoints";

export type SizeScale = "compact" | "normal";

export interface ResponsiveValues {
  /** True when device is in portrait orientation */
  isPortrait: boolean;
  /** True when layout should be compact (landscape OR small screen) */
  isCompact: boolean;
  /** Current size scale */
  scale: SizeScale;
  /** Spacing values adapted to current scale */
  sp: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  /** Font sizes adapted to current scale */
  font: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  /** Raw window dimensions */
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const isCompact = !isPortrait || height < BREAKPOINTS.smallPortraitMaxHeight;
  const scale: SizeScale = isCompact ? "compact" : "normal";

  const sp = isCompact
    ? {
        xs: Spacing.xs,   // 4
        sm: Spacing.xs,   // 4  (was 8)
        md: Spacing.sm,   // 8  (was 16)
        lg: Spacing.md,   // 16 (was 24)
        xl: Spacing.lg,   // 24 (was 32)
        xxl: Spacing.xl,  // 32 (was 40)
      }
    : {
        xs: Spacing.xs,   // 4
        sm: Spacing.sm,   // 8
        md: Spacing.md,   // 16
        lg: Spacing.lg,   // 24
        xl: Spacing.xl,   // 32
        xxl: Spacing.xxl, // 40
      };

  const font = isCompact
    ? {
        xs: Typography.fontSize.xs,   // 10
        sm: Typography.fontSize.xs,   // 10 (was 12)
        md: Typography.fontSize.sm,   // 12 (was 14)
        lg: Typography.fontSize.md,   // 14 (was 16)
        xl: Typography.fontSize.lg,   // 16 (was 18)
        xxl: Typography.fontSize.xl,  // 18 (was 24)
        xxxl: Typography.fontSize.xxl, // 24 (was 36)
      }
    : {
        xs: Typography.fontSize.xs,   // 10
        sm: Typography.fontSize.sm,   // 12
        md: Typography.fontSize.md,   // 14
        lg: Typography.fontSize.lg,   // 16
        xl: Typography.fontSize.xl,   // 18
        xxl: Typography.fontSize.xxl, // 24
        xxxl: Typography.fontSize.xxxl, // 36
      };

  return { isPortrait, isCompact, scale, sp, font, width, height };
}
