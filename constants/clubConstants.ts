/**
 * Club Screen Constants
 *
 * Centralized constants, types, and enums for the Club feature.
 */

// ===========================
// TAB TYPES
// ===========================

export const CLUB_TAB = {
  CREATE: "create",
  JOIN: "join",
} as const;

export type ClubTab = typeof CLUB_TAB[keyof typeof CLUB_TAB];

export const CLUB_SUB_TAB = {
  INFO: "info",
  SUBSCRIPTION: "subscription",
} as const;

export type ClubSubTab = typeof CLUB_SUB_TAB[keyof typeof CLUB_SUB_TAB];

// ===========================
// COLOR PALETTES
// ===========================

/**
 * Predefined colors for club customization
 */
export const CLUB_COLOR_PALETTE = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#84cc16", // Lime
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#1e293b", // Slate
  "#000000", // Black
  "#ffffff", // White
] as const;

/**
 * Predefined colors for basketball court background
 */
export const COURT_COLOR_PALETTE = [
  "#c2410c", // Orange brown (classic)
  "#eab308", // Yellow
  "#1e1b4b", // Indigo dark
  "#15803d", // Green
  "#334155", // Slate
  "#7f1d1d", // Red dark
  "#d4d4d4", // Light gray
  "#f59e0b", // Amber
] as const;

// ===========================
// DEFAULT VALUES
// ===========================

export const DEFAULT_CLUB_COLORS = {
  PRIMARY: "#FF0000",
  SECONDARY: "#0000FF",
  COURT_BACKGROUND: "#c2410c",
  COURT_LINES: "#ffffff",
} as const;

// ===========================
// INTERFACES
// ===========================

/**
 * Club form data structure
 */
export interface ClubFormData {
  name: string;
  acronym: string;
  code: string;
  logoUri: string | null;
  primaryColor: string;
  secondaryColor: string;
  courtColor: string;
  courtLinesColor: string;
}

/**
 * Initial empty form data
 */
export const INITIAL_CLUB_FORM_DATA: ClubFormData = {
  name: "",
  acronym: "",
  code: "",
  logoUri: null,
  primaryColor: DEFAULT_CLUB_COLORS.PRIMARY,
  secondaryColor: DEFAULT_CLUB_COLORS.SECONDARY,
  courtColor: DEFAULT_CLUB_COLORS.COURT_BACKGROUND,
  courtLinesColor: DEFAULT_CLUB_COLORS.COURT_LINES,
};

// ===========================
// VALIDATION
// ===========================

/**
 * Field validation rules
 */
export const CLUB_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 60,
  ACRONYM_MIN_LENGTH: 2,
  ACRONYM_MAX_LENGTH: 6,
  CODE_LENGTH: 6,
} as const;

/**
 * Error messages
 */
export const CLUB_ERROR_MESSAGES = {
  NAME_REQUIRED: "Le nom du club est requis",
  NAME_TOO_SHORT: `Le nom doit contenir au moins ${CLUB_VALIDATION.NAME_MIN_LENGTH} caractères`,
  ACRONYM_REQUIRED: "Le sigle est requis",
  ACRONYM_TOO_SHORT: `Le sigle doit contenir au moins ${CLUB_VALIDATION.ACRONYM_MIN_LENGTH} caractères`,
  ACRONYM_TOO_LONG: `Le sigle ne peut pas dépasser ${CLUB_VALIDATION.ACRONYM_MAX_LENGTH} caractères`,
  CODE_INVALID: `Le code doit contenir exactement ${CLUB_VALIDATION.CODE_LENGTH} caractères`,
  LOGO_UPLOAD_FAILED: "Échec du téléchargement du logo",
  CREATION_FAILED: "Échec de la création du club",
  UPDATE_FAILED: "Échec de la modification du club",
  JOIN_FAILED: "Échec de la demande de rejoindre le club",
} as const;
