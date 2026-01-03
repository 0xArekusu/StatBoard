/**
 * Basketball Court Constants
 *
 * Standard SVG dimensions for basketball court visualization.
 * These dimensions are used across the app for consistent court rendering
 * and coordinate transformations.
 */

/**
 * Court SVG dimensions in portrait orientation
 * Portrait viewBox: 0 0 615.75 1146.75 (narrow and tall)
 */
export const COURT_SVG_WIDTH_PORTRAIT = 615.75;
export const COURT_SVG_HEIGHT_PORTRAIT = 1146.75;

/**
 * Court SVG dimensions in landscape orientation
 * Landscape viewBox: 0 0 1146.75 615.75 (wide and short)
 */
export const COURT_SVG_WIDTH_LANDSCAPE = 1146.75;
export const COURT_SVG_HEIGHT_LANDSCAPE = 615.75;

/**
 * Display dimensions for court in MatchDetails (scaled down by 2 from SVG dimensions)
 * These are maximum sizes to ensure the court fits well on screen
 */
export const COURT_DISPLAY_WIDTH_PORTRAIT_MAX = 400;
export const COURT_DISPLAY_HEIGHT_PORTRAIT_MAX = 655;
export const COURT_DISPLAY_WIDTH_LANDSCAPE_MAX = 655;
export const COURT_DISPLAY_HEIGHT_LANDSCAPE_MAX = 352;
