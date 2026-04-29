/**
 * Types for Supabase match sync
 * These types represent the server-side schema for matches with embedded players
 */

import { Team } from '../../../models/types';

/**
 * Player info stored in matches.players JSONB array
 */
export interface SupabaseMatchPlayerInfo {
  player_id: string | null;
  player_number: number;
  player_name: string;
  team: Team;
  is_starter: boolean;
  photo_url: string | null;
  on_court: number;
  playing_time_seconds: number;
}

/**
 * Player stats stored in matches.player_stats JSONB object
 */
export interface SupabaseMatchPlayerStats {
  actions: PlayerAction[];
}

/**
 * Match table on Supabase (with embedded players and stats)
 */
export interface SupabaseMatch {
  id: string;  // UUID
  club_id: string | null;
  team_id: string | null;

  // Match information
  my_team_name: string | null;
  opponent_name: string;
  is_home: boolean;
  total_periods: number;
  period_duration: number;
  overtime_duration: number | null;
  overtime_periods: number;

  // Final scores
  my_team_score: number;
  opponent_score: number;
  my_team_handicap: number;
  opponent_handicap: number;
  status: 'in_progress' | 'completed' | 'cancelled';

  // Embedded player data
  players: SupabaseMatchPlayerInfo[];  // JSONB array
  player_stats: Record<string, SupabaseMatchPlayerStats>;  // JSONB object

  // Metadata
  created_by: string | null;  // UUID of auth user
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  synced_at: string | null;
}

/**
 * Data to insert a new match to Supabase
 */
export interface SupabaseMatchInsert {
  club_id?: string | null;
  team_id?: string | null;
  my_team_name?: string | null;
  opponent_name: string;
  is_home: boolean;
  total_periods: number;
  period_duration: number;
  overtime_duration?: number | null;
  overtime_periods: number;
  my_team_score: number;
  opponent_score: number;
  my_team_handicap?: number;
  opponent_handicap?: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  created_by?: string | null;

  // Timestamps
  created_at?: string; // When user configured match and clicked "Start Match"
  started_at?: string | null;
  ended_at?: string | null;
  synced_at?: string | null;

  // Embedded player data
  players?: SupabaseMatchPlayerInfo[];  // JSONB array
  player_stats?: Record<string, SupabaseMatchPlayerStats>;  // JSONB object
}

/**
 * Player action stored in JSONB
 */
export interface PlayerAction {
  team: Team;
  action_type: string;
  specification: string;
  points?: number;
  semantic_x: number;
  semantic_y: number;
  action_order: number;
  period_number: number;
  time_in_period: number;
  timestamp: string;
}

/**
 * Match player table on Supabase
 */
export interface SupabaseMatchPlayer {
  id: string;  // UUID
  match_id: string;  // UUID

  // Link to players table (NULL for temporary players)
  player_id: string | null;  // UUID

  // Player information (snapshot at match time)
  player_number: number;
  player_name: string;
  team: Team;
  is_starter: boolean;
  photo_url: string | null;

  // All actions as JSONB array
  actions: PlayerAction[];

  // Pre-calculated stats (basic stats only)
  total_points: number;
  total_shots: number;
  total_rebounds: number;
  total_assists: number;
  total_steals: number;
  total_blocks: number;
  total_turnovers: number;
  total_fouls: number;

  created_at: string;
}

/**
 * Data to insert a new match player to Supabase
 */
export interface SupabaseMatchPlayerInsert {
  match_id: string;  // UUID
  player_id?: string | null;
  player_number: number;
  player_name: string;
  team: Team;
  is_starter: boolean;
  photo_url?: string | null;
  actions: PlayerAction[];
  // Statistics calculated from actions (basic stats only)
  total_points?: number;
  total_shots?: number;
  total_rebounds?: number;
  total_assists?: number;
  total_steals?: number;
  total_blocks?: number;
  total_turnovers?: number;
  total_fouls?: number;
}

/**
 * Complete match data for sync (match + players)
 * Players don't have match_id yet (will be set after match creation)
 */
export interface SupabaseMatchSyncData {
  match: SupabaseMatchInsert;
  players: Omit<SupabaseMatchPlayerInsert, 'match_id'>[];
}
