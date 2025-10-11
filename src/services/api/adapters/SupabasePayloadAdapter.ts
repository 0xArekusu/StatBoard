import { IPayloadAdapter } from '../types/IPayloadAdapter';
import { MatchData } from '../types/MatchData';

/**
 * Supabase-specific payload format
 */
export interface SupabaseMatchPayload {
  match: {
    team_a_name: string;
    team_b_name: string;
    team_mode: 'A' | 'B' | 'both';
    match_format: '2_halves' | '4_quarters';
    period_duration: number;
    started_at: string | null;
    ended_at: string | null;
    final_score_a: number;
    final_score_b: number;
    status: string;
  };
  actions: Array<{
    team: 'A' | 'B';
    player_number: number;
    action_type: string;
    specification: string;
    points: number | null;
    semantic_x: number;
    semantic_y: number;
    period_number: number;
    time_in_period: number;
    timestamp: string;
    action_order: number;
  }>;
  players?: Array<{
    num: number;
    name: string;
    team: 'A' | 'B';
  }>;
}

/**
 * Adapter for Supabase API payload format
 */
export class SupabasePayloadAdapter implements IPayloadAdapter<SupabaseMatchPayload> {

  adapt(data: MatchData): SupabaseMatchPayload {
    // Calculate final scores from actions
    const scoreA = this.calculateScore(data.actions, 'A');
    const scoreB = this.calculateScore(data.actions, 'B');

    return {
      match: {
        team_a_name: data.match.team_a_name,
        team_b_name: data.match.team_b_name,
        team_mode: data.match.team_mode,
        match_format: data.match.match_format,
        period_duration: data.match.period_duration,
        started_at: data.match.started_at || null,
        ended_at: data.match.ended_at || null,
        final_score_a: scoreA,
        final_score_b: scoreB,
        status: data.match.status,
      },
      actions: data.actions.map(action => ({
        team: action.team,
        player_number: action.player_number,
        action_type: action.action_type,
        specification: action.specification,
        points: action.points || null,
        semantic_x: action.semantic_x,
        semantic_y: action.semantic_y,
        period_number: action.period_number,
        time_in_period: action.time_in_period,
        timestamp: action.timestamp,
        action_order: action.action_order,
      })),
      players: data.players,
    };
  }

  /**
   * Calculate final score for a team from actions
   */
  private calculateScore(actions: any[], team: 'A' | 'B'): number {
    return actions
      .filter(
        (a) =>
          a.team === team &&
          a.action_type === 'tir' &&
          a.specification === 'reussi'
      )
      .reduce((sum, a) => {
        const points = a.points || 2; // Default to 2 for backward compatibility
        return sum + points;
      }, 0);
  }
}
