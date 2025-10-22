export type TeamStatus = 'pending' | 'approved' | 'rejected';
export type TeamGender = 'male' | 'female' | 'mixed';
export type TeamCategory = 'senior' | 'u18' | 'u15' | 'u13' | 'u11' | 'u9' | 'u7';

export interface Team {
  id: string;
  name: string;
  clubId: string;
  ownerId: string;
  ownerEmail?: string; // Email from club_members (optional, populated via JOIN)
  category?: TeamCategory;
  gender?: TeamGender;
  status: TeamStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamData {
  name: string;
  clubId: string;
  category?: TeamCategory;
  gender?: TeamGender;
}

export interface UpdateTeamData {
  name?: string;
  category?: TeamCategory;
  gender?: TeamGender;
  status?: TeamStatus;
}
