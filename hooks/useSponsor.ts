import { useMemo } from 'react';
import { getSponsorUris, MatchSponsor } from '../src/services/SponsorService';

// Derives sponsor URIs for all 6 zones from a match_sponsors snapshot.
// backgroundColor controls logo_url_dark for on-court zones (1–4).
// isThemeDark controls logo_url_dark for side banner zones (5–6).
export function useSponsor(
  matchSponsors: MatchSponsor[] | null | undefined,
  backgroundColor?: string,
  isThemeDark?: boolean,
): {
  courtSponsorTopUri: string | null;
  courtSponsorBottomUri: string | null;
  courtSponsorThirdUri: string | null;
  courtSponsorFourthUri: string | null;
  sideSponsorLeftUri: string | null;
  sideSponsorRightUri: string | null;
} {
  return useMemo(() => {
    if (!matchSponsors || matchSponsors.length === 0) {
      return { courtSponsorTopUri: null, courtSponsorBottomUri: null, courtSponsorThirdUri: null, courtSponsorFourthUri: null, sideSponsorLeftUri: null, sideSponsorRightUri: null };
    }
    const { top, bottom, third, fourth, sideLeft, sideRight } = getSponsorUris(matchSponsors, backgroundColor, isThemeDark);
    return { courtSponsorTopUri: top, courtSponsorBottomUri: bottom, courtSponsorThirdUri: third, courtSponsorFourthUri: fourth, sideSponsorLeftUri: sideLeft, sideSponsorRightUri: sideRight };
  }, [matchSponsors, backgroundColor, isThemeDark]);
}
