export type MatchStatus = 'in_progress' | 'completed' | 'paused' | 'abandoned';
export type TeamMode = 'A' | 'B' | 'both';
export type Team = 'A' | 'B';

export interface Match {
  id: number;
  team_a_name: string;
  team_b_name: string;
  status: MatchStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  team_mode: TeamMode;
}

export interface CreateMatchData {
  team_a_name: string;
  team_b_name: string;
  team_mode: TeamMode;
}

export interface Action {
  id: number;
  match_id: number;
  team: Team;
  player_number: number;
  action_type: string;
  specification: string;
  semantic_x: number;
  semantic_y: number;
  timestamp: string;
  action_order: number;
}

export interface CreateActionData {
  match_id: number;
  team: Team;
  player_number: number;
  action_type: string;
  specification: string;
  semantic_x: number;
  semantic_y: number;
  action_order: number;
}