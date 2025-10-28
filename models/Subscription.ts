export type SubscriptionTier = "free" | "basic" | "premium" | "ultimate";

/**
 * Mode utilisateur pour déterminer les limites de stockage
 */
export enum UserMode {
  NOT_CONNECTED = "not_connected", // Non connecté (mode essai)
  FREEMIUM = "free",              // Connecté sans abonnement
  BASIC = "basic",                // Abonnement basic
  PREMIUM = "premium",            // Abonnement premium
  ULTIMATE = "ultimate"           // Abonnement ultimate
}

export interface SubscriptionLimits {
  maxTeams: number;
  maxLocalMatches: number;        // Nombre max de matchs stockés en local
  canSyncToServer: boolean;       // Peut synchroniser vers le serveur
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxTeams: 0,
    maxLocalMatches: 3,           // 3 matchs max en freemium
    canSyncToServer: false,       // Pas de sync en freemium
  },
  basic: {
    maxTeams: 1,
    maxLocalMatches: Infinity,    // Illimité avec abonnement
    canSyncToServer: true,        // Sync activé (sans limite de temps)
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
 * Limites pour utilisateur non connecté (mode essai)
 */
export const NOT_CONNECTED_LIMITS: SubscriptionLimits = {
  maxTeams: 0,
  maxLocalMatches: 3,             // 3 matchs max en mode essai
  canSyncToServer: false,
};

/**
 * Labels pour les tiers d'abonnement
 */
export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Gratuit",
  basic: "Basic",
  premium: "Premium",
  ultimate: "Ultimate",
};

/**
 * Labels pour les modes utilisateur
 */
export const USER_MODE_LABELS: Record<UserMode, string> = {
  [UserMode.NOT_CONNECTED]: "Non connecté",
  [UserMode.FREEMIUM]: "Gratuit",
  [UserMode.BASIC]: "Basic",
  [UserMode.PREMIUM]: "Premium",
  [UserMode.ULTIMATE]: "Ultimate",
};

export interface Subscription {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
}
