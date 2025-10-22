export type PlayerPosition = 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
  position?: PlayerPosition;
  isStarter: boolean;
  displayOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlayerData {
  teamId: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
  position?: PlayerPosition;
  isStarter?: boolean;
}

export interface UpdatePlayerData {
  name?: string;
  jerseyNumber?: number;
  photoUrl?: string;
  position?: PlayerPosition;
  isStarter?: boolean;
  displayOrder?: number;
}
