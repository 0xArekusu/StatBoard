/**
 * Interface for match API service
 * Implementations can use different backends (Supabase, REST API, Firebase, etc.)
 */
export interface IMatchApiService {
  /**
   * Uploads a complete match to the server
   * @param payload API-specific payload (already adapted)
   * @throws Error if upload fails
   */
  uploadMatch(payload: any): Promise<void>;
}
