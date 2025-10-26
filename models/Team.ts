export type TeamStatus = 'pending' | 'approved' | 'rejected';
export type TeamGender = 'male' | 'female' | 'mixed';

export interface Team {
  id: string;
  name: string;
  clubId: string;
  ownerId: string;
  ownerEmail?: string; // Email from club_members (optional, populated via JOIN)
  gender?: TeamGender;
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
}

export interface UpdateTeamData {
  name?: string;
  gender?: TeamGender;
  status?: TeamStatus;
  isActive?: boolean;
}
