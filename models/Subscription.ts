/**
 * Subscription Models
 *
 * Defines subscription tiers, user modes, and their associated limits.
 * Controls access to features like match storage, team management, and cloud sync.
 */

/**
 * Available subscription tiers
 */
export type SubscriptionTier = "free" | "basic" | "premium" | "ultimate" | "sponsor";

/**
 * Subscription tier constants
 */
export const SUBSCRIPTION_TIER = {
  FREE: "free" as const,
  BASIC: "basic" as const,
  PREMIUM: "premium" as const,
  ULTIMATE: "ultimate" as const,
  SPONSOR: "sponsor" as const,
} as const;

/**
 * User mode determining storage limits and feature access
 */
export enum UserMode {
  NOT_CONNECTED = "not_connected", // Not logged in (trial mode)
  FREEMIUM = "free", // Logged in without subscription
  BASIC = "basic", // Basic subscription
  PREMIUM = "premium", // Premium subscription
  ULTIMATE = "ultimate", // Ultimate subscription
  SPONSOR = "sponsor", // Sponsor tier — can configure custom court sponsors
}

/**
 * Limits associated with a subscription tier
 */
export interface SubscriptionLimits {
  maxTeams: number; // Maximum number of teams user can manage
  maxLocalMatches: number; // Maximum number of matches stored locally
  canSyncToServer: boolean; // Whether user can sync matches to cloud
  canConfigureSponsors: boolean; // Whether the club can configure custom court sponsors
  priceMonthly?: number; // Monthly price in euros (optional for backward compatibility)
  name?: string; // Display name for the tier (optional, from database)
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
    [SUBSCRIPTION_TIER.FREE]: {
      maxTeams: 0,
      maxLocalMatches: 3, // 3 matches max in freemium
      canSyncToServer: false, // No sync in freemium
      canConfigureSponsors: false,
    },
    [SUBSCRIPTION_TIER.BASIC]: {
      maxTeams: 1,
      maxLocalMatches: Infinity, // Unlimited with subscription
      canSyncToServer: true, // Sync enabled (no time limit)
      canConfigureSponsors: false,
    },
    [SUBSCRIPTION_TIER.PREMIUM]: {
      maxTeams: 3,
      maxLocalMatches: Infinity,
      canSyncToServer: true,
      canConfigureSponsors: false,
    },
    [SUBSCRIPTION_TIER.ULTIMATE]: {
      maxTeams: 9,
      maxLocalMatches: Infinity,
      canSyncToServer: true,
      canConfigureSponsors: true, // Ultimate clubs can configure their own court sponsors
    },
    [SUBSCRIPTION_TIER.SPONSOR]: {
      maxTeams: 9,
      maxLocalMatches: Infinity,
      canSyncToServer: true,
      canConfigureSponsors: true, // Legacy tier, kept for clubs still on it
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
  canConfigureSponsors: false,
};

/**
 * Display labels for subscription tiers
 */
export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  [SUBSCRIPTION_TIER.FREE]: "Free",
  [SUBSCRIPTION_TIER.BASIC]: "Basic",
  [SUBSCRIPTION_TIER.PREMIUM]: "Premium",
  [SUBSCRIPTION_TIER.ULTIMATE]: "Ultimate",
  [SUBSCRIPTION_TIER.SPONSOR]: "Sponsor",
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
  [UserMode.SPONSOR]: "Sponsor",
};

/**
 * Subscription model combining tier and limits
 */
export interface Subscription {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
}
