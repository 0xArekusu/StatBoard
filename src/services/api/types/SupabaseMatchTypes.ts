/**
 * Types for Supabase match sync
 * These types represent the server-side schema for matches and match_players
 */

import { Team, MatchFormat } from '../../../models/types';

/**
 * Match table on Supabase (completed matches only)
 */
export interface SupabaseMatch {
  id: string;  // UUID
  club_id: string | null;
  team_id: string | null;
  team_mode: 'A' | 'B' | 'BOTH';  // Which team(s) are managed

  // Match information
  // team_a and team_b can contain either team UUID or team name
  team_a: string;
  team_b: string;
  match_format: MatchFormat;
  period_duration: number;

  // Final scores
  final_score_a: number;
  final_score_b: number;
  score_manually_adjusted: boolean;

  // Metadata
  created_by: string | null;  // UUID of auth user
  created_at: string;
  played_at: string;
  synced_at: string;
}

/**
 * Data to insert a new match to Supabase
 */
export interface SupabaseMatchInsert {
  club_id?: string | null;
  team_id?: string | null;
  team_mode: 'A' | 'B' | 'BOTH';
  team_a: string;  // Can be team UUID or name
  team_b: string;  // Can be team UUID or name
  match_format: MatchFormat;
  period_duration: number;
  final_score_a: number;
  final_score_b: number;
  score_manually_adjusted?: boolean;
  created_by?: string | null;
  played_at: string;
}

/**
 * Player action stored in JSONB
 */
export interface PlayerAction {
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
