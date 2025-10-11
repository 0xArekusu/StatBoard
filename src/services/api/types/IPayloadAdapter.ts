import { MatchData } from './MatchData';

/**
 * Adapter interface for transforming internal MatchData
 * to API-specific payload format
 */
export interface IPayloadAdapter<T> {
  /**
   * Transforms internal MatchData to API-specific format
   * @param data Internal match data
   * @returns API-specific payload
   */
  adapt(data: MatchData): T;
}
