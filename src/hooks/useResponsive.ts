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
  /** True when landscape on a phone-sized screen (vs tablet landscape) */
  isMobileLandscape: boolean;
  /** True when portrait on a phone-sized screen (vs tablet portrait) */
  isMobilePortrait: boolean;
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
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  /** UI element sizes adapted to current scale */
  sizes: {
    avatarXs: number;
    avatarSm: number;
    avatarMd: number;
    avatarLg: number;
    logoSm: number;
    logoMd: number;
    iconSm: number;
    iconMd: number;
    colorSwatch: number;
    colorSwatchRectW: number;
    colorSwatchRectH: number;
  };
  /** Raw window dimensions */
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const shortSide = Math.min(width, height);
  const isMobile = shortSide < BREAKPOINTS.phoneMaxWidth;
  const isCompact =
    isMobile || !isPortrait || height < BREAKPOINTS.smallPortraitMaxHeight;
  const isMobileLandscape = !isPortrait && width < BREAKPOINTS.mobileLandscapeMaxWidth;
  const isMobilePortrait = isPortrait && width < BREAKPOINTS.phoneMaxWidth;
  const scale: SizeScale = isCompact ? "compact" : "normal";

  const sp = isCompact
    ? {
        xs: Spacing.xs, // 4
        sm: Spacing.xs, // 4  (was 8)
        md: Spacing.sm, // 8  (was 16)
        lg: Spacing.md, // 16 (was 24)
        xl: Spacing.lg, // 24 (was 32)
        xxl: Spacing.xl, // 32 (was 40)
      }
    : {
        xs: Spacing.xs, // 4
        sm: Spacing.sm, // 8
        md: Spacing.md, // 16
        lg: Spacing.lg, // 24
        xl: Spacing.xl, // 32
        xxl: Spacing.xxl, // 40
      };

  const font = isCompact
    ? {
        xxs: 8,
        xs: Typography.fontSize.xs, // 10
        sm: Typography.fontSize.xs, // 10 (was 12)
        md: Typography.fontSize.sm, // 12 (was 14)
        lg: Typography.fontSize.md, // 14 (was 16)
        xl: Typography.fontSize.lg, // 16 (was 18)
        xxl: Typography.fontSize.xl, // 18 (was 24)
        xxxl: Typography.fontSize.xxl, // 24 (was 36)
      }
    : {
        xxs: Typography.fontSize.xs, // 10
        xs: Typography.fontSize.xs, // 10
        sm: Typography.fontSize.sm, // 12
        md: Typography.fontSize.md, // 14
        lg: Typography.fontSize.lg, // 16
        xl: Typography.fontSize.xl, // 18
        xxl: Typography.fontSize.xxl, // 24
        xxxl: Typography.fontSize.xxxl, // 36
      };

  const sizes = isCompact
    ? {
        avatarXs: 24,
        avatarSm: 38,
        avatarMd: 56,
        avatarLg: 72,
        logoSm: 60,
        logoMd: 90,
        iconSm: 16,
        iconMd: 20,
        colorSwatch: 36, // bouton rond couleur (normal: 50)
        colorSwatchRectW: 48, // bouton rect parquet largeur (normal: 64)
        colorSwatchRectH: 30, // bouton rect parquet hauteur (normal: 40)
      }
    : {
        avatarXs: 32,
        avatarSm: 45,
        avatarMd: 72,
        avatarLg: 96,
        logoSm: 90,
        logoMd: 150,
        iconSm: 20,
        iconMd: 24,
        colorSwatch: 50,
        colorSwatchRectW: 64,
        colorSwatchRectH: 40,
      };

  return { isPortrait, isCompact, isMobileLandscape, isMobilePortrait, scale, sp, font, sizes, width, height };
}
