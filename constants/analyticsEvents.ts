/**
 * PostHog analytics event names
 * Centralized constants to avoid typos and keep event names consistent across the app
 */
export const ANALYTICS_EVENTS = {
  // Auth
  ACCOUNT_CREATED: "account_created",
  ACCOUNT_CREATION_FAILED: "account_creation_failed",
  ACCOUNT_CONFIRMED: "account_confirmed",
  ACCOUNT_CONFIRMATION_FAILED: "account_confirmation_failed",
  USER_LOGGED_IN: "user_logged_in",
  LOGIN_FAILED: "login_failed",
  USER_LOGGED_OUT: "user_logged_out",
  ACCOUNT_DELETED: "account_deleted",
  ACCOUNT_DELETION_BLOCKED: "account_deletion_blocked",
  GUEST_MODE_STARTED: "guest_mode_started",

  // Dashboard
  PROFILE_MENU_OPENED: "profile_menu_opened",
  THEME_TOGGLED: "theme_toggled",
  TEAM_CHANGED: "team_changed",

  // Club
  CLUB_LOADED: "club_loaded",
  CLUB_CREATED: "club_created",
  CLUB_JOINED: "club_joined",
  CLUB_UPDATED: "club_updated",
  TEAM_STATUS_UPDATED: "team_status_updated",
  TEAM_LIMIT_REACHED: "team_limit_reached",
  SUBSCRIPTION_UPGRADED: "subscription_upgraded",

  // Team
  TEAM_CREATED: "team_created",
  TEAM_UPDATED: "team_updated",
  TEAM_PLAYER_ADDED: "team_player_added",
  TEAM_PLAYER_REMOVED: "team_player_removed",
  TEAM_PLAYER_EDITED: "team_player_edited",

  // Match creation
  MATCH_SETUP_STARTED: "match_setup_started",
  REINFORCEMENT_ADDED: "reinforcement_added",
  OPPONENT_TEMPLATE_SAVED: "opponent_template_saved",
  MATCH_LIMIT_REACHED: "match_limit_reached",

  // Live match (lifecycle only — no in-match stat/action detail, too noisy)
  MATCH_STARTED: "match_started",
  MATCH_ABANDONED: "match_abandoned",
  MATCH_DELETED: "match_deleted",
  MATCH_ENDED: "match_ended",
  MATCH_SYNC_SUCCEEDED: "match_sync_succeeded",
  MATCH_SYNC_FAILED: "match_sync_failed",
  MATCH_TUTORIAL_COMPLETED: "match_tutorial_completed",
  MATCH_TUTORIAL_SKIPPED: "match_tutorial_skipped",

  // Stats
  STATS_PERIOD_CHANGED: "stats_period_changed",
  STATS_CATEGORY_CHANGED: "stats_category_changed",
  PLAYER_STATS_OPENED: "player_stats_opened",
  PDF_EXPORTED: "pdf_exported",

  // App-level
  FORCE_UPDATE_SHOWN: "force_update_shown",
  FORCE_UPDATE_CLICKED: "force_update_clicked",
  FORCE_UPDATE_ABANDONED: "force_update_abandoned",
  CHANGELOG_SHOWN: "changelog_shown",
  CHANGELOG_DISMISSED: "changelog_dismissed",
  // DEBUG TEMPORAIRE — à retirer après diagnostic du changelog
  UPDATE_CHECK_DEBUG: "update_check_debug",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Values for the `method` property on login/login_failed events */
export const ANALYTICS_LOGIN_METHOD = {
  PASSWORD: "password",
  PASSWORD_AFTER_TERMS: "password_after_terms",
  GOOGLE: "google",
  APPLE: "apple",
} as const;

/** Values for the `trigger` property on match_started */
export const ANALYTICS_MATCH_START_TRIGGER = {
  TIMER: "timer",
  FIRST_ACTION: "first_action",
} as const;

/** Values for the `type` property on pdf_exported */
export const ANALYTICS_PDF_EXPORT_TYPE = {
  MATCH: "match",
  PLAYER_SEASON: "player_season",
  PLAYER_MATCH: "player_match",
} as const;

/** Values for the `source` property on club_loaded */
export const ANALYTICS_CLUB_LOAD_SOURCE = {
  RESTORED: "restored",
  FIRST_SELECTED: "first_selected",
} as const;

/** Values for the `reason` property on match_abandoned */
export const ANALYTICS_MATCH_ABANDON_REASON = {
  MANUAL: "manual",
  NEW_MATCH: "new_match",
} as const;
