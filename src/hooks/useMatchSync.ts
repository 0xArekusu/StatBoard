import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { MatchSyncService } from '../services/api/MatchSyncService';

/**
 * Hook to sync matches to Supabase
 * Handles authentication and subscription checks automatically
 */
export function useMatchSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedMatchId, setLastSyncedMatchId] = useState<string | null>(null);

  const syncService = new MatchSyncService(supabase);

  /**
   * Check if a match can be synced
   */
  const checkEligibility = useCallback(async (matchId: number) => {
    try {
      setError(null);
      const result = await syncService.checkSyncEligibility(matchId);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { canSync: false, reason: errorMsg };
    }
  }, []);

  /**
   * Sync a single match to Supabase
   */
  const syncMatch = useCallback(async (matchId: number) => {
    try {
      setIsSyncing(true);
      setError(null);

      const result = await syncService.syncMatch(matchId);

      if (result.success) {
        setLastSyncedMatchId(result.matchId || null);
        return { success: true, matchId: result.matchId };
      } else {
        setError(result.error || 'Erreur lors de la synchronisation');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Sync all pending matches
   */
  const syncAllPending = useCallback(async () => {
    try {
      setIsSyncing(true);
      setError(null);

      const result = await syncService.syncAllPendingMatches();

      if (result.failed > 0) {
        setError(`${result.failed} matchs n'ont pas pu être synchronisés`);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { synced: 0, failed: 0, errors: [errorMsg] };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    error,
    lastSyncedMatchId,
    checkEligibility,
    syncMatch,
    syncAllPending,
  };
}
