import { MatchRepository, IMatchRepository } from '../database/MatchRepository';
import { ActionRepository } from '../database/ActionRepository';
import { Match, CreateMatchData, MatchStatus } from '../../models/types';

export class MatchManager {
  private matchRepository: IMatchRepository;
  private actionRepository: ActionRepository;

  constructor() {
    this.matchRepository = new MatchRepository();
    this.actionRepository = new ActionRepository();
  }

  /**
   * Create and start a new match
   */
  async startMatch(data: CreateMatchData): Promise<Match> {
    try {
      console.log('🏀 Creating new match:', data);
      
      // Create the match in database
      const match = await this.matchRepository.create(data);
      
      // Set started_at timestamp
      await this.matchRepository.startMatch(match.id);
      
      // Fetch updated match
      const updatedMatch = await this.matchRepository.findById(match.id);
      
      if (!updatedMatch) {
        throw new Error('Failed to retrieve created match');
      }

      console.log('✅ Match created successfully:', {
        id: updatedMatch.id,
        teamA: updatedMatch.team_a_name,
        teamB: updatedMatch.team_b_name,
        status: updatedMatch.status
      });

      return updatedMatch;
    } catch (error) {
      console.error('❌ Error starting match:', error);
      throw error;
    }
  }

  /**
   * Resume an existing match
   */
  async resumeMatch(matchId: number): Promise<Match> {
    try {
      const match = await this.matchRepository.findById(matchId);
      
      if (!match) {
        throw new Error(`Match with id ${matchId} not found`);
      }

      if (match.status !== 'in_progress') {
        throw new Error(`Cannot resume match with status: ${match.status}`);
      }

      console.log('🔄 Resuming match:', {
        id: match.id,
        teamA: match.team_a_name,
        teamB: match.team_b_name
      });

      return match;
    } catch (error) {
      console.error('❌ Error resuming match:', error);
      throw error;
    }
  }

  /**
   * End the current match
   */
  async endMatch(matchId: number): Promise<void> {
    try {
      await this.matchRepository.completeMatch(matchId);

      console.log('🏁 Match ended successfully:', matchId);

      // Compact actions into match_players.actions and delete from match_actions
      console.log('🗜️ Compacting match actions...');
      await this.actionRepository.compactMatchActions(matchId);
      console.log('✅ Match actions compacted successfully');
    } catch (error) {
      console.error('❌ Error ending match:', error);
      throw error;
    }
  }

  /**
   * Check if there's an active match
   */
  async getActiveMatch(): Promise<Match | null> {
    try {
      return await this.matchRepository.findActiveMatch();
    } catch (error) {
      console.error('❌ Error getting active match:', error);
      throw error;
    }
  }

  /**
   * Pause the current match
   */
  async pauseMatch(matchId: number): Promise<void> {
    try {
      await this.matchRepository.updateStatus(matchId, 'paused');
      
      console.log('⏸️ Match paused:', matchId);
    } catch (error) {
      console.error('❌ Error pausing match:', error);
      throw error;
    }
  }

  /**
   * Abandon the current match (mark as abandoned)
   */
  async abandonMatch(matchId: number): Promise<void> {
    try {
      await this.matchRepository.abandonMatch(matchId);
      
      console.log('🗑️ Match abandoned:', matchId);
    } catch (error) {
      console.error('❌ Error abandoning match:', error);
      throw error;
    }
  }

  /**
   * Complete the current match normally (mark as completed)
   */
  async completeMatch(matchId: number): Promise<void> {
    try {
      await this.matchRepository.completeMatch(matchId);
      
      console.log('✅ Match completed:', matchId);
    } catch (error) {
      console.error('❌ Error completing match:', error);
      throw error;
    }
  }

  /**
   * Update the current match state (period, time, pause status)
   */
  async updateMatchState(matchId: number, currentPeriod: number, timeElapsed: number): Promise<void> {
    try {
      await this.matchRepository.updateMatchState(matchId, currentPeriod, timeElapsed);
      
      // Log supprimé pour éviter le spam lors des ticks du chrono
    } catch (error) {
      console.error('❌ Error updating match state:', error);
      throw error;
    }
  }
}