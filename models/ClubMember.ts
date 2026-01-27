export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  email: string;
  displayName?: string;
  joinedAt: Date;
}

export interface CreateClubMemberData {
  clubId: string;
  userId: string;
  email: string;
  displayName?: string;
}
