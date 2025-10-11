import { IMatchApiService } from '../api/types/IMatchApiService';
import { IPayloadAdapter } from '../api/types/IPayloadAdapter';
import { SupabaseMatchApiService } from '../api/SupabaseMatchApiService';
import { SupabasePayloadAdapter } from '../api/adapters/SupabasePayloadAdapter';
import { MatchUploadService } from '../upload/MatchUploadService';
import { MatchRepository } from '../database/MatchRepository';
import { ActionRepository } from '../database/ActionRepository';
import { MatchPlayerRepository } from '../database/MatchPlayerRepository';

/**
 * API Service configuration
 */
export interface ApiServiceConfig {
  apiService: IMatchApiService;
  payloadAdapter: IPayloadAdapter<any>;
}

/**
 * Factory for creating API services
 * Allows easy switching between different backend implementations
 */
export class ApiServiceFactory {
  /**
   * Create the configured API service and payload adapter
   * @returns API service configuration
   */
  static createMatchApiService(): ApiServiceConfig {
    // TODO: Read from environment variables or config
    const apiType = process.env.API_TYPE || 'supabase';

    switch (apiType) {
      case 'supabase':
        return this.createSupabaseService();

      // Add more implementations here
      // case 'rest':
      //   return this.createRestApiService();
      // case 'firebase':
      //   return this.createFirebaseService();

      default:
        throw new Error(`Unknown API type: ${apiType}`);
    }
  }

  /**
   * Create a complete MatchUploadService with all dependencies
   * @returns Fully configured upload service
   */
  static createMatchUploadService(): MatchUploadService {
    const config = this.createMatchApiService();

    return new MatchUploadService(
      new MatchRepository(),
      new ActionRepository(),
      new MatchPlayerRepository(),
      config.apiService,
      config.payloadAdapter
    );
  }

  /**
   * Create Supabase service configuration
   */
  private static createSupabaseService(): ApiServiceConfig {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
    }

    const adapter = new SupabasePayloadAdapter();
    const apiService = new SupabaseMatchApiService(
      supabaseUrl,
      supabaseKey,
      adapter
    );

    return {
      apiService,
      payloadAdapter: adapter,
    };
  }

  // Example for future REST API implementation
  // private static createRestApiService(): ApiServiceConfig {
  //   const apiUrl = process.env.API_URL || '';
  //   const apiKey = process.env.API_KEY || '';
  //
  //   if (!apiUrl || !apiKey) {
  //     throw new Error('REST API configuration missing');
  //   }
  //
  //   const adapter = new RestPayloadAdapter();
  //   const apiService = new RestApiMatchApiService(apiUrl, apiKey, adapter);
  //
  //   return {
  //     apiService,
  //     payloadAdapter: adapter,
  //   };
  // }
}
