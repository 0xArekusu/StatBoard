export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  email: string;
  joinedAt: Date;
}

export interface CreateClubMemberData {
  clubId: string;
  userId: string;
  email: string;
}
