export type SubscriptionTier = "free" | "basic" | "premium" | "ultimate";

export interface SubscriptionLimits {
  maxTeams: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxTeams: 0,
  },
  basic: {
    maxTeams: 1,
  },
  premium: {
    maxTeams: 3,
  },
  ultimate: {
    maxTeams: 9,
  },
};

export interface Subscription {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
}
