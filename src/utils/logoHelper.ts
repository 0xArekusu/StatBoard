/**
 * Logo Helper
 *
 * Centralizes logo asset paths to avoid hardcoding paths throughout the app.
 */

export const COACH_ASSISTANT_LOGO = require('../../components/icons/coachassistant-logo.png');
export const COACH_ASSISTANT_LOGO_NO_BG = require('../../components/icons/coachassistant-logo-no-bg.png');
export const COACH_ASSISTANT_LOGO_MARGIN = require('../../components/icons/coachassistant-logo-margin.png');
export const COACH_ASSISTANT_LOGO_WHITE_NO_BG = require('../../components/icons/coachassistant-logo-white-no-bg.png');
export const COACH_ASSISTANT_LOGO_LINE_COLORED_BALL = require('../../components/icons/coachassistant-logo-line-colored-ball.png');
export const COACH_ASSISTANT_LOGO_LINE_COLORED_BALL_WHITE = require('../../components/icons/coachassistant-logo-line-colored-ball-white.png');

// Returns true if the given hex color is perceived as dark (luminance < 0.5).
// Useful for picking a contrasting logo or text color.
export function isColorDark(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}
