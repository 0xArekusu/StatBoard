export type TeamStatus = 'pending' | 'approved' | 'rejected';
export type TeamGender = 'male' | 'female' | 'mixed';

export interface Team {
  id: string;
  name: string;
  clubId: string;
  ownerId: string;
  ownerEmail?: string; // Email from club_members (optional, populated via JOIN)
  gender?: TeamGender;
  coachName?: string; // Name of the team coach
  coachPhotoUrl?: string; // Photo URL of the team coach
  playerCount?: number; // Number of players in the team (updated when players are added/removed)
  status: TeamStatus;
  isActive: boolean; // Club owner can activate/deactivate teams
  isDeleted: boolean; // Soft delete - archived but not physically removed
  deletedAt?: Date; // When team was deleted/archived
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamData {
  name: string;
  clubId: string;
  gender?: TeamGender;
  coachName?: string;
  coachPhotoUrl?: string;
}

export interface UpdateTeamData {
  name?: string;
  gender?: TeamGender;
  coachName?: string;
  coachPhotoUrl?: string;
  status?: TeamStatus;
  isActive?: boolean;
}
