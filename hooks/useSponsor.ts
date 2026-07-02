import { useMemo } from 'react';
import { getSponsorUris, MatchSponsor } from '../src/services/SponsorService';

// Derives top/bottom sponsor URIs from a match_sponsors snapshot.
// Pass the match_sponsors field (parsed JSON array) from the current match.
// Returns { top, bottom } ready for courtSponsorTopUri / courtSponsorBottomUri props.
export function useSponsor(matchSponsors: MatchSponsor[] | null | undefined): {
  courtSponsorTopUri: string | null;
  courtSponsorBottomUri: string | null;
} {
  return useMemo(() => {
    if (!matchSponsors || matchSponsors.length === 0) {
      return { courtSponsorTopUri: null, courtSponsorBottomUri: null };
    }
    const { top, bottom } = getSponsorUris(matchSponsors);
    return { courtSponsorTopUri: top, courtSponsorBottomUri: bottom };
  }, [matchSponsors]);
}
