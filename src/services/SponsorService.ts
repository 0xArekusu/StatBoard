import { supabase } from '../config/supabase';
import { SUBSCRIPTION_TIER, SubscriptionTier } from '../../models/Subscription';
import { COACH_ASSISTANT_LOGO_MARGIN } from '../../src/utils/logoHelper';

export interface MatchSponsor {
  priority: 1 | 2;
  logo_url: string;
  name: string;
  source: 'club' | 'platform' | 'fallback';
}

// Resolves up to 2 sponsors for a match at creation time.
// Priority logic:
//   1. Club on 'sponsor' tier with active club_sponsors → use those
//   2. Active platform_sponsors → use those
//   3. Fallback → Coach Assistant logo
export async function resolveMatchSponsors(
  clubId: string | null,
  subscriptionTier: SubscriptionTier | null,
): Promise<MatchSponsor[]> {
  if (clubId && subscriptionTier === SUBSCRIPTION_TIER.SPONSOR) {
    const clubSponsors = await fetchClubSponsors(clubId);
    if (clubSponsors.length > 0) return clubSponsors;
  }

  const platformSponsors = await fetchActivePlatformSponsors();
  if (platformSponsors.length > 0) return platformSponsors;

  return buildFallbackSponsors();
}

async function fetchClubSponsors(clubId: string): Promise<MatchSponsor[]> {
  const { data, error } = await supabase
    .from('club_sponsors')
    .select('priority, logo_url, name')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .in('priority', [1, 2])
    .order('priority', { ascending: true });

  if (error || !data || data.length === 0) return [];

  return data.map((row) => ({
    priority: row.priority as 1 | 2,
    logo_url: row.logo_url,
    name: row.name,
    source: 'club' as const,
  }));
}

async function fetchActivePlatformSponsors(): Promise<MatchSponsor[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('platform_sponsors')
    .select('priority, logo_url, name')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .in('priority', [1, 2])
    .order('priority', { ascending: true });

  if (error || !data || data.length === 0) return [];

  return data.map((row) => ({
    priority: row.priority as 1 | 2,
    logo_url: row.logo_url,
    name: row.name,
    source: 'platform' as const,
  }));
}

function buildFallbackSponsors(): MatchSponsor[] {
  return [
    { priority: 1, logo_url: COACH_ASSISTANT_LOGO_MARGIN, name: 'Coach Assistant', source: 'fallback' },
    { priority: 2, logo_url: COACH_ASSISTANT_LOGO_MARGIN, name: 'Coach Assistant', source: 'fallback' },
  ];
}

// Extract top/bottom logo URIs from a saved match_sponsors snapshot
export function getSponsorUris(matchSponsors: MatchSponsor[]): {
  top: string | null;
  bottom: string | null;
} {
  const top = matchSponsors.find((s) => s.priority === 1)?.logo_url ?? null;
  const bottom = matchSponsors.find((s) => s.priority === 2)?.logo_url ?? null;
  return { top, bottom };
}
