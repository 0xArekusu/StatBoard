/**
 * useAdEligibility
 *
 * Returns whether the current user should be shown ads.
 * Ads are shown for:
 *  - guest users (not logged in, no club)
 *  - users on the free subscription tier
 *
 * Ads are disabled for paid tiers (basic, premium, ultimate).
 */

import { useClub } from "../src/contexts/ClubContext";
import { SUBSCRIPTION_TIER } from "../models/Subscription";

export function useAdEligibility(): boolean {
  const { currentClub, loading } = useClub();

  // Avoid flash while club data is loading
  if (loading) return false;

  // No club = guest or free user without a club → show ads
  if (!currentClub) return true;

  // Free tier → show ads
  if (currentClub.subscriptionTier === SUBSCRIPTION_TIER.FREE) return true;

  // Paid subscription → no ads
  return false;
}
