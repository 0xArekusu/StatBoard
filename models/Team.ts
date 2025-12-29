export enum TeamStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Team gender categories
 */
export enum TeamGender {
  MALE = 'male',
  FEMALE = 'female',
  MIXED = 'mixed',
}

/**
 * Display labels for team genders
 */
export const TEAM_GENDER_LABELS: Record<TeamGender, string> = {
  [TeamGender.MALE]: 'Masculin',
  [TeamGender.FEMALE]: 'Féminin',
  [TeamGender.MIXED]: 'Mixte',
};

export interface Team {
  id: string;
  name: string;
  clubId: string;
  ownerId: string;
  ownerEmail?: string; // Email from club_members (optional, populated via JOIN)
  category?: string; // Team category (U12, U15, Senior, etc.)
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
  category?: string;
  gender?: TeamGender;
  coachName?: string;
  coachPhotoUrl?: string;
}

export interface UpdateTeamData {
  name?: string;
  category?: string;
  gender?: TeamGender;
  coachName?: string;
  coachPhotoUrl?: string;
  status?: TeamStatus;
  isActive?: boolean;
}
