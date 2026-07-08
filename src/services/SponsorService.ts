import { supabase } from '../config/supabase';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '../../models/Subscription';
import { isColorDark } from '../utils/logoHelper';

export interface MatchSponsor {
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  logo_url: string;
  logo_url_dark?: string | null; // light-colored variant for dark court backgrounds
  name: string;
  source: 'club' | 'platform' | 'fallback';
  is_paid?: boolean; // false = default/fallback branding (e.g. Coach Assistant), excluded from PDF "official partners" sections
}


// Resolves sponsors for a match at creation time, merged per priority slot (1–6).
// Priority logic per slot:
//   1. Club whose tier has canConfigureSponsors, with an active club_sponsors row at that priority → use it
//   2. Otherwise, active platform_sponsors row at that priority → use it
//   3. Otherwise, the slot stays empty
export async function resolveMatchSponsors(
  clubId: string | null,
  subscriptionTier: SubscriptionTier | null,
): Promise<MatchSponsor[]> {
  const canConfigure =
    !!clubId && !!subscriptionTier && !!SUBSCRIPTION_LIMITS[subscriptionTier]?.canConfigureSponsors;

  const [clubSponsors, platformSponsors] = await Promise.all([
    canConfigure ? fetchClubSponsors(clubId!) : Promise.resolve([]),
    fetchActivePlatformSponsors(),
  ]);

  if (clubSponsors.length === 0) return platformSponsors;

  const byPriority = new Map<number, MatchSponsor>();
  for (const sponsor of platformSponsors) byPriority.set(sponsor.priority, sponsor);
  for (const sponsor of clubSponsors) byPriority.set(sponsor.priority, sponsor); // club wins ties

  return Array.from(byPriority.values()).sort((a, b) => a.priority - b.priority);
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
    is_paid: true, // A club's own sponsor is always a real (paid) partner
  }));
}

async function fetchActivePlatformSponsors(): Promise<MatchSponsor[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('platform_sponsors')
    .select('priority, logo_url, logo_url_dark, name, is_paid')
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
    is_paid: row.is_paid ?? true,
  }));
}

// Parses a match_sponsors snapshot coming from SQLite or Supabase.
// Handles legacy rows that were double JSON-encoded on sync (stored as a
// JSONB string scalar instead of a JSONB array), which requires parsing twice.
export function parseMatchSponsors(raw: unknown): MatchSponsor[] {
  let value: unknown = raw;
  for (let i = 0; i < 2 && typeof value === 'string'; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as MatchSponsor[]) : [];
}

// Extract logo URIs for all 6 zones from a saved match_sponsors snapshot.
// Zones 1–4 (on-court): pick logo_url_dark based on court background color.
// Zones 5–6 (side banners, outside the court): pick logo_url_dark based on app theme.
export function getSponsorUris(
  matchSponsors: MatchSponsor[],
  backgroundColor?: string,
  isThemeDark?: boolean,
): { top: string | null; bottom: string | null; third: string | null; fourth: string | null; sideLeft: string | null; sideRight: string | null } {
  const courtDark = backgroundColor ? isColorDark(backgroundColor) : false;
  const pick = (s: MatchSponsor, dark: boolean) =>
    dark && s.logo_url_dark ? s.logo_url_dark : s.logo_url;

  const find = (p: 1 | 2 | 3 | 4 | 5 | 6) => {
    const s = matchSponsors.find((s) => s.priority === p);
    const dark = p <= 4 ? courtDark : (isThemeDark ?? false);
    return s ? pick(s, dark) : null;
  };

  return { top: find(1), bottom: find(2), third: find(3), fourth: find(4), sideLeft: find(5), sideRight: find(6) };
}
