export enum MatchStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
}

export enum Team {
  MY_TEAM = "MyTeam",
  OPPONENT = "Opponent",
}

export interface Match {
  id: number;

  // Club & Team
  club_id?: string | null;
  team_id?: string | null; // Mon équipe (celle du club)

  // Match Info
  my_team_name?: string | null; // Nom de mon équipe
  opponent_name: string; // Nom de l'équipe adverse
  is_home: boolean; // À domicile ou à l'extérieur

  // Match Configuration
  total_periods: number; // Nombre de périodes réglementaires (2, 3, 4, 5, etc.)
  period_duration: number; // Durée d'une période en secondes
  overtime_duration: number; // Durée d'une prolongation en secondes
  overtime_periods: number; // Nombre de prolongations jouées

  // Scores
  my_team_score: number;
  opponent_score: number;
  score_manually_adjusted?: boolean;

  // Match State (pour SQLite local uniquement)
  status: MatchStatus | string; // string for backward compatibility
  current_period?: number; // Période en cours (local uniquement)
  time_elapsed?: number; // Temps écoulé (local uniquement)

  // Timestamps
  created_by?: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  played_at: string; // Date/heure prévue du match
  synced_at?: string | null;
  last_updated?: string;

  // Legacy
  synced_to_server?: boolean;
  created_with_tier?: string;
}

export interface CreateMatchData {
  // Club & Team
  club_id?: string | null;
  team_id?: string | null;

  // Match Info
  my_team_name?: string | null;
  opponent_name: string;
  is_home: boolean;

  // Match Configuration
  total_periods: number;
  period_duration: number;
  overtime_duration?: number;

  // Date
  played_at?: string;
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
