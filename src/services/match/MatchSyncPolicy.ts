/**
 * MatchSyncPolicy
 *
 * Service to manage match synchronization rules based on user subscription tier.
 * Determines what actions users can perform (create, sync) based on their subscription level.
 * Enforces storage limits for local and cloud match storage.
 */

import { SubscriptionTier, SUBSCRIPTION_LIMITS, NOT_CONNECTED_LIMITS, SubscriptionLimits } from "../../../models/Subscription";
import { Match } from "../../models/types";

export class MatchSyncPolicy {
  /**
   * Get subscription limits based on connection status and tier
   * @param isConnected Whether the user is logged in
   * @param tier Subscription tier (if connected)
   * @returns SubscriptionLimits object with match storage and sync capabilities
   */
  getLimits(isConnected: boolean, tier?: SubscriptionTier): SubscriptionLimits {
    if (!isConnected) {
      return NOT_CONNECTED_LIMITS;
    }
    return SUBSCRIPTION_LIMITS[tier || 'free'];
  }

  /**
   * Check if user can create a new match
   * Enforces local storage limits based on subscription tier
   * @param currentMatchCount Current number of local matches
   * @param isConnected Whether the user is logged in
   * @param tier Subscription tier
   * @returns Object with allowed status, reason if denied, and max match limit
   */
  canCreateMatch(
    currentMatchCount: number,
    isConnected: boolean,
    tier?: SubscriptionTier
  ): { allowed: boolean; reason?: string; maxMatches: number } {
    const limits = this.getLimits(isConnected, tier);
    const allowed = currentMatchCount < limits.maxLocalMatches;

    return {
      allowed,
      maxMatches: limits.maxLocalMatches,
      reason: allowed
        ? undefined
        : `Limite de ${limits.maxLocalMatches} matchs atteinte. ${
            !isConnected
              ? "Connectez-vous pour en stocker plus."
              : tier === "free"
              ? "Passez à un abonnement premium pour un stockage illimité."
              : ""
          }`,
    };
  }

  /**
   * Check if a match can be synchronized to the server
   * Requires user authentication and appropriate subscription tier
   * @param match Match to check for sync eligibility
   * @param isConnected Whether the user is logged in
   * @param tier Current subscription tier
   * @returns Object with allowed status and reason if denied
   */
  canSyncMatch(
    match: Match,
    isConnected: boolean,
    tier?: SubscriptionTier
  ): { allowed: boolean; reason?: string } {
    if (!isConnected) {
      return {
        allowed: false,
        reason: "Vous devez être connecté pour synchroniser vos matchs.",
      };
    }

    const limits = this.getLimits(isConnected, tier);

    // Check if current tier allows server synchronization
    if (!limits.canSyncToServer) {
      return {
        allowed: false,
        reason: "Un abonnement premium est requis pour synchroniser vos matchs sur le cloud.",
      };
    }

    // Check if match has already been synced
    if (match.synced_to_server) {
      return {
        allowed: false,
        reason: "Ce match a déjà été synchronisé.",
      };
    }

    // No time limit: all freemium matches can be synced
    // (3 match limit prevents abuse naturally)
    return { allowed: true };
  }

  /**
   * Get storage capacity information
   * Provides details about current match storage usage and limits
   * @param currentMatchCount Current number of stored matches
   * @param isConnected Whether the user is logged in
   * @param tier Subscription tier
   * @returns Object with storage statistics and capabilities
   */
  getStorageInfo(
    currentMatchCount: number,
    isConnected: boolean,
    tier?: SubscriptionTier
  ): {
    current: number;
    max: number;
    percentage: number;
    isFull: boolean;
    canSync: boolean;
  } {
    const limits = this.getLimits(isConnected, tier);
    const max = limits.maxLocalMatches;
    const percentage = max === Infinity ? 0 : (currentMatchCount / max) * 100;

    return {
      current: currentMatchCount,
      max,
      percentage,
      isFull: currentMatchCount >= max,
      canSync: limits.canSyncToServer,
    };
  }
}
