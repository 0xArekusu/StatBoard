import { supabase } from '../config/supabase';
import { SUBSCRIPTION_TIER, SubscriptionTier } from '../../models/Subscription';
import {
  COACH_ASSISTANT_LOGO_NO_BG,
  COACH_ASSISTANT_LOGO_WHITE_NO_BG,
  COACH_ASSISTANT_LOGO_LINE_COLORED_BALL,
  COACH_ASSISTANT_LOGO_LINE_COLORED_BALL_WHITE,
  isColorDark,
} from '../utils/logoHelper';

export interface MatchSponsor {
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  logo_url: string;
  logo_url_dark?: string | null; // light-colored variant for dark court backgrounds
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
    .select('priority, logo_url, logo_url_dark, name')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .in('priority', [1, 2, 3, 4, 5, 6])
    .order('priority', { ascending: true });

  if (error || !data || data.length === 0) return [];

  return data.map((row) => ({
    priority: row.priority as 1 | 2 | 3 | 4 | 5 | 6,
    logo_url: row.logo_url,
    logo_url_dark: row.logo_url_dark ?? null,
    name: row.name,
    source: 'club' as const,
  }));
}

async function fetchActivePlatformSponsors(): Promise<MatchSponsor[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('platform_sponsors')
    .select('priority, logo_url, logo_url_dark, name')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .in('priority', [1, 2, 3, 4, 5, 6])
    .order('priority', { ascending: true });

  if (error || !data || data.length === 0) return [];

  return data.map((row) => ({
    priority: row.priority as 1 | 2 | 3 | 4 | 5 | 6,
    logo_url: row.logo_url,
    logo_url_dark: row.logo_url_dark ?? null,
    name: row.name,
    source: 'platform' as const,
  }));
}

function buildFallbackSponsors(): MatchSponsor[] {
  const onCourt = (priority: 1 | 2 | 3 | 4): MatchSponsor => ({
    priority,
    logo_url: COACH_ASSISTANT_LOGO_NO_BG,
    logo_url_dark: COACH_ASSISTANT_LOGO_WHITE_NO_BG,
    name: 'Coach Assistant',
    source: 'fallback',
  });
  const sideBanner = (priority: 5 | 6): MatchSponsor => ({
    priority,
    logo_url: COACH_ASSISTANT_LOGO_LINE_COLORED_BALL,
    logo_url_dark: COACH_ASSISTANT_LOGO_LINE_COLORED_BALL_WHITE,
    name: 'Coach Assistant',
    source: 'fallback',
  });
  return [onCourt(1), onCourt(2), onCourt(3), onCourt(4), sideBanner(5), sideBanner(6)];
}

// Extract logo URIs for all 6 zones from a saved match_sponsors snapshot.
// Pass backgroundColor to automatically pick logo_url_dark on dark courts.
// Zones 1–4: on-court. Zones 5–6: side banners (left/right of the court).
export function getSponsorUris(
  matchSponsors: MatchSponsor[],
  backgroundColor?: string,
): { top: string | null; bottom: string | null; third: string | null; fourth: string | null; sideLeft: string | null; sideRight: string | null } {
  const dark = backgroundColor ? isColorDark(backgroundColor) : false;
  const pick = (s: MatchSponsor) =>
    dark && s.logo_url_dark ? s.logo_url_dark : s.logo_url;

  const find = (p: 1 | 2 | 3 | 4 | 5 | 6) => {
    const s = matchSponsors.find((s) => s.priority === p);
    return s ? pick(s) : null;
  };

  return { top: find(1), bottom: find(2), third: find(3), fourth: find(4), sideLeft: find(5), sideRight: find(6) };
}
