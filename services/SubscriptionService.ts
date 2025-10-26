import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriptionTier, SubscriptionLimits } from "../models/Subscription";
import { SUBSCRIPTION_LIMITS } from "../models/Subscription";

export class SubscriptionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get subscription limits for a given tier
   */
  getLimitsForTier(tier: SubscriptionTier): SubscriptionLimits {
    return SUBSCRIPTION_LIMITS[tier];
  }

  /**
   * Check if a club can create more teams
   */
  async canCreateTeam(clubId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
    tier: SubscriptionTier;
    error?: string;
  }> {
    try {
      // Get club subscription tier
      const { data: club, error: clubError } = await this.supabase
        .from("clubs")
        .select("subscription_tier")
        .eq("id", clubId)
        .single();

      if (clubError || !club) {
        return {
          allowed: false,
          currentCount: 0,
          maxAllowed: 0,
          tier: "free",
          error: "Club introuvable",
        };
      }

      const tier = club.subscription_tier as SubscriptionTier;
      const limits = this.getLimitsForTier(tier);

      // Count current approved teams
      const { count, error: countError } = await this.supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "approved");

      if (countError) {
        return {
          allowed: false,
          currentCount: 0,
          maxAllowed: limits.maxTeams,
          tier,
          error: "Erreur lors du comptage des équipes",
        };
      }

      const currentCount = count || 0;
      const allowed = currentCount < limits.maxTeams;

      return {
        allowed,
        currentCount,
        maxAllowed: limits.maxTeams,
        tier,
        error: allowed
          ? undefined
          : `Limite atteinte pour l'abonnement ${tier}. Passez à un abonnement supérieur pour créer plus d'équipes.`,
      };
    } catch (error) {
      console.error("Error checking team creation limit:", error);
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        tier: "free",
        error: "Erreur lors de la vérification des limites",
      };
    }
  }

  /**
   * Get subscription info for a club
   */
  async getClubSubscriptionInfo(clubId: string): Promise<{
    tier: SubscriptionTier;
    limits: SubscriptionLimits;
    currentTeamCount: number;
  } | null> {
    try {
      const { data: club, error: clubError } = await this.supabase
        .from("clubs")
        .select("subscription_tier")
        .eq("id", clubId)
        .single();

      if (clubError || !club) {
        return null;
      }

      const tier = club.subscription_tier as SubscriptionTier;
      const limits = this.getLimitsForTier(tier);

      const { count } = await this.supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "approved");

      return {
        tier,
        limits,
        currentTeamCount: count || 0,
      };
    } catch (error) {
      console.error("Error getting subscription info:", error);
      return null;
    }
  }
}
