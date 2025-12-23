/**
 * Authentication Screen Constants
 *
 * Centralized constants for authentication views.
 */

// ===========================
// AUTH VIEWS
// ===========================

export const AUTH_VIEW = {
  LANDING: 'landing',
  LOGIN: 'login',
  REGISTER: 'register',
} as const;

export type AuthView = typeof AUTH_VIEW[keyof typeof AUTH_VIEW];
