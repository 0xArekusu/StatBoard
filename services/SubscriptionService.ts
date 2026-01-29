import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriptionTier, SubscriptionLimits } from "../models/Subscription";
import { SUBSCRIPTION_LIMITS } from "../models/Subscription";

export class SubscriptionService {
  private limitsCache: Map<SubscriptionTier, SubscriptionLimits> = new Map();
  private lastFetchTime: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private supabase: SupabaseClient) {}

  /**
   * Get subscription limits for a given tier from database
   * Falls back to hardcoded limits if database is unavailable
   */
  async getLimitsForTier(tier: SubscriptionTier): Promise<SubscriptionLimits> {
    // Check if we have a fresh cache
    const now = Date.now();
    if (this.limitsCache.has(tier) && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.limitsCache.get(tier)!;
    }

    try {
      // Fetch from database
      const { data, error } = await this.supabase
        .from("subscription_plans")
        .select("name, max_teams, max_local_matches, can_sync_to_server, price_monthly")
        .eq("tier", tier)
        .single();

      if (error) throw error;

      if (data) {
        const limits: SubscriptionLimits = {
          maxTeams: data.max_teams,
          maxLocalMatches: data.max_local_matches,
          canSyncToServer: data.can_sync_to_server,
          priceMonthly: data.price_monthly,
          name: data.name,
        };

        // Update cache
        this.limitsCache.set(tier, limits);
        this.lastFetchTime = now;

        return limits;
      }
    } catch (error) {
      console.warn(`Failed to fetch limits for tier ${tier} from database, using fallback:`, error);
    }

    // Fallback to hardcoded limits
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
      const limits = await this.getLimitsForTier(tier);

      // Count current approved teams (excluding deleted)
      const { count, error: countError } = await this.supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "approved")
        .eq("is_deleted", false);

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
      const limits = await this.getLimitsForTier(tier);

      const { count } = await this.supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "approved")
        .eq("is_deleted", false);

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

  /**
   * Get all available subscription plans from database
   * Returns all tiers with their limits and pricing
   */
  async getAllPlans(): Promise<Array<{
    tier: SubscriptionTier;
    limits: SubscriptionLimits;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from("subscription_plans")
        .select("tier, name, max_teams, max_local_matches, can_sync_to_server, price_monthly")
        .order("price_monthly", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Fallback to hardcoded limits if database is empty
        console.warn("No plans found in database, using fallback");
        return Object.entries(SUBSCRIPTION_LIMITS).map(([tier, limits]) => ({
          tier: tier as SubscriptionTier,
          limits,
        }));
      }

      // Map database results to our format
      const plans = data.map((plan) => ({
        tier: plan.tier as SubscriptionTier,
        limits: {
          maxTeams: plan.max_teams,
          maxLocalMatches: plan.max_local_matches,
          canSyncToServer: plan.can_sync_to_server,
          priceMonthly: plan.price_monthly,
          name: plan.name,
        },
      }));

      // Update cache for all tiers
      const now = Date.now();
      plans.forEach(({ tier, limits }) => {
        this.limitsCache.set(tier, limits);
      });
      this.lastFetchTime = now;

      return plans;
    } catch (error) {
      console.error("Error fetching all plans:", error);
      // Return fallback plans
      return Object.entries(SUBSCRIPTION_LIMITS).map(([tier, limits]) => ({
        tier: tier as SubscriptionTier,
        limits,
      }));
    }
  }
}
