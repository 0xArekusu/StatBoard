/**
 * Subscription Models
 *
 * Defines subscription tiers, user modes, and their associated limits.
 * Controls access to features like match storage, team management, and cloud sync.
 */

/**
 * Available subscription tiers
 */
export type SubscriptionTier = "free" | "basic" | "premium" | "ultimate";

/**
 * User mode determining storage limits and feature access
 */
export enum UserMode {
  NOT_CONNECTED = "not_connected", // Not logged in (trial mode)
  FREEMIUM = "free", // Logged in without subscription
  BASIC = "basic", // Basic subscription
  PREMIUM = "premium", // Premium subscription
  ULTIMATE = "ultimate", // Ultimate subscription
}

/**
 * Limits associated with a subscription tier
 */
export interface SubscriptionLimits {
  maxTeams: number; // Maximum number of teams user can manage
  maxLocalMatches: number; // Maximum number of matches stored locally
  canSyncToServer: boolean; // Whether user can sync matches to cloud
}

/**
 * Subscription limits for each tier
 * Free: Limited to 3 matches, no cloud sync, no team management
 * Basic: Unlimited local matches, cloud sync enabled, 1 team
 * Premium: All basic features + 3 teams
 * Ultimate: All premium features + 9 teams
 */
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> =
  {
    free: {
      maxTeams: 0,
      maxLocalMatches: 3, // 3 matches max in freemium
      canSyncToServer: false, // No sync in freemium
    },
    basic: {
      maxTeams: 1,
      maxLocalMatches: Infinity, // Unlimited with subscription
      canSyncToServer: true, // Sync enabled (no time limit)
    },
    premium: {
      maxTeams: 3,
      maxLocalMatches: Infinity,
      canSyncToServer: true,
    },
    ultimate: {
      maxTeams: 9,
      maxLocalMatches: Infinity,
      canSyncToServer: true,
    },
  };

/**
 * Limits for non-authenticated users (trial mode)
 * Same restrictions as free tier
 */
export const NOT_CONNECTED_LIMITS: SubscriptionLimits = {
  maxTeams: 0,
  maxLocalMatches: 3, // 3 matches max in trial mode
  canSyncToServer: false,
};

/**
 * Display labels for subscription tiers
 */
export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  basic: "Basic",
  premium: "Premium",
  ultimate: "Ultimate",
};

/**
 * Display labels for user modes
 */
export const USER_MODE_LABELS: Record<UserMode, string> = {
  [UserMode.NOT_CONNECTED]: "Non connecté",
  [UserMode.FREEMIUM]: "Free",
  [UserMode.BASIC]: "Basic",
  [UserMode.PREMIUM]: "Premium",
  [UserMode.ULTIMATE]: "Ultimate",
};

/**
 * Subscription model combining tier and limits
 */
export interface Subscription {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
}
