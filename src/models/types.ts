export type MatchStatus = 'in_progress' | 'completed' | 'paused' | 'abandoned';
export type TeamMode = 'A' | 'B' | 'BOTH';
export type Team = 'A' | 'B';
export type MatchFormat = '2_halves' | '4_quarters';

export interface Match {
  id: number;
  team_a_name: string;  // Can be team UUID or name (SQLite uses team_a_name)
  team_b_name: string;  // Can be team UUID or name (SQLite uses team_b_name)
  status: MatchStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  team_mode: TeamMode;
  match_format: MatchFormat;
  period_duration: number;
  current_period: number;
  time_elapsed: number;
  last_updated: string;
  synced_to_server?: boolean;         // Si le match a été synchronisé avec le serveur
  created_with_tier?: string;         // Tier d'abonnement lors de la création du match
  club_id?: string | null;            // ID du club associé au match
  team_id?: string | null;            // ID de l'équipe du club qui joue
  final_score_a?: number;
  final_score_b?: number;
  score_manually_adjusted?: number;
}

export interface CreateMatchData {
  team_a_name: string;
  team_b_name: string;
  team_mode: TeamMode;
  match_format: MatchFormat;
  period_duration: number;
  club_id?: string | null;
  team_id?: string | null;
}

export interface Action {
  id: number;
  match_id: number;
  team: Team;
  player_number: number;
  action_type: string;
  specification: string;
  points?: number; // Number of points for shots (1, 2, or 3)
  semantic_x: number;
  semantic_y: number;
  timestamp: string;
  action_order: number;
  period_number: number;
  time_in_period: number; // temps en secondes depuis le début de la période
}

export interface CreateActionData {
  match_id: number;
  team: Team;
  player_number: number;
  action_type: string;
  specification: string;
  points?: number; // Number of points for shots (1, 2, or 3)
  semantic_x: number;
  semantic_y: number;
  action_order: number;
  period_number: number;
  time_in_period: number; // temps en secondes depuis le début de la période
}