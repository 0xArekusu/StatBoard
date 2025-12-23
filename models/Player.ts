export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
  isStarter?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlayerData {
  teamId: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
}

export interface UpdatePlayerData {
  name?: string;
  jerseyNumber?: number;
  photoUrl?: string;
}
