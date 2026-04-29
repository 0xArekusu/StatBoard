/**
 * Navigation Types
 *
 * Centralized type definitions for React Navigation.
 * This ensures type safety across all navigation calls in the app.
 */

import { NavigationProp } from '@react-navigation/native';
import { TeamGender } from '../models/Team';
import { Match } from '../src/models/types';

type SerializedPlayer = {
  id: string;
  name: string;
  jerseyNumber: number;
  teamId: string;
  photoUrl?: string;
  licenseNumber?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Root Stack Parameter List
 * Defines all routes and their required parameters
 */
export type RootStackParamList = {
  // Authentication screens
  Auth: undefined;
  Login: undefined;
  SignUp: undefined;

  // Main navigation
  MainTabs: undefined;

  // Club & Team screens
  Club: undefined;
  TeamInfo: {
    clubId: string;
    teamId?: string;
    teamData?: {
      name: string;
      category: string;
      gender: TeamGender;
    };
  };
  TeamRoster: {
    clubId: string;
    teamId?: string;
    teamData: {
      name: string;
      category: string;
      gender: TeamGender;
    };
  };
  TeamStarters: {
    clubId: string;
    teamId?: string;
    teamData: {
      name: string;
      category: string;
      gender: TeamGender;
    };
    coachData: {
      name: string;
      photoUrl: string;
    };
    roster: Array<{
      id: string;
      name: string;
      jerseyNumber: number;
      photoUrl?: string;
      isStarter?: boolean;
    }>;
  };

  // Match screens
  NewMatch: { teamId?: string } | undefined;
  LiveMatch: {
    matchId?: string;
    matchData?: {
      id: string;
      clubId: string;
      teamId: string;
      teamName: string;
      opponent: string;
      isHome: boolean;
      trackOpponentStats: boolean;
      periodCount: number;
      periodDuration: number;
      myTeamPlayers: SerializedPlayer[];
      opponentPlayers: SerializedPlayer[];
      starters: string[];
      opponentStarters: string[];
      clubLogoUrl?: string | null;
      courtBackgroundColor?: string;
      courtLineColor?: string;
      createdAt: string;
      myTeamHandicap?: number;
      opponentHandicap?: number;
    };
  };
  MatchDetails: {
    match: Match;
    actions?: any[];
    players?: any[];
    fromLiveMatch?: boolean;
    isLocalMatch?: boolean;
  };

  // Debug
  DebugCourt: undefined;
};

/**
 * Navigation prop type helper
 * Use this to type the navigation prop in your screens
 */
export type RootNavigationProp = NavigationProp<RootStackParamList>;
