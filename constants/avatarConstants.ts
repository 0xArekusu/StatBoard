/**
 * Look of the avatar drawn when a player has no photo.
 */
export const INITIALS_AVATAR = {
  /** Letters shown at most */
  maxInitials: 2,
  /** Height of the letters relative to the avatar */
  fontSizeRatio: 0.4,
  fontWeight: "500",
  /** Side of the SVG drawn for the PDF exports */
  svgSize: 128,
  /** Baseline offset centering the letters vertically, relative to their height */
  svgBaselineRatio: 0.35,
} as const;
