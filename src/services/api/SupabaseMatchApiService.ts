import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IMatchApiService } from './types/IMatchApiService';
import { IPayloadAdapter } from './types/IPayloadAdapter';
import { SupabaseMatchPayload } from './adapters/SupabasePayloadAdapter';

/**
 * Supabase implementation of IMatchApiService
 * Handles uploading match data to Supabase backend
 */
export class SupabaseMatchApiService implements IMatchApiService {
  private supabase: SupabaseClient;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    private payloadAdapter: IPayloadAdapter<SupabaseMatchPayload>
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadMatch(payload: SupabaseMatchPayload): Promise<void> {
    try {
      console.log('📤 Uploading match to Supabase...');

      // 1. Insert match
      const { data: matchData, error: matchError } = await this.supabase
        .from('matches')
        .insert(payload.match)
        .select()
        .single();

      if (matchError) {
        console.error('❌ Error inserting match:', matchError);
        throw new Error(`Failed to insert match: ${matchError.message}`);
      }

      console.log('✅ Match inserted with ID:', matchData.id);

      // 2. Insert actions with match_id
      if (payload.actions.length > 0) {
        const actionsWithMatchId = payload.actions.map(action => ({
          ...action,
          match_id: matchData.id,
        }));

        const { error: actionsError } = await this.supabase
          .from('match_actions')
          .insert(actionsWithMatchId);

        if (actionsError) {
          console.error('❌ Error inserting actions:', actionsError);
          throw new Error(`Failed to insert actions: ${actionsError.message}`);
        }

        console.log(`✅ ${payload.actions.length} actions inserted`);
      }

      // 3. Insert players if present
      if (payload.players && payload.players.length > 0) {
        const playersWithMatchId = payload.players.map(player => ({
          ...player,
          match_id: matchData.id,
        }));

        const { error: playersError } = await this.supabase
          .from('match_players')
          .insert(playersWithMatchId);

        if (playersError) {
          console.error('⚠️ Warning: Error inserting players:', playersError);
          // Don't throw - players are optional
        } else {
          console.log(`✅ ${payload.players.length} players inserted`);
        }
      }

      console.log('✅ Match upload completed successfully');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }
}
