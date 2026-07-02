import { useMemo } from 'react';
import { getSponsorUris, MatchSponsor } from '../src/services/SponsorService';

// Derives top/bottom sponsor URIs from a match_sponsors snapshot.
// Pass backgroundColor to automatically switch to logo_url_dark on dark courts.
export function useSponsor(
  matchSponsors: MatchSponsor[] | null | undefined,
  backgroundColor?: string,
): {
  courtSponsorTopUri: string | null;
  courtSponsorBottomUri: string | null;
  courtSponsorThirdUri: string | null;
  courtSponsorFourthUri: string | null;
} {
  return useMemo(() => {
    if (!matchSponsors || matchSponsors.length === 0) {
      return { courtSponsorTopUri: null, courtSponsorBottomUri: null, courtSponsorThirdUri: null, courtSponsorFourthUri: null };
    }
    const { top, bottom, third, fourth } = getSponsorUris(matchSponsors, backgroundColor);
    return { courtSponsorTopUri: top, courtSponsorBottomUri: bottom, courtSponsorThirdUri: third, courtSponsorFourthUri: fourth };
  }, [matchSponsors, backgroundColor]);
}
