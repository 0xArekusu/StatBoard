import { Match, Action } from '../../../models/types';

/**
 * Internal domain model for match data
 * This format is used internally and never changes
 */
export interface MatchData {
  match: Match;
  actions: Action[];
  players?: Array<{
    num: number;
    name: string;
    team: 'A' | 'B';
  }>;
}
