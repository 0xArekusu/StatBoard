/**
 * ClubContext
 *
 * Provides current club state and methods throughout the app.
 * Manages club selection persistence using AsyncStorage.
 * Ensures all screens use the same current club.
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { ServiceFactory } from '../../services/ServiceFactory';
import { Club } from '../../models/Club';
import { logInfo, logError } from '../../utils/logger';
import { useAuth } from './AuthContext';

const CURRENT_CLUB_ID_KEY = '@current_club_id';

interface ClubContextType {
  currentClub: Club | null;
  allClubs: Club[];
  loading: boolean;
  setCurrentClub: (club: Club) => Promise<void>;
  refreshClubs: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

/**
 * ClubProvider component
 * Wraps the app to provide club context to all child components
 */
export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentClub, setCurrentClubState] = useState<Club | null>(null);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Loads all user clubs and restores the previously selected club
   */
  const loadClubs = useCallback(async () => {
    if (!user) {
      logInfo('ClubContext', '🚫 No user, clearing clubs');
      setCurrentClubState(null);
      setAllClubs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      logInfo('ClubContext', '📊 Loading user clubs', { userId: user.id });

      const clubService = ServiceFactory.getClubService(supabase);
      const clubs = await clubService.getUserMemberClubs(user.id);

      logInfo('ClubContext', '✅ Clubs loaded', {
        clubCount: clubs.length,
        clubIds: clubs.map((c) => c.id),
      });

      setAllClubs(clubs);

      // Try to restore previously selected club
      const savedClubId = await AsyncStorage.getItem(CURRENT_CLUB_ID_KEY);

      if (savedClubId) {
        const savedClub = clubs.find((c) => c.id === savedClubId);
        if (savedClub) {
          logInfo('ClubContext', '✅ Restored previous club', {
            clubId: savedClub.id,
            clubName: savedClub.name,
          });
          setCurrentClubState(savedClub);
          setLoading(false);
          return;
        } else {
          logInfo('ClubContext', '⚠️ Saved club not found in user clubs, clearing');
          await AsyncStorage.removeItem(CURRENT_CLUB_ID_KEY);
        }
      }

      // No saved club or saved club not found, select first club
      if (clubs.length > 0) {
        const firstClub = clubs[0];
        logInfo('ClubContext', '📌 Selecting first club', {
          clubId: firstClub.id,
          clubName: firstClub.name,
        });
        setCurrentClubState(firstClub);
        await AsyncStorage.setItem(CURRENT_CLUB_ID_KEY, firstClub.id);
      } else {
        logInfo('ClubContext', 'ℹ️ No clubs found for user');
        setCurrentClubState(null);
      }
    } catch (error) {
      logError('ClubContext', '❌ Error loading clubs', { error });
      setAllClubs([]);
      setCurrentClubState(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load clubs when user changes
  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  /**
   * Sets the current club and persists the selection
   */
  const setCurrentClub = async (club: Club) => {
    logInfo('ClubContext', '🔄 Setting current club', {
      clubId: club.id,
      clubName: club.name,
    });

    try {
      await AsyncStorage.setItem(CURRENT_CLUB_ID_KEY, club.id);
      setCurrentClubState(club);

      logInfo('ClubContext', '✅ Current club set and persisted', {
        clubId: club.id,
      });
    } catch (error) {
      logError('ClubContext', '❌ Failed to persist current club', { error });
      // Still set the club in state even if persistence fails
      setCurrentClubState(club);
    }
  };

  /**
   * Refreshes the clubs list (useful after creating/joining a new club)
   */
  const refreshClubs = async () => {
    logInfo('ClubContext', '🔄 Refreshing clubs');
    await loadClubs();
  };

  const value = {
    currentClub,
    allClubs,
    loading,
    setCurrentClub,
    refreshClubs,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

/**
 * Custom hook to access club context
 * Must be used within a ClubProvider component
 * @throws Error if used outside of ClubProvider
 */
export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}
