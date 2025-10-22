import type { Team, CreateTeamData, UpdateTeamData, TeamStatus } from "../models/Team";

export interface ITeamRepository {
  create(data: CreateTeamData, ownerId: string): Promise<Team | null>;
  findById(id: string): Promise<Team | null>;
  findByClubId(clubId: string): Promise<Team[]>;
  findByClubIdAndStatus(clubId: string, status: TeamStatus): Promise<Team[]>;
  findByOwnerId(ownerId: string): Promise<Team[]>;
  update(id: string, data: UpdateTeamData): Promise<Team | null>;
  delete(id: string): Promise<boolean>;
  countByOwnerAndClub(ownerId: string, clubId: string): Promise<number>;
}
