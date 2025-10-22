import type { ClubMember, CreateClubMemberData } from "../models/ClubMember";

export interface IClubMemberRepository {
  create(data: CreateClubMemberData): Promise<ClubMember | null>;
  findByClubId(clubId: string): Promise<ClubMember[]>;
  findByUserId(userId: string): Promise<ClubMember[]>;
  findByClubAndUser(clubId: string, userId: string): Promise<ClubMember | null>;
  delete(id: string): Promise<boolean>;
}
